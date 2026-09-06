"""Batch-scans a folder of (1).jpg side-profile photos for wheel-line tilt,
using wheel_leveling.py's detector. Built for running in short, resumable
sessions rather than one long unattended job:

    py scripts/scan_wheel_angles.py                  # process the next batch
    py scripts/scan_wheel_angles.py --batch-size 500  # bigger/smaller batch
    py scripts/scan_wheel_angles.py --report-only     # just rebuild the report

Progress prints to the terminal as it runs (every 25 files) so you can watch it
live instead of it running invisibly. Each run appends to wheel_level_test/
all_angles.csv and skips files already recorded there UNLESS the file on disk
has changed since -- size and modified-time are stored per row, so overwriting
"100 (1).jpg" with a freshly reprocessed photo (same filename, new content)
gets picked up as new work automatically, not silently skipped. Stopping
(Ctrl+C) and re-running later picks up where it left off -- nothing is lost
and nothing gets reprocessed unnecessarily. A rescanned file's old row is kept
in the CSV (it's an append-only log) but the report/skip-check only ever use
the latest row per filename. The markdown report is rebuilt from the full
accumulated CSV at the end of every run, so it always reflects everything
scanned so far, not just the current batch.

Each row is one of:
  - confident:      trust the angle
  - low confidence: the detector isn't sure (see wheel_leveling.py's docstring
                     for known weak spots -- light-colored rims, black-on-black
                     cars); open the image and judge for yourself
  - skipped:        no car/wheels found at all; not tilt data either way
"""
import argparse
import csv
import os
import sys
import time
import glob

import cv2

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wheel_leveling as WL

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SRC = r'D:\Diecast\Side (1)'
DEFAULT_OUT = os.path.join(REPO_ROOT, 'wheel_level_test')

CSV_COLUMNS = ['filename', 'file_size', 'file_mtime', 'angle_deg', 'confident', 'weakest_param2', 'clamped', 'radius_ratio', 'status']


