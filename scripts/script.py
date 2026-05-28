import cv2
import numpy as np
import os
import glob

def adjust_exposure_and_wb(img, bg_mask, target_bg_l=245.0):
    """
    Adjusts white balance AND standardizes the exposure so the background 
    always matches a specific target brightness (target_bg_l).
    """
    # Convert to float32 to prevent math underflow/overflow 
    result = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    
    # Calculate the average Lightness, A, and B channel values of the background
    avg_l = cv2.mean(result[:, :, 0], mask=bg_mask)[0]
    avg_a = cv2.mean(result[:, :, 1], mask=bg_mask)[0]
    avg_b = cv2.mean(result[:, :, 2], mask=bg_mask)[0]
    
    # 1. COLOR: Shift the A and B channels back towards neutral gray
    result[:, :, 1] = result[:, :, 1] - ((avg_a - 128) * (result[:, :, 0] / 255.0) * 1.1)
    result[:, :, 2] = result[:, :, 2] - ((avg_b - 128) * (result[:, :, 0] / 255.0) * 1.1)
    
    # 2. BRIGHTNESS: Scale the Lightness channel so the background hits our target
    if avg_l > 0:
        gain = target_bg_l / avg_l
        result[:, :, 0] = result[:, :, 0] * gain
    
    # Clip values back to valid 8-bit range and convert back to BGR
    result = np.clip(result, 0, 255).astype(np.uint8)
    return cv2.cvtColor(result, cv2.COLOR_LAB2BGR)

