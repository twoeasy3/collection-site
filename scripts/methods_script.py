import cv2
import numpy as np
import os
import glob
from skimage.filters import threshold_sauvola

def adjust_white_balance(img, bg_mask):
    """Adjusts white balance using only the background pixels."""
    result = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    avg_a = cv2.mean(result[:, :, 1], mask=bg_mask)[0]
    avg_b = cv2.mean(result[:, :, 2], mask=bg_mask)[0]
    
    result[:, :, 1] = result[:, :, 1] - ((avg_a - 128) * (result[:, :, 0] / 255.0) * 1.1)
    result[:, :, 2] = result[:, :, 2] - ((avg_b - 128) * (result[:, :, 0] / 255.0) * 1.1)
    
    result = np.clip(result, 0, 255).astype(np.uint8)
    return cv2.cvtColor(result, cv2.COLOR_LAB2BGR)

def get_bounding_box(img_wb, method):
    """
    Attempts to find the car's bounding box using various thresholding techniques.
    """
    gray = cv2.cvtColor(img_wb, cv2.COLOR_BGR2GRAY)
    
    # Pre-process: CLAHE dramatically boosts local contrast (great for white-on-white)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    cl_gray = clahe.apply(gray)
    
    if method == '1_otsu_standard':
        blurred = cv2.GaussianBlur(gray, (7, 7), 0)
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
    elif method == '2_otsu_clahe':
        blurred = cv2.GaussianBlur(cl_gray, (7, 7), 0)
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
    elif method == '3_adaptive':
        blurred = cv2.GaussianBlur(cl_gray, (5, 5), 0)
        # Calculates threshold dynamically based on local neighborhoods
        thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                       cv2.THRESH_BINARY_INV, 51, 5)
        # Clean up the noisy adaptive output
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
        
    elif method == '4_sauvola':
        # Sauvola is designed specifically for document backgrounds, 
        # making it highly sensitive to faint edges on bright backgrounds.
        window_size = 51
        thresh_val = threshold_sauvola(cl_gray, window_size=window_size)
        # Sauvola creates a map; we keep pixels darker than the map
        binary = cl_gray < thresh_val
        thresh = (binary * 255).astype(np.uint8)
        
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
        
    elif method == '5_canny':
        blurred = cv2.GaussianBlur(cl_gray, (5, 5), 0)
        # Detects gradients (changes in brightness) rather than pure intensity
        edges = cv2.Canny(blurred, 20, 100)
        # Morphological close to merge edges into a solid block
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 25))
        thresh = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
        
    else:
        return None

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Filter out tiny dust specs
    valid_contours = [c for c in contours if cv2.contourArea(c) > 500]
    if not valid_contours:
        return None
        
    car_contour = max(valid_contours, key=cv2.contourArea)
    return cv2.boundingRect(car_contour)


