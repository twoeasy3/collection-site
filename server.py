from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import shutil
import re
import csv
import json
import base64
import subprocess
import cv2
import numpy as np
import math
import requests

app = Flask(__name__)
CORS(app)

CSV_FILE_PATH = './data/collection.csv'
BACKUP_FILE_PATH = './data/collection.csv.bak'

# rclone remote + bucket, e.g. 'cloudflare:my-images-bucket'
R2_DEST = 'r2:collection-images'

# Public domain fronting the R2 bucket (see src/constants.js REMOTE_BASE) and its
# Cloudflare zone ID (not a secret -- just an identifier, safe to hardcode).
PUBLIC_IMAGE_BASE = 'https://pingmathehippo.com'
CF_ZONE_ID = 'cb76dc8b155c3063e3039c162d6326dc'
CF_CACHE_PURGE_TOKEN = os.environ.get('CF_CACHE_PURGE_TOKEN')


def purge_cf_cache(url):
    """rclone writes straight to R2's S3 API, which never touches Cloudflare's edge
    cache in front of PUBLIC_IMAGE_BASE -- so without this, anyone who hit this exact
    URL before the upload (e.g. a 404 for a car that never had an image yet) keeps
    seeing that stale response for the full Cache-Control max-age (4 hours), on every
    device except the one that just uploaded. Best-effort: a failed purge shouldn't
    fail the upload itself, since the file is already safely in R2 either way."""
    if not CF_CACHE_PURGE_TOKEN:
        print('CF_CACHE_PURGE_TOKEN not set -- skipping cache purge (image is uploaded, but may be stale at the edge until it expires on its own).')
        return
    try:
        resp = requests.post(
            f'https://api.cloudflare.com/client/v4/zones/{CF_ZONE_ID}/purge_cache',
            headers={'Authorization': f'Bearer {CF_CACHE_PURGE_TOKEN}', 'Content-Type': 'application/json'},
            json={'files': [url]},
            timeout=10,
        )
        if not resp.ok or not resp.json().get('success'):
            print(f'Cache purge failed for {url}: {resp.status_code} {resp.text}')
    except requests.RequestException as e:
        print(f'Cache purge request failed for {url}: {e}')


def r2_upload(local_path, r2_key):
    # --s3-no-check-bucket: rclone's S3 backend otherwise calls CreateBucket before
    # every copy to verify the destination exists, which this R2 token isn't scoped
    # for (object read/write only, no bucket-admin) and gets rejected with a 403 --
    # even though the bucket already exists and the actual upload would succeed.
    subprocess.run(['rclone', 'copyto', '--s3-no-check-bucket', local_path, f'{R2_DEST}/{r2_key}'], check=True)
    purge_cf_cache(f'{PUBLIC_IMAGE_BASE}/{r2_key}')

# Ensure output directories exist
os.makedirs('./standard_cars', exist_ok=True)
os.makedirs('./half_standard_cars', exist_ok=True)
os.makedirs('./standard_hero_shots', exist_ok=True)
os.makedirs('./exile', exist_ok=True)

# ==========================================
# IMAGE PROCESSING HELPER FUNCTIONS
# ==========================================

def adjust_exposure_and_wb(img, bg_mask, target_bg_l=245.0):
    result = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    avg_l = cv2.mean(result[:, :, 0], mask=bg_mask)[0]
    avg_a = cv2.mean(result[:, :, 1], mask=bg_mask)[0]
    avg_b = cv2.mean(result[:, :, 2], mask=bg_mask)[0]
    
    result[:, :, 1] = result[:, :, 1] - ((avg_a - 128) * (result[:, :, 0] / 255.0) * 1.1)
    result[:, :, 2] = result[:, :, 2] - ((avg_b - 128) * (result[:, :, 0] / 255.0) * 1.1)
    
    if avg_l > 0:
        gain = target_bg_l / avg_l
        result[:, :, 0] = result[:, :, 0] * gain
    
    result = np.clip(result, 0, 255).astype(np.uint8)
    return cv2.cvtColor(result, cv2.COLOR_LAB2BGR)