def standardize_car_image(img_path, output_dir, target_w=800, target_h=300, ground_pos_y=280, debug=True):
    filename = os.path.basename(img_path)
    out_path = os.path.join(output_dir, filename)
    
    if os.path.exists(out_path):
        print(f"Skipping {filename}, already exists in output directory.")
        return

    # 1. Read the image
    img = cv2.imread(img_path)
    if img is None:
        print(f"Error reading {img_path}")
        return

    # --- Preliminary pass for Background Mask ---
    gray_raw = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred_raw = cv2.GaussianBlur(gray_raw, (7, 7), 0)
    _, car_mask_raw = cv2.threshold(blurred_raw, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    bg_mask = cv2.bitwise_not(car_mask_raw)

    # 2. Adjust Exposure and White Balance
    img_wb = adjust_exposure_and_wb(img, bg_mask)

    # --- 3. Detect the Car (HYBRID FUSION APPROACH) ---
    gray = cv2.cvtColor(img_wb, cv2.COLOR_BGR2GRAY)
    
    # MASK A: Otsu (Trust this strictly for the Ground Line / Tires)
    blurred_otsu = cv2.GaussianBlur(gray, (7, 7), 0)
    _, thresh_otsu = cv2.threshold(blurred_otsu, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    contours_o, _ = cv2.findContours(thresh_otsu, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    valid_o = [c for c in contours_o if cv2.contourArea(c) > 500]
    if not valid_o:
        print(f"Could not detect dark mass in {img_path}")
        return
        
    car_contour_o = max(valid_o, key=cv2.contourArea)
    xo, yo, wo, ho = cv2.boundingRect(car_contour_o)
    ground_y_otsu = yo + ho 
    
    # MASK B: CLAHE + Canny (Trust this for the Top and Sides)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    cl_gray = clahe.apply(gray)
    blurred_canny = cv2.GaussianBlur(cl_gray, (5, 5), 0)
    edges = cv2.Canny(blurred_canny, 20, 100)
    
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 9))
    thresh_canny = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
    
    contours_c, _ = cv2.findContours(thresh_canny, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    valid_c = [c for c in contours_c if cv2.contourArea(c) > 500]
    
    if not valid_c:
        print(f"Could not detect edges in {img_path}")
        return
        
    car_contour_c = max(valid_c, key=cv2.contourArea)
    xc, yc, wc, hc = cv2.boundingRect(car_contour_c)

    # -- THE FUSION --
    x_tight = min(xc, xo)
    y_tight = min(yc, yo)
    right_x = max(xc + wc, xo + wo)
    w_tight = right_x - x_tight
    h_tight = ground_y_otsu - y_tight # Strict adherence to Otsu's bottom

    # 4. Check Scale and Determine Pipeline
    scale_factor = (target_w * 0.8) / w_tight 
    scaled_h_car = h_tight * scale_factor

    max_allowed_h = ground_pos_y - 20
    is_tall = scaled_h_car >= max_allowed_h

    # ==========================================
    # PIPELINE A: TALL CARS (120px Crop & 4-Way Replicate)
    # ==========================================
    if is_tall:
        scale_factor = max_allowed_h / h_tight
        
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

        resized_img = cv2.resize(source_img, (0, 0), fx=scale_factor, fy=scale_factor)
        new_ground_y = int(original_ground_y * scale_factor)
        new_center_x = int(car_center_x * scale_factor)

        pad_top = int(ground_pos_y - new_ground_y)
        pad_bottom = int((target_h - ground_pos_y) - (resized_img.shape[0] - new_ground_y))
        pad_left = int((target_w // 2) - new_center_x)
        pad_right = int((target_w - (target_w // 2)) - (resized_img.shape[1] - new_center_x))

        crop_top = int(max(0, -pad_top))
        crop_bottom = int(resized_img.shape[0] - max(0, -pad_bottom))
        crop_left = int(max(0, -pad_left))
        crop_right = int(resized_img.shape[1] - max(0, -pad_right))

        final_source_img = resized_img[crop_top:crop_bottom, crop_left:crop_right]

        final_img = cv2.copyMakeBorder(
            final_source_img, 
            int(max(0, pad_top)), int(max(0, pad_bottom)), int(max(0, pad_left)), int(max(0, pad_right)), 
            cv2.BORDER_REPLICATE
        )

        if debug:
            final_x = int(car_box_x_src * scale_factor) + pad_left
            final_y = int(car_box_y_src * scale_factor) + pad_top
            final_w = int(w_tight * scale_factor)
            final_h = int(h_tight * scale_factor)
            
            cv2.rectangle(final_img, (final_x, final_y), (final_x + final_w, final_y + final_h), (255, 0, 0), 2)
            cv2.line(final_img, (0, ground_pos_y), (target_w, ground_pos_y), (0, 255, 0), 2)

    # ==========================================
    # PIPELINE B: SHORT CARS (No Crop, L/R Replicate Only)
    # ==========================================
    else:
        # Scale the FULL white-balanced/exposure-fixed image
        original_ground_y = y_tight + h_tight
        car_center_x = x_tight + (w_tight // 2)

        resized_img = cv2.resize(img_wb, (0, 0), fx=scale_factor, fy=scale_factor)
        new_ground_y = int(original_ground_y * scale_factor)
        new_center_x = int(car_center_x * scale_factor)

        pad_top = int(ground_pos_y - new_ground_y)
        pad_bottom = int((target_h - ground_pos_y) - (resized_img.shape[0] - new_ground_y))
        pad_left = int((target_w // 2) - new_center_x)
        pad_right = int((target_w - (target_w // 2)) - (resized_img.shape[1] - new_center_x))

        # 1. Slice off excess image if it extends beyond the 800x300 target
        crop_top = int(max(0, -pad_top))
        crop_bottom = int(resized_img.shape[0] - max(0, -pad_bottom))
        crop_left = int(max(0, -pad_left))
        crop_right = int(resized_img.shape[1] - max(0, -pad_right))

        sliced_img = resized_img[crop_top:crop_bottom, crop_left:crop_right]

        actual_pad_top = int(max(0, pad_top))
        actual_pad_bottom = int(max(0, pad_bottom))
        actual_pad_left = int(max(0, pad_left))
        actual_pad_right = int(max(0, pad_right))

        # 2. Step A: Replicate LEFT and RIGHT edges only
        temp_img = cv2.copyMakeBorder(
            sliced_img, 
            0, 0, actual_pad_left, actual_pad_right, 
            cv2.BORDER_REPLICATE
        )

        # 3. Step B: Pad TOP and BOTTOM
        # We target L=245, which translates perfectly to RGB 245,245,245
        final_img = cv2.copyMakeBorder(
            temp_img, 
            actual_pad_top, actual_pad_bottom, 0, 0, 
            cv2.BORDER_CONSTANT, value=[245, 245, 245] 
        )

        if debug:
            final_x = int(x_tight * scale_factor) + pad_left
            final_y = int(y_tight * scale_factor) + pad_top
            final_w = int(w_tight * scale_factor)
            final_h = int(h_tight * scale_factor)
            
            cv2.rectangle(final_img, (final_x, final_y), (final_x + final_w, final_y + final_h), (255, 0, 0), 2)
            cv2.line(final_img, (0, ground_pos_y), (target_w, ground_pos_y), (0, 255, 0), 2)

    # --- DEBUG: Target standardization line ---
    if debug:
        cv2.line(final_img, (0, ground_pos_y), (target_w, ground_pos_y), (0, 0, 255), 1)

    cv2.imwrite(out_path, final_img)
    print(f"Successfully processed: {filename} (Tall: {is_tall})")

if __name__ == "__main__":
    INPUT_DIR = './raw_cars'
    OUTPUT_DIR = './standard_cars'
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    image_files = glob.glob(os.path.join(INPUT_DIR, '*.jpg'))
    
    print(f"Found {len(image_files)} images. Starting processing...")
    
    for img_file in image_files:
        standardize_car_image(img_file, OUTPUT_DIR, debug=False)
        
    print("Batch processing complete.")