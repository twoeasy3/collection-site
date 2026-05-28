import cv2
import numpy as np
import os
import glob
import math

def adjust_exposure_and_wb(img, bg_mask, target_bg_l=245.0):
    """Standardizes the background brightness and white balance."""
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
    """Robust hybrid detection for the car's bounding box."""
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
    
    if not valid_contours:
        return None
    return max(valid_contours, key=cv2.contourArea)

def find_wheel_line(img, car_contour):
    """
    Finds the lowest dark pixels in the left and right thirds of the car 
    to reliably locate the contact patch of the tires.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    car_mask = np.zeros_like(thresh)
    cv2.drawContours(car_mask, [car_contour], -1, 255, -1)
    dark_parts = cv2.bitwise_and(thresh, car_mask)

    x, y, w, h = cv2.boundingRect(car_contour)

    bottom_half_y = y + h // 2
    
    left_x1 = x
    left_x2 = x + int(w * 0.3)
    right_x1 = x + int(w * 0.7)
    right_x2 = x + w

    left_roi = dark_parts[bottom_half_y:y+h, left_x1:left_x2]
    left_points = cv2.findNonZero(left_roi)
    if left_points is not None:
        left_lowest = left_points[left_points[:, :, 1].argmax()][0]
        left_pt = (left_lowest[0] + left_x1, left_lowest[1] + bottom_half_y)
    else:
        left_pt = (x + int(w*0.15), y + h)

    right_roi = dark_parts[bottom_half_y:y+h, right_x1:right_x2]
    right_points = cv2.findNonZero(right_roi)
    if right_points is not None:
        right_lowest = right_points[right_points[:, :, 1].argmax()][0]
        right_pt = (right_lowest[0] + right_x1, right_lowest[1] + bottom_half_y)
    else:
        right_pt = (x + int(w*0.85), y + h)

    dx = right_pt[0] - left_pt[0]
    dy = right_pt[1] - left_pt[1]
    
    current_angle = math.degrees(math.atan2(dy, dx))
    
    return left_pt, right_pt, current_angle

def force_wheel_angle(img, contour, target_angle=-18.0, debug=True):
    """
    Detects the wheel line, draws it, and rotates the image so the wheels 
    sit exactly at the target angle.
    """
    left_pt, right_pt, current_angle = find_wheel_line(img, contour)
    
    if debug:
        cv2.line(img, left_pt, right_pt, (0, 255, 0), 3)
        cv2.circle(img, left_pt, 6, (255, 0, 0), -1)
        cv2.circle(img, right_pt, 6, (255, 0, 0), -1)

    rotation_needed = current_angle - target_angle
    
    (img_h, img_w) = img.shape[:2]
    center = (img_w // 2, img_h // 2)
    
    rotation_matrix = cv2.getRotationMatrix2D(center, rotation_needed, 1.0)
    
    # Rotate using REPLICATE to smoothly fan out the background into the empty corners
    rotated_img = cv2.warpAffine(img, rotation_matrix, (img_w, img_h), 
                                 borderMode=cv2.BORDER_REPLICATE)
                                 
    return rotated_img, current_angle, rotation_needed

def process_hero_shot(img_path, output_dir, target_w=1600, target_h=1200, debug=True):
    TARGET_WHEEL_ANGLE = -18.0 
    
    filename = os.path.basename(img_path)
    out_path = os.path.join(output_dir, filename)
    
    if os.path.exists(out_path):
        print(f"Skipping {filename}, already exists in output directory.")
        return

    img = cv2.imread(img_path)
    if img is None:
        print(f"Error reading {img_path}")
        return

    # 1. Background Masking & Brightness Standardization
    gray_raw = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred_raw = cv2.GaussianBlur(gray_raw, (7, 7), 0)
    _, car_mask_raw = cv2.threshold(blurred_raw, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    bg_mask = cv2.bitwise_not(car_mask_raw)
    
    img_wb = adjust_exposure_and_wb(img, bg_mask, target_bg_l=245.0)

    # 2. Get Contour & Force Wheel Angle
    car_contour = get_car_contour(img_wb)
    if car_contour is None:
        print(f"Could not detect car in {img_path}")
        return
        
    img_leveled, original_angle, rotation_applied = force_wheel_angle(img_wb, car_contour, target_angle=TARGET_WHEEL_ANGLE, debug=debug)
    
    # Recalculate contour after rotation
    car_contour = get_car_contour(img_leveled)
    if car_contour is None:
        print(f"Rotation pushed car out of bounds in {img_path}")
        return

    # 3. Scale Calculation (Targeting 80% of canvas width)
    x, y, w, h = cv2.boundingRect(car_contour)
    
    scale_factor = (target_w * 0.8) / w 
    scaled_h_car = h * scale_factor

    max_allowed_h = target_h * 0.8
    is_tall = scaled_h_car > max_allowed_h

    if is_tall:
        scale_factor = max_allowed_h / h

    # Calculate center of the car bounding box relative to original image
    car_center_x_orig = x + (w / 2.0)
    car_center_y_orig = y + (h / 2.0)

    # 4. Crop/Slice Logic (Preserving Center Anchor)
    if is_tall:
        margin = 150 
        source_x1 = max(0, x - margin)
        source_y1 = max(0, y - margin)
        source_x2 = min(img_wb.shape[1], x + w + margin)
        source_y2 = min(img_wb.shape[0], y + h + margin)
        source_img = img_leveled[source_y1:source_y2, source_x1:source_x2]
        
        car_center_x_src = car_center_x_orig - source_x1
        car_center_y_src = car_center_y_orig - source_y1
    else:
        source_img = img_leveled
        car_center_x_src = car_center_x_orig
        car_center_y_src = car_center_y_orig

    resized_img = cv2.resize(source_img, (0, 0), fx=scale_factor, fy=scale_factor)
    
    new_center_x = int(car_center_x_src * scale_factor)
    new_center_y = int(car_center_y_src * scale_factor)

    # Center exactly in the 1600x1200 canvas
    pad_top = int((target_h / 2) - new_center_y)
    pad_bottom = int((target_h / 2) - (resized_img.shape[0] - new_center_y))
    pad_left = int((target_w / 2) - new_center_x)
    pad_right = int((target_w / 2) - (resized_img.shape[1] - new_center_x))

    crop_top = int(max(0, -pad_top))
    crop_bottom = int(resized_img.shape[0] - max(0, -pad_bottom))
    crop_left = int(max(0, -pad_left))
    crop_right = int(resized_img.shape[1] - max(0, -pad_right))
    sliced_img = resized_img[crop_top:crop_bottom, crop_left:crop_right]

    # Padding Execution (Using Replicate for all 4 edges to seamlessly extend natural gradient)
    final_img = cv2.copyMakeBorder(
        sliced_img, 
        int(max(0, pad_top)), int(max(0, pad_bottom)), int(max(0, pad_left)), int(max(0, pad_right)), 
        cv2.BORDER_REPLICATE
    )

    # --- 5. DEBUG VISUALS ---
    if debug:
        cv2.line(final_img, (0, target_h // 2), (target_w, target_h // 2), (0, 0, 255), 1)
        cv2.line(final_img, (target_w // 2, 0), (target_w // 2, target_h), (0, 0, 255), 1)

        final_x = int((x if not is_tall else (x - source_x1)) * scale_factor) + pad_left
        final_y = int((y if not is_tall else (y - source_y1)) * scale_factor) + pad_top
        final_w = int(w * scale_factor)
        final_h = int(h * scale_factor)
        
        cv2.rectangle(final_img, (final_x, final_y), (final_x + final_w, final_y + final_h), (255, 0, 0), 2)
        
        text_color = (0, 0, 255) if abs(rotation_applied) > 0 else (0, 150, 0)
        
        cv2.putText(final_img, f"Orig Angle: {original_angle:.1f} deg", (40, 60), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1.5, text_color, 3)
        cv2.putText(final_img, f"Rotated by: {rotation_applied:.1f} deg", (40, 110), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1.5, text_color, 3)

    cv2.imwrite(out_path, final_img)
    print(f"Processed: {filename} - Rotated by {rotation_applied:.1f} deg")

if __name__ == "__main__":
    INPUT_DIR = './hero_shots_raw'
    OUTPUT_DIR = './standard_hero_shots'
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    image_files = glob.glob(os.path.join(INPUT_DIR, '*.jpg'))
    
    print(f"Found {len(image_files)} images. Starting standardization pipeline (Seamless Edges)...")
    
    for img_file in image_files:
        process_hero_shot(img_file, OUTPUT_DIR, debug=False)
        
    print("Pipeline complete.")