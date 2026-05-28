#!/usr/bin/env python3
"""
Resize images proportionally from 800x300 to 400x150.
Usage: python resize_images.py [input_folder] [output_folder]
Defaults: input_folder=./images, output_folder=./resized_images
"""

import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow is not installed. Install it with: pip install Pillow")
    sys.exit(1)

# --- Configuration ---
TARGET_WIDTH = 400
TARGET_HEIGHT = 150
SUPPORTED_FORMATS = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp", ".tiff"}


def resize_images(input_dir: str, output_dir: str) -> None:
    input_path = Path(input_dir)
    output_path = Path(output_dir)

    if not input_path.exists():
        print(f"Error: Input folder '{input_dir}' does not exist.")
        sys.exit(1)

    output_path.mkdir(parents=True, exist_ok=True)

    image_files = [
        f for f in input_path.iterdir()
        if f.is_file() and f.suffix.lower() in SUPPORTED_FORMATS
    ]

    if not image_files:
        print(f"No supported images found in '{input_dir}'.")
        return

    print(f"Found {len(image_files)} image(s). Resizing to {TARGET_WIDTH}x{TARGET_HEIGHT}...\n")

    success, skipped, failed = 0, 0, 0

    for img_file in sorted(image_files):
        try:
            with Image.open(img_file) as img:
                orig_width, orig_height = img.size

                # Proportional resize: scale to fit within target dimensions
                scale = min(TARGET_WIDTH / orig_width, TARGET_HEIGHT / orig_height)
                new_width = round(orig_width * scale)
                new_height = round(orig_height * scale)

                resized = img.resize((new_width, new_height), Image.LANCZOS)

                out_file = output_path / img_file.name
                resized.save(out_file)

                print(f"  ✓ {img_file.name}: {orig_width}x{orig_height} → {new_width}x{new_height}")
                success += 1

        except Exception as e:
            print(f"  ✗ {img_file.name}: Failed — {e}")
            failed += 1

    print(f"\nDone: {success} resized, {skipped} skipped, {failed} failed.")
    print(f"Output saved to: {output_path.resolve()}")


if __name__ == "__main__":
    input_folder  = sys.argv[1] if len(sys.argv) > 1 else "./images"
    output_folder = sys.argv[2] if len(sys.argv) > 2 else "./resized_images"
    resize_images(input_folder, output_folder)