def get_car_contour(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred_otsu = cv2.GaussianBlur(gray, (7, 7), 0)
    _, thresh_otsu = cv2.threshold(blurred_otsu, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    cl_gray = clahe.apply(gray)
    blurred_canny = cv2.GaussianBlur(cl_gray, (5, 5), 0)
    edges = cv2.Canny(blurred_canny, 20, 100)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 9))
    thresh_canny = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
    
    combined_mask = cv2.bitwise_or(thresh_otsu, thresh_canny)
    contours, _ = cv2.findContours(combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    valid_contours = [c for c in contours if cv2.contourArea(c) > 1000]
    
    if not valid_contours: return None
    return max(valid_contours, key=cv2.contourArea)

def find_wheel_line(img, car_contour):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    car_mask = np.zeros_like(thresh)
    cv2.drawContours(car_mask, [car_contour], -1, 255, -1)
    dark_parts = cv2.bitwise_and(thresh, car_mask)

    x, y, w, h = cv2.boundingRect(car_contour)
    bottom_half_y = y + h // 2
    
    left_x1, left_x2 = x, x + int(w * 0.3)
    right_x1, right_x2 = x + int(w * 0.7), x + w

    left_roi = dark_parts[bottom_half_y:y+h, left_x1:left_x2]
    left_points = cv2.findNonZero(left_roi)
    left_pt = (left_points[left_points[:, :, 1].argmax()][0][0] + left_x1, left_points[left_points[:, :, 1].argmax()][0][1] + bottom_half_y) if left_points is not None else (x + int(w*0.15), y + h)

    right_roi = dark_parts[bottom_half_y:y+h, right_x1:right_x2]
    right_points = cv2.findNonZero(right_roi)
    right_pt = (right_points[right_points[:, :, 1].argmax()][0][0] + right_x1, right_points[right_points[:, :, 1].argmax()][0][1] + bottom_half_y) if right_points is not None else (x + int(w*0.85), y + h)

    dx, dy = right_pt[0] - left_pt[0], right_pt[1] - left_pt[1]
    return left_pt, right_pt, math.degrees(math.atan2(dy, dx))

def force_wheel_angle(img, contour, target_angle=-18.0):
    _, _, current_angle = find_wheel_line(img, contour)
    rotation_needed = current_angle - target_angle
    (img_h, img_w) = img.shape[:2]
    center = (img_w // 2, img_h // 2)
    rotation_matrix = cv2.getRotationMatrix2D(center, rotation_needed, 1.0)
    return cv2.warpAffine(img, rotation_matrix, (img_w, img_h), borderMode=cv2.BORDER_REPLICATE)

# ==========================================
# MAIN PROCESSING PIPELINES
# ==========================================

def process_side_profile(img, target_w=800, target_h=300, ground_pos_y=280):
    gray_raw = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred_raw = cv2.GaussianBlur(gray_raw, (7, 7), 0)
    _, car_mask_raw = cv2.threshold(blurred_raw, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    bg_mask = cv2.bitwise_not(car_mask_raw)

    img_wb = adjust_exposure_and_wb(img, bg_mask)
    gray = cv2.cvtColor(img_wb, cv2.COLOR_BGR2GRAY)
    
    blurred_otsu = cv2.GaussianBlur(gray, (7, 7), 0)
    _, thresh_otsu = cv2.threshold(blurred_otsu, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    contours_o, _ = cv2.findContours(thresh_otsu, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    valid_o = [c for c in contours_o if cv2.contourArea(c) > 500]
    if not valid_o: return None
    xo, yo, wo, ho = cv2.boundingRect(max(valid_o, key=cv2.contourArea))
    ground_y_otsu = yo + ho 
    
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    blurred_canny = cv2.GaussianBlur(clahe.apply(gray), (5, 5), 0)
    thresh_canny = cv2.morphologyEx(cv2.Canny(blurred_canny, 20, 100), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (25, 9)))
    contours_c, _ = cv2.findContours(thresh_canny, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    valid_c = [c for c in contours_c if cv2.contourArea(c) > 500]
    if not valid_c: return None
    xc, yc, wc, _ = cv2.boundingRect(max(valid_c, key=cv2.contourArea))

    x_tight, y_tight = min(xc, xo), min(yc, yo)
    w_tight, h_tight = max(xc + wc, xo + wo) - x_tight, ground_y_otsu - y_tight

    scale_factor = (target_w * 0.8) / w_tight 
    if (h_tight * scale_factor) >= (ground_pos_y - 20):
        scale_factor = (ground_pos_y - 20) / h_tight
        margin = 120 
        source_x1, source_y1 = max(0, x_tight - margin), max(0, y_tight - margin)
        source_img = img_wb[source_y1:min(img_wb.shape[0], y_tight + h_tight + margin), source_x1:min(img_wb.shape[1], x_tight + w_tight + margin)]
        new_ground_y = int(((y_tight - source_y1) + h_tight) * scale_factor)
        new_center_x = int(((x_tight - source_x1) + (w_tight // 2)) * scale_factor)
    else:
        source_img = img_wb
        new_ground_y = int((y_tight + h_tight) * scale_factor)
        new_center_x = int((x_tight + (w_tight // 2)) * scale_factor)

    resized_img = cv2.resize(source_img, (0, 0), fx=scale_factor, fy=scale_factor)
    pad_top, pad_bottom = int(ground_pos_y - new_ground_y), int((target_h - ground_pos_y) - (resized_img.shape[0] - new_ground_y))
    pad_left, pad_right = int((target_w // 2) - new_center_x), int((target_w - (target_w // 2)) - (resized_img.shape[1] - new_center_x))

    sliced_img = resized_img[int(max(0, -pad_top)):int(resized_img.shape[0] - max(0, -pad_bottom)), int(max(0, -pad_left)):int(resized_img.shape[1] - max(0, -pad_right))]

    if (h_tight * scale_factor) >= (ground_pos_y - 20):
        return cv2.copyMakeBorder(sliced_img, int(max(0, pad_top)), int(max(0, pad_bottom)), int(max(0, pad_left)), int(max(0, pad_right)), cv2.BORDER_REPLICATE)
    else:
        temp_img = cv2.copyMakeBorder(sliced_img, 0, 0, int(max(0, pad_left)), int(max(0, pad_right)), cv2.BORDER_REPLICATE)
        return cv2.copyMakeBorder(temp_img, int(max(0, pad_top)), int(max(0, pad_bottom)), 0, 0, cv2.BORDER_CONSTANT, value=[245, 245, 245])

def process_hero_profile(img, target_w=1600, target_h=1200):
    gray_raw = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, car_mask_raw = cv2.threshold(cv2.GaussianBlur(gray_raw, (7, 7), 0), 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    img_wb = adjust_exposure_and_wb(img, cv2.bitwise_not(car_mask_raw), target_bg_l=245.0)

    car_contour = get_car_contour(img_wb)
    if car_contour is None: return None
        
    img_leveled = force_wheel_angle(img_wb, car_contour, target_angle=-18.0)
    car_contour = get_car_contour(img_leveled)
    if car_contour is None: return None

    x, y, w, h = cv2.boundingRect(car_contour)
    scale_factor = (target_w * 0.8) / w 

    if (h * scale_factor) > (target_h * 0.8):
        scale_factor = (target_h * 0.8) / h
        margin = 150 
        source_x1, source_y1 = max(0, x - margin), max(0, y - margin)
        source_img = img_leveled[source_y1:min(img_wb.shape[0], y + h + margin), source_x1:min(img_wb.shape[1], x + w + margin)]
        new_center_x, new_center_y = int(((x - source_x1) + (w / 2.0)) * scale_factor), int(((y - source_y1) + (h / 2.0)) * scale_factor)
    else:
        source_img = img_leveled
        new_center_x, new_center_y = int((x + (w / 2.0)) * scale_factor), int((y + (h / 2.0)) * scale_factor)

    resized_img = cv2.resize(source_img, (0, 0), fx=scale_factor, fy=scale_factor)
    
    pad_top, pad_bottom = int((target_h / 2) - new_center_y), int((target_h / 2) - (resized_img.shape[0] - new_center_y))
    pad_left, pad_right = int((target_w / 2) - new_center_x), int((target_w / 2) - (resized_img.shape[1] - new_center_x))

    sliced_img = resized_img[int(max(0, -pad_top)):int(resized_img.shape[0] - max(0, -pad_bottom)), int(max(0, -pad_left)):int(resized_img.shape[1] - max(0, -pad_right))]
    return cv2.copyMakeBorder(sliced_img, int(max(0, pad_top)), int(max(0, pad_bottom)), int(max(0, pad_left)), int(max(0, pad_right)), cv2.BORDER_REPLICATE)

def process_side_profile_monster_truck(img, target_w=800, target_h=300):
    """Side profile crop for monster trucks.

    Uses the same scale/position rules as process_side_profile, but shifts the
    ground line (wheel bottom) so that 30% of the truck's scaled height sits
    below the canvas bottom — leaving the body/cab fully visible while the big
    wheels are cropped at the frame edge.
    """
    gray_raw = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred_raw = cv2.GaussianBlur(gray_raw, (7, 7), 0)
    _, car_mask_raw = cv2.threshold(blurred_raw, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    img_wb = adjust_exposure_and_wb(img, cv2.bitwise_not(car_mask_raw))
    gray = cv2.cvtColor(img_wb, cv2.COLOR_BGR2GRAY)

    blurred_otsu = cv2.GaussianBlur(gray, (7, 7), 0)
    _, thresh_otsu = cv2.threshold(blurred_otsu, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    contours_o, _ = cv2.findContours(thresh_otsu, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    valid_o = [c for c in contours_o if cv2.contourArea(c) > 500]
    if not valid_o: return None
    xo, yo, wo, ho = cv2.boundingRect(max(valid_o, key=cv2.contourArea))
    ground_y_otsu = yo + ho

    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    blurred_canny = cv2.GaussianBlur(clahe.apply(gray), (5, 5), 0)
    thresh_canny = cv2.morphologyEx(
        cv2.Canny(blurred_canny, 20, 100),
        cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_RECT, (25, 9))
    )
    contours_c, _ = cv2.findContours(thresh_canny, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    valid_c = [c for c in contours_c if cv2.contourArea(c) > 500]
    if not valid_c: return None
    xc, yc, wc, _ = cv2.boundingRect(max(valid_c, key=cv2.contourArea))

    x_tight = min(xc, xo)
    y_tight = min(yc, yo)
    w_tight = max(xc + wc, xo + wo) - x_tight
    h_tight = ground_y_otsu - y_tight

    # Same base scale as normal side profile (80 % of canvas width)
    scale_factor = (target_w * 0.8) / w_tight
    h_scaled = h_tight * scale_factor

    # Ground line is 30 % of scaled truck height below the canvas bottom edge
    ground_pos_y = target_h + int(0.3 * h_scaled)

    # "Too tall": visible top 70 % of truck would overflow canvas (minus 20 px top margin)
    max_visible_h = target_h - 20
    is_tall = (0.7 * h_scaled) >= max_visible_h
    if is_tall:
        scale_factor = max_visible_h / (h_tight * 0.7)
        h_scaled = h_tight * scale_factor
        ground_pos_y = target_h + int(0.3 * h_scaled)
        margin = 120
        source_x1 = max(0, x_tight - margin)
        source_y1 = max(0, y_tight - margin)
        source_img = img_wb[
            source_y1:min(img_wb.shape[0], y_tight + h_tight + margin),
            source_x1:min(img_wb.shape[1], x_tight + w_tight + margin)
        ]
        new_ground_y = int(((y_tight - source_y1) + h_tight) * scale_factor)
        new_center_x = int(((x_tight - source_x1) + (w_tight // 2)) * scale_factor)
    else:
        source_img = img_wb
        new_ground_y = int((y_tight + h_tight) * scale_factor)
        new_center_x = int((x_tight + (w_tight // 2)) * scale_factor)

    resized_img = cv2.resize(source_img, (0, 0), fx=scale_factor, fy=scale_factor)
    pad_top   = int(ground_pos_y - new_ground_y)
    pad_bottom = int((target_h - ground_pos_y) - (resized_img.shape[0] - new_ground_y))
    pad_left  = int((target_w // 2) - new_center_x)
    pad_right = int((target_w - (target_w // 2)) - (resized_img.shape[1] - new_center_x))

    sliced_img = resized_img[
        int(max(0, -pad_top)):int(resized_img.shape[0] - max(0, -pad_bottom)),
        int(max(0, -pad_left)):int(resized_img.shape[1] - max(0, -pad_right))
    ]

    if is_tall:
        return cv2.copyMakeBorder(
            sliced_img,
            int(max(0, pad_top)), int(max(0, pad_bottom)),
            int(max(0, pad_left)), int(max(0, pad_right)),
            cv2.BORDER_REPLICATE
        )
    else:
        temp_img = cv2.copyMakeBorder(
            sliced_img, 0, 0,
            int(max(0, pad_left)), int(max(0, pad_right)),
            cv2.BORDER_REPLICATE
        )
        return cv2.copyMakeBorder(
            temp_img,
            int(max(0, pad_top)), int(max(0, pad_bottom)), 0, 0,
            cv2.BORDER_CONSTANT, value=[245, 245, 245]
        )

def process_side_profile_sensitive(img, target_w=800, target_h=300, ground_pos_y=280, cap_pct=0.3):
    """Side profile variant for white/light vehicles with hard-to-detect wheel bottoms.

    Bounding box detection is identical to process_side_profile. The only difference
    is a targeted downward scan within the car's column range to find the actual wheel
    bottom, which Otsu misses on white-bodied vehicles. Only called for (1) images.
    """
    gray_raw = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred_raw = cv2.GaussianBlur(gray_raw, (7, 7), 0)
    _, car_mask_raw = cv2.threshold(blurred_raw, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    img_wb = adjust_exposure_and_wb(img, cv2.bitwise_not(car_mask_raw))
    gray = cv2.cvtColor(img_wb, cv2.COLOR_BGR2GRAY)

    # --- Standard bounding box (identical to process_side_profile) ---
    blurred_otsu = cv2.GaussianBlur(gray, (7, 7), 0)
    _, thresh_otsu = cv2.threshold(blurred_otsu, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    contours_o, _ = cv2.findContours(thresh_otsu, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    valid_o = [c for c in contours_o if cv2.contourArea(c) > 500]
    if not valid_o: return None
    xo, yo, wo, ho = cv2.boundingRect(max(valid_o, key=cv2.contourArea))
    ground_y_otsu = yo + ho

    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    blurred_canny = cv2.GaussianBlur(clahe.apply(gray), (5, 5), 0)
    thresh_canny = cv2.morphologyEx(cv2.Canny(blurred_canny, 20, 100), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (25, 9)))
    contours_c, _ = cv2.findContours(thresh_canny, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    valid_c = [c for c in contours_c if cv2.contourArea(c) > 500]
    if not valid_c: return None
    xc, yc, wc, _ = cv2.boundingRect(max(valid_c, key=cv2.contourArea))

    x_tight = min(xc, xo)
    y_tight = min(yc, yo)
    w_tight = max(xc + wc, xo + wo) - x_tight
    col_start = max(0, x_tight)
    col_end = min(gray.shape[1], x_tight + w_tight)

    # --- Sensitive ground line: bottommost Canny edge within car columns ---
    # Baseline is ground_y_otsu only (identical to process_side_profile) so the
    # bounding box is never inflated for easy/dark vehicles. The sensitive scan
    # can only push the ground line DOWN, never up.
    # Cap: 30 % of the Otsu car height — proportional so it scales with image res.
    h_otsu = ground_y_otsu - y_tight
    search_bot = min(gray.shape[0], ground_y_otsu + int(h_otsu * cap_pct))
    clahe_sens = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8, 8))
    blurred_sens = cv2.GaussianBlur(clahe_sens.apply(gray), (3, 3), 0)
    edges_sens = cv2.Canny(blurred_sens, 15, 60)
    car_edges = edges_sens[y_tight:search_bot, col_start:col_end]
    rows_with_edges = np.where(np.any(car_edges > 0, axis=1))[0]
    ground_y_sensitive = (y_tight + int(rows_with_edges[-1])) if len(rows_with_edges) > 0 else ground_y_otsu

    h_tight = max(ground_y_otsu, ground_y_sensitive) - y_tight
    if h_tight <= 0: return None

    # --- Scaling / padding (identical to process_side_profile) ---
    scale_factor = (target_w * 0.8) / w_tight
    if (h_tight * scale_factor) >= (ground_pos_y - 20):
        scale_factor = (ground_pos_y - 20) / h_tight
        margin = 120
        source_x1, source_y1 = max(0, x_tight - margin), max(0, y_tight - margin)
        source_img = img_wb[source_y1:min(img_wb.shape[0], y_tight + h_tight + margin), source_x1:min(img_wb.shape[1], x_tight + w_tight + margin)]
        new_ground_y = int(((y_tight - source_y1) + h_tight) * scale_factor)
        new_center_x = int(((x_tight - source_x1) + (w_tight // 2)) * scale_factor)
    else:
        source_img = img_wb
        new_ground_y = int((y_tight + h_tight) * scale_factor)
        new_center_x = int((x_tight + (w_tight // 2)) * scale_factor)

    resized_img = cv2.resize(source_img, (0, 0), fx=scale_factor, fy=scale_factor)
    pad_top, pad_bottom = int(ground_pos_y - new_ground_y), int((target_h - ground_pos_y) - (resized_img.shape[0] - new_ground_y))
    pad_left, pad_right = int((target_w // 2) - new_center_x), int((target_w - (target_w // 2)) - (resized_img.shape[1] - new_center_x))

    sliced_img = resized_img[int(max(0, -pad_top)):int(resized_img.shape[0] - max(0, -pad_bottom)), int(max(0, -pad_left)):int(resized_img.shape[1] - max(0, -pad_right))]

    is_tall = (h_tight * scale_factor) >= (ground_pos_y - 20)
    if is_tall:
        final_img = cv2.copyMakeBorder(sliced_img, int(max(0, pad_top)), int(max(0, pad_bottom)), int(max(0, pad_left)), int(max(0, pad_right)), cv2.BORDER_REPLICATE)
    else:
        temp_img = cv2.copyMakeBorder(sliced_img, 0, 0, int(max(0, pad_left)), int(max(0, pad_right)), cv2.BORDER_REPLICATE)
        final_img = cv2.copyMakeBorder(temp_img, int(max(0, pad_top)), int(max(0, pad_bottom)), 0, 0, cv2.BORDER_CONSTANT, value=[245, 245, 245])

    return final_img

def process_brightness_only(img):
    gray_raw = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred_raw = cv2.GaussianBlur(gray_raw, (7, 7), 0)
    _, car_mask_raw = cv2.threshold(blurred_raw, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    bg_mask = cv2.bitwise_not(car_mask_raw)

    # For tightly pre-cropped images Otsu finds very little background, making the
    # WB calculation unreliable. Fall back to sampling the four image corners instead.
    bg_coverage = cv2.countNonZero(bg_mask) / float(bg_mask.size)
    if bg_coverage < 0.08:
        h, w = img.shape[:2]
        patch = max(30, min(h, w) // 10)
        bg_mask = np.zeros((h, w), dtype=np.uint8)
        bg_mask[0:patch, 0:patch] = 255
        bg_mask[0:patch, w - patch:w] = 255
        bg_mask[h - patch:h, 0:patch] = 255
        bg_mask[h - patch:h, w - patch:w] = 255

    return adjust_exposure_and_wb(img, bg_mask)

def save_half_side(img, filename):
    local_path = os.path.join('./half_standard_cars', filename)
    half = cv2.resize(img, (400, 150), interpolation=cv2.INTER_AREA)
    cv2.imwrite(local_path, half, [cv2.IMWRITE_JPEG_QUALITY, 85])
    r2_upload(local_path, f'half_standard_cars/{filename}')

# ==========================================
# API ENDPOINTS
# ==========================================

@app.route('/api/upload', methods=['POST'])
def upload_images():
    if 'files' not in request.files:
        return jsonify({"error": "No files received"}), 400
    
    files = request.files.getlist('files')
    processed_count = 0
    
    for file in files:
        if file.filename == '': continue
        
        # Read directly from memory into OpenCV
        file_bytes = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        if img is None: continue

        filename_lower = file.filename.lower()
        
        # Route 1: Side Profile Standardizer
        if "(1).jpg" in filename_lower:
            final_img = process_side_profile(img)
            if final_img is not None:
                cv2.imwrite(os.path.join('./standard_cars', file.filename), final_img)
                save_half_side(final_img, file.filename)
                processed_count += 1
                
        # Route 2: Hero Shot Standardizer
        elif "(2).jpg" in filename_lower:
            final_img = process_hero_profile(img)
            if final_img is not None:
                local_path = os.path.join('./standard_hero_shots', file.filename)
                cv2.imwrite(local_path, final_img)
                r2_upload(local_path, f'standard_hero_shots/{file.filename}')
                processed_count += 1

    if processed_count > 0:
        return jsonify({"message": f"Successfully processed {processed_count} image(s)!"}), 200
    return jsonify({"error": "No valid (1).jpg or (2).jpg files were processed."}), 400


@app.route('/api/upload-monster', methods=['POST'])
def upload_images_monster():
    if 'files' not in request.files:
        return jsonify({"error": "No files received"}), 400

    files = request.files.getlist('files')
    processed_count = 0

    for file in files:
        if file.filename == '': continue

        file_bytes = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        if img is None: continue

        filename_lower = file.filename.lower()

        if "(1).jpg" in filename_lower:
            final_img = process_side_profile_monster_truck(img)
            if final_img is not None:
                cv2.imwrite(os.path.join('./standard_cars', file.filename), final_img)
                save_half_side(final_img, file.filename)
                processed_count += 1

        elif "(2).jpg" in filename_lower:
            final_img = process_hero_profile(img)
            if final_img is not None:
                local_path = os.path.join('./standard_hero_shots', file.filename)
                cv2.imwrite(local_path, final_img)
                r2_upload(local_path, f'standard_hero_shots/{file.filename}')
                processed_count += 1

    if processed_count > 0:
        return jsonify({"message": f"Successfully processed {processed_count} image(s) as Monster Truck!"}), 200
    return jsonify({"error": "No valid (1).jpg or (2).jpg files were processed."}), 400


GROUND_POS_Y = 280

@app.route('/api/upload-sensitive-preview', methods=['POST'])
def upload_sensitive_preview():
    if 'files' not in request.files:
        return jsonify({"error": "No files received"}), 400

    files = [f for f in request.files.getlist('files') if f.filename != '']
    if len(files) != 1:
        return jsonify({"error": "Exactly one file is required."}), 400

    file = files[0]
    if '(1).jpg' not in file.filename.lower():
        return jsonify({"error": "File must be a (1).jpg side profile."}), 400

    file_bytes = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    if img is None:
        return jsonify({"error": "Could not read image."}), 400

    start_pct = float(request.form.get('start_pct', 0.0))
    count     = int(request.form.get('count', 20))
    steps = [round(start_pct + i * 0.05, 4) for i in range(count)]
    variants = []
    for cap in steps:
        result = process_side_profile_sensitive(img, cap_pct=cap)
        if result is None:
            continue

        _, clean_buf = cv2.imencode('.jpg', result, [cv2.IMWRITE_JPEG_QUALITY, 90])
        save_b64 = base64.b64encode(clean_buf.tobytes()).decode('utf-8')

        preview = result.copy()
        cv2.line(preview, (0, GROUND_POS_Y), (result.shape[1], GROUND_POS_Y), (0, 255, 0), 2)
        _, preview_buf = cv2.imencode('.jpg', preview, [cv2.IMWRITE_JPEG_QUALITY, 90])
        preview_b64 = base64.b64encode(preview_buf.tobytes()).decode('utf-8')

        label = f'{int(round(cap * 100))}%'
        variants.append({'label': label, 'preview_b64': preview_b64, 'save_b64': save_b64})

    if not variants:
        return jsonify({"error": "Processing failed for all variants."}), 400

    return jsonify({'filename': file.filename, 'variants': variants}), 200


@app.route('/api/save-sensitive', methods=['POST'])
def save_sensitive():
    try:
        data = request.get_json()
        filename = data.get('filename', '')
        b64 = data.get('b64', '')
        if not filename or not b64:
            return jsonify({"error": "Missing filename or image data."}), 400
        img_bytes = base64.b64decode(b64)
        img_array = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            return jsonify({"error": "Could not decode image."}), 400
        cv2.imwrite(os.path.join('./standard_cars', filename), img)
        save_half_side(img, filename)
        return jsonify({"message": f"Saved {filename}!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/upload-sensitive', methods=['POST'])
def upload_images_sensitive():
    if 'files' not in request.files:
        return jsonify({"error": "No files received"}), 400

    files = request.files.getlist('files')
    processed_count = 0

    for file in files:
        if file.filename == '': continue

        file_bytes = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        if img is None: continue

        filename_lower = file.filename.lower()

        if "(1).jpg" in filename_lower:
            final_img = process_side_profile_sensitive(img)
            if final_img is not None:
                cv2.imwrite(os.path.join('./standard_cars', file.filename), final_img)
                save_half_side(final_img, file.filename)
                processed_count += 1

    if processed_count > 0:
        return jsonify({"message": f"Successfully processed {processed_count} image(s) with sensitive detection!"}), 200
    return jsonify({"error": "No valid (1).jpg files were processed."}), 400


@app.route('/api/upload-brightness', methods=['POST'])
def upload_images_brightness():
    if 'files' not in request.files:
        return jsonify({"error": "No files received"}), 400

    files = request.files.getlist('files')
    processed_count = 0

    for file in files:
        if file.filename == '': continue

        file_bytes = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        if img is None: continue

        filename_lower = file.filename.lower()

        if "(1).jpg" in filename_lower:
            final_img = process_brightness_only(img)
            cv2.imwrite(os.path.join('./standard_cars', file.filename), final_img)
            save_half_side(final_img, file.filename)
            processed_count += 1

        elif "(2).jpg" in filename_lower:
            final_img = process_brightness_only(img)
            local_path = os.path.join('./standard_hero_shots', file.filename)
            cv2.imwrite(local_path, final_img)
            r2_upload(local_path, f'standard_hero_shots/{file.filename}')
            processed_count += 1

    if processed_count > 0:
        return jsonify({"message": f"Brightness adjusted {processed_count} image(s)!"}), 200
    return jsonify({"error": "No valid (1).jpg or (2).jpg files were processed."}), 400


@app.route('/api/exile-images', methods=['POST'])
def exile_images():
    try:
        ids = request.get_json().get('ids', [])
        moved = []
        for car_id in ids:
            for folder, suffix in [('./standard_cars', '(1).jpg'), ('./standard_hero_shots', '(2).jpg')]:
                filename = f'{car_id} {suffix}'
                src = os.path.join(folder, filename)
                if os.path.exists(src):
                    shutil.move(src, os.path.join('./exile', filename))
                    moved.append(filename)
        return jsonify({'moved': moved}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/save', methods=['POST'])
def save_csv():
    try:
        csv_data = request.get_data(as_text=True)
        if not csv_data: return jsonify({"error": "No data received"}), 400
        if os.path.exists(CSV_FILE_PATH): shutil.copy2(CSV_FILE_PATH, BACKUP_FILE_PATH)
        with open(CSV_FILE_PATH, 'w', encoding='utf-8') as f: f.write(csv_data)
        return jsonify({"message": "Successfully saved to collection.csv"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/missing-images', methods=['GET'])
def missing_images():
    try:
        side_ids = set()
        if os.path.isdir('./standard_cars'):
            for fname in os.listdir('./standard_cars'):
                if '(1)' in fname and fname.lower().endswith('.jpg'):
                    m = re.match(r'^(\d+)', fname)
                    if m:
                        side_ids.add(m.group(1))

        hero_ids = set()
        if os.path.isdir('./standard_hero_shots'):
            for fname in os.listdir('./standard_hero_shots'):
                if '(2)' in fname and fname.lower().endswith('.jpg'):
                    m = re.match(r'^(\d+)', fname)
                    if m:
                        hero_ids.add(m.group(1))

        missing = []
        if os.path.exists(CSV_FILE_PATH):
            with open(CSV_FILE_PATH, encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    car_id = str(row.get('ID', '')).strip()
                    if not car_id:
                        continue
                    missing_side = car_id not in side_ids
                    missing_hero = car_id not in hero_ids
                    if missing_side or missing_hero:
                        missing.append({
                            'id': car_id,
                            'year': row.get('Year', ''),
                            'make': row.get('Make', ''),
                            'model': row.get('Model', ''),
                            'supername': row.get('Supername', ''),
                            'brand': row.get('Brand', ''),
                            'series': row.get('Series', ''),
                            'missing_side': missing_side,
                            'missing_hero': missing_hero,
                        })

        return jsonify({'missing': missing}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/publish', methods=['POST'])
def publish():
    try:
        side_ids = set()
        if os.path.isdir('./standard_cars'):
            for fname in os.listdir('./standard_cars'):
                if '(1)' in fname and fname.lower().endswith('.jpg'):
                    m = re.match(r'^(\d+)', fname)
                    if m:
                        side_ids.add(m.group(1))

        cars = []
        if os.path.exists(CSV_FILE_PATH):
            with open(CSV_FILE_PATH, encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    car_id = str(row.get('ID', '')).strip()
                    if not car_id:
                        continue
                    if row.get('Broken_image', '').strip().upper() == 'TRUE':
                        continue
                    if car_id not in side_ids:
                        continue
                    cars.append({
                        'ID': car_id,
                        'Year': row.get('Year', '').strip(),
                        'Make': row.get('Make', '').strip(),
                        'Model': row.get('Model', '').strip(),
                        'Supername': row.get('Supername', '').strip(),
                        'Brand': row.get('Brand', '').strip(),
                        'Series': row.get('Series', '').strip(),
                        'Country': row.get('Country', '').strip(),
                        'Category': row.get('Category', '').strip(),
                        'Description': row.get('Description', '').strip(),
                    })

        os.makedirs('./public', exist_ok=True)
        with open('./public/public_cars.json', 'w', encoding='utf-8') as f:
            json.dump(cars, f, ensure_ascii=False)

        return jsonify({'message': f'Published {len(cars)} cars to public_cars.json'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/undo', methods=['POST'])
def undo_csv():
    try:
        if os.path.exists(BACKUP_FILE_PATH):
            shutil.copy2(BACKUP_FILE_PATH, CSV_FILE_PATH)
            return jsonify({"message": "Backup restored successfully"}), 200
        return jsonify({"error": "No backup file found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)