def latest_rows_by_filename(csv_path):
    """The CSV is append-only, so a rescanned file has multiple rows -- this
    keeps only the most recent one per filename (last one wins, since rows are
    appended in chronological order)."""
    latest = {}
    if not os.path.exists(csv_path):
        return latest
    with open(csv_path, newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            latest[row['filename']] = row
    return latest


def needs_scan(path, recorded_row):
    """True if this file has never been scanned, or has been overwritten with
    different content since its last scan (by size and/or modified-time --
    either changing is enough to trigger a rescan)."""
    if recorded_row is None:
        return True
    current_size = str(os.path.getsize(path))
    current_mtime = str(os.path.getmtime(path))
    return recorded_row.get('file_size') != current_size or recorded_row.get('file_mtime') != current_mtime


def append_rows(csv_path, rows):
    is_new = not os.path.exists(csv_path)
    with open(csv_path, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        if is_new:
            writer.writerow(CSV_COLUMNS)
        writer.writerows(rows)


def read_all_rows(csv_path):
    confident, low_conf, failed = [], [], []
    for row in latest_rows_by_filename(csv_path).values():
        if row['status'] != 'ok':
            failed.append(row)
        elif row['confident'] == 'True':
            confident.append(row)
        else:
            low_conf.append(row)
    return confident, low_conf, failed


def write_report(report_path, csv_path, total_files):
    confident, low_conf, failed = read_all_rows(csv_path)
    confident.sort(key=lambda r: abs(float(r['angle_deg'])), reverse=True)
    low_conf.sort(key=lambda r: abs(float(r['angle_deg'])), reverse=True)

    with open(report_path, 'w', encoding='utf-8') as f:
        f.write('# Uncorrected wheel-line angle report\n\n')
        f.write(f'{len(confident) + len(low_conf) + len(failed)} of {total_files} photos scanned so far -- '
                f'{len(confident)} confident, {len(low_conf)} low-confidence, {len(failed)} skipped.\n\n')

        f.write('## Most tilted -- CONFIDENT (top 50)\n\n')
        f.write('| Rank | File | Angle (deg) |\n|---|---|---|\n')
        for rank, row in enumerate(confident[:50], 1):
            f.write(f"| {rank} | {row['filename']} | {float(row['angle_deg']):+.2f} |\n")

        f.write('\n## Most tilted -- LOW CONFIDENCE, verify visually (top 50)\n\n')
        f.write('| Rank | File | Angle (deg) | weakest param2 | clamped | radius ratio |\n|---|---|---|---|---|---|\n')
        for rank, row in enumerate(low_conf[:50], 1):
            f.write(f"| {rank} | {row['filename']} | {float(row['angle_deg']):+.2f} | "
                    f"{row['weakest_param2']} | {row['clamped']} | {row['radius_ratio']} |\n")

        f.write('\n## Distribution (confident only)\n\n')
        buckets = [(0.5, 0), (1.0, 0), (2.0, 0), (3.0, 0), (5.0, 0), (999, 0)]
        for row in confident:
            a = abs(float(row['angle_deg']))
            for idx, (thresh, _) in enumerate(buckets):
                if a <= thresh:
                    buckets[idx] = (thresh, buckets[idx][1] + 1)
                    break
        prev = 0
        for thresh, count in buckets:
            label = f'{prev}-{thresh} deg' if thresh != 999 else f'>{prev} deg'
            f.write(f'- {label}: {count}\n')
            prev = thresh

        if failed:
            f.write(f'\n## Skipped entirely ({len(failed)})\n\nSee all_angles.csv for reasons.\n')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--src', default=DEFAULT_SRC, help='folder of (1).jpg photos to scan')
    ap.add_argument('--out-dir', default=DEFAULT_OUT, help='where to write the CSV and report')
    ap.add_argument('--batch-size', type=int, default=300, help='how many NEW files to process this run (0 = all remaining)')
    ap.add_argument('--report-only', action='store_true', help='skip scanning, just rebuild the report from the existing CSV')
    args = ap.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)
    csv_path = os.path.join(args.out_dir, 'all_angles.csv')
    report_path = os.path.join(args.out_dir, 'worst_offenders_report.md')

    all_files = sorted(glob.glob(os.path.join(args.src, '*(1).jpg')))
    if not all_files:
        print(f'No (1).jpg files found in {args.src}')
        return

    recorded = latest_rows_by_filename(csv_path)
    remaining = [p for p in all_files if needs_scan(p, recorded.get(os.path.basename(p)))]
    changed_n = sum(1 for p in remaining if os.path.basename(p) in recorded)
    up_to_date_n = len(all_files) - len(remaining)
    note = f' ({changed_n} of those were previously scanned but changed on disk)' if changed_n else ''
    print(f'{len(all_files)} total, {up_to_date_n} up to date, {len(remaining)} remaining{note}.', flush=True)

    if args.report_only:
        write_report(report_path, csv_path, len(all_files))
        print(f'Rebuilt {report_path} from existing results.')
        return

    if not remaining:
        print('Nothing left to scan. Rebuilding report just in case.')
        write_report(report_path, csv_path, len(all_files))
        return

    batch = remaining if args.batch_size <= 0 else remaining[:args.batch_size]
    print(f'Processing {len(batch)} file(s) this run...', flush=True)

    rows_buffer = []
    t0 = time.time()
    confident_n = low_conf_n = failed_n = 0

    try:
        for i, path in enumerate(batch):
            fname = os.path.basename(path)
            # Read size/mtime before processing so a row always identifies exactly
            # which version of the file was measured, even if it's edited again later.
            file_size = os.path.getsize(path)
            file_mtime = os.path.getmtime(path)
            img = cv2.imread(path)
            if img is None:
                rows_buffer.append([fname, file_size, file_mtime, '', '', '', '', '', 'could not read image'])
                failed_n += 1
            else:
                angle, reason, debug = WL.measure_angle(img)
                if reason:
                    rows_buffer.append([fname, file_size, file_mtime, '', '', '', '', '', reason])
                    failed_n += 1
                else:
                    rows_buffer.append([
                        fname, file_size, file_mtime, f'{angle:.3f}', debug['confident'], debug['weakest_param2'],
                        debug['clamped'], f"{debug['radius_ratio']:.2f}", 'ok',
                    ])
                    if debug['confident']:
                        confident_n += 1
                    else:
                        low_conf_n += 1

            if (i + 1) % 25 == 0 or (i + 1) == len(batch):
                elapsed = time.time() - t0
                rate = (i + 1) / elapsed if elapsed > 0 else 0
                eta = (len(batch) - (i + 1)) / rate if rate > 0 else 0
                print(f'  [{i+1}/{len(batch)}] this run: confident={confident_n} low_conf={low_conf_n} '
                      f'failed={failed_n}  |  {rate:.2f} img/s, eta {eta:.0f}s', flush=True)
    finally:
        # Always save whatever was completed, even on Ctrl+C -- a partial batch
        # is still real progress and shouldn't be thrown away.
        if rows_buffer:
            append_rows(csv_path, rows_buffer)
            write_report(report_path, csv_path, len(all_files))

    total_done = len(latest_rows_by_filename(csv_path))
    print(f'\nDone. {total_done}/{len(all_files)} up to date ({len(all_files) - total_done} remaining).', flush=True)
    print(f'Report: {report_path}', flush=True)
    if total_done < len(all_files):
        print('Run this script again to continue with the next batch.', flush=True)


if __name__ == '__main__':
    main()