def test_standardize_car(img_path, output_dir, target_w=800, target_h=300, ground_pos_y=280):
    img = cv2.imread(img_path)
    if img is None:
        print(f"Error reading {img_path}")
        return

    # Preliminary pass for White Balance Background Mask
    gray_raw = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred_raw = cv2.GaussianBlur(gray_raw, (7, 7), 0)
    _, car_mask_raw = cv2.threshold(blurred_raw, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    bg_mask = cv2.bitwise_not(car_mask_raw)

    img_wb = adjust_white_balance(img, bg_mask)
    base_filename = os.path.splitext(os.path.basename(img_path))[0]

    # The 5 methods we are testing
    methods = ['1_otsu_standard', '2_otsu_clahe', '3_adaptive', '4_sauvola', '5_canny']

    for method in methods:
        box = get_bounding_box(img_wb, method)
        if box is None:
            print(f"[{method}] Failed to find car in {base_filename}")
            continue
            
        x_tight, y_tight, w_tight, h_tight = box

        # Updated Crop Margin to 120
        margin = 120 
        source_x1 = max(0, x_tight - margin)
        source_y1 = max(0, y_tight - margin)
        source_x2 = min(img_wb.shape[1], x_tight + w_tight + margin)
        source_y2 = min(img_wb.shape[0], y_tight + h_tight + margin)
        
        source_img = img_wb[source_y1:source_y2, source_x1:source_x2]

        car_box_x_src = x_tight - source_x1
        car_box_y_src = y_tight - source_y1
        
        original_ground_y = car_box_y_src + h_tight
        car_center_x = car_box_x_src + (w_tight // 2)

        # Scale and Check "Tall"
        scale_factor = (target_w * 0.8) / w_tight 
        scaled_h_car = h_tight * scale_factor
        max_allowed_h = ground_pos_y - 20
        is_tall = scaled_h_car >= max_allowed_h

        if is_tall:
            scale_factor = max_allowed_h / h_tight
            resized_img = cv2.resize(source_img, (0, 0), fx=scale_factor, fy=scale_factor)
            
            new_ground_y = int(original_ground_y * scale_factor)
            new_center_x = int(car_center_x * scale_factor)

            # Debug Lines
            cv2.line(resized_img, (0, new_ground_y), (resized_img.shape[1], new_ground_y), (0, 255, 0), 2)
            cv2.rectangle(resized_img, 
                          (int(car_box_x_src * scale_factor), int(car_box_y_src * scale_factor)), 
                          (int((car_box_x_src + w_tight) * scale_factor), int((car_box_y_src + h_tight) * scale_factor)), 
                          (255, 0, 0), 2)

            pad_top = ground_pos_y - new_ground_y
            pad_bottom = (target_h - ground_pos_y) - (resized_img.shape[0] - new_ground_y)
            pad_left = (target_w // 2) - new_center_x
            pad_right = (target_w - (target_w // 2)) - (resized_img.shape[1] - new_center_x)

            crop_top = max(0, -pad_top)
            crop_bottom = resized_img.shape[0] - max(0, -pad_bottom)
            crop_left = max(0, -pad_left)
            crop_right = resized_img.shape[1] - max(0, -pad_right)

            final_source_img = resized_img[crop_top:crop_bottom, crop_left:crop_right]

            final_img = cv2.copyMakeBorder(
                final_source_img, 
                max(0, pad_top), max(0, pad_bottom), max(0, pad_left), max(0, pad_right), 
                cv2.BORDER_REPLICATE
            )
        else:
            original_ground_y_full = y_tight + h_tight
            car_center_x_full = x_tight + (w_tight // 2)

            resized_img = cv2.resize(img_wb, (0, 0), fx=scale_factor, fy=scale_factor)
            new_ground_y = int(original_ground_y_full * scale_factor)
            new_center_x = int(car_center_x_full * scale_factor)

            # Debug Lines
            cv2.line(resized_img, (0, new_ground_y), (resized_img.shape[1], new_ground_y), (0, 255, 0), 2)
            cv2.rectangle(resized_img, 
                          (int(x_tight * scale_factor), int(y_tight * scale_factor)), 
                          (int((x_tight + w_tight) * scale_factor), int((y_tight + h_tight) * scale_factor)), 
                          (255, 0, 0), 2)

            final_img = np.ones((target_h, target_w, 3), dtype=np.uint8) * 255

            top_y = new_ground_y - ground_pos_y
            bottom_y = top_y + target_h
            left_x = new_center_x - (target_w // 2)
            right_x = left_x + target_w

            src_top = max(0, top_y)
            src_bottom = min(resized_img.shape[0], bottom_y)
            src_left = max(0, left_x)
            src_right = min(resized_img.shape[1], right_x)

            dst_top = max(0, -top_y)
            dst_bottom = dst_top + (src_bottom - src_top)
            dst_left = max(0, -left_x)
            dst_right = dst_left + (src_right - src_left)

            if src_bottom > src_top and src_right > src_left:
                final_img[dst_top:dst_bottom, dst_left:dst_right] = resized_img[src_top:src_bottom, src_left:src_right]

        cv2.line(final_img, (0, ground_pos_y), (target_w, ground_pos_y), (0, 0, 255), 1)

        # Save with the method name appended
        out_name = f"{base_filename}_{method}.jpg"
        out_path = os.path.join(output_dir, out_name)
        cv2.imwrite(out_path, final_img)
        
    print(f"Processed test batch for: {base_filename}")

# --- Execution ---
if __name__ == "__main__":
    INPUT_DIR = './test_cars'
    OUTPUT_DIR = './test_bench_results'
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    image_files = glob.glob(os.path.join(INPUT_DIR, '*.jpg'))
    
    print(f"Found {len(image_files)} images. Starting test bench...")
    
    for img_file in image_files:
        test_standardize_car(img_file, OUTPUT_DIR)
        
    print("Test bench complete. Check output directory for comparisons.")