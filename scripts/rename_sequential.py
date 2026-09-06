"""
Renames a folder of JPGs into sequential "{id} (1).jpg" / "{id} (2).jpg" pairs.

Sorts every .jpg/.jpeg in <directory> by filename, then assigns them in pairs to
sequential integer IDs starting at <start_id>: 1st file -> "{start_id} (1).jpg",
2nd -> "{start_id} (2).jpg", 3rd -> "{start_id + 1} (1).jpg", 4th ->
"{start_id + 1} (2).jpg", etc.

Dry-run by default (just prints the plan) -- pass --apply to actually rename.

Usage:
    python scripts/rename_sequential.py <directory> <start_id>
    python scripts/rename_sequential.py <directory> <start_id> --apply
"""

import argparse
import os
import sys


def collect_jpgs(directory):
    files = [f for f in os.listdir(directory) if f.lower().endswith(('.jpg', '.jpeg'))]
    files.sort()
    return files


def plan_renames(files, start_id):
    plan = []
    for i, filename in enumerate(files):
        car_id = start_id + (i // 2)
        suffix = 1 if i % 2 == 0 else 2
        plan.append((filename, f"{car_id} ({suffix}).jpg"))
    return plan


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('directory', help="Folder containing the JPGs to rename")
    parser.add_argument('start_id', type=int, help="Starting integer ID (x) for the first pair")
    parser.add_argument('--apply', action='store_true', help="Actually rename files (default is dry-run/preview only)")
    args = parser.parse_args()

    if not os.path.isdir(args.directory):
        sys.exit(f"Not a directory: {args.directory}")

    files = collect_jpgs(args.directory)
    if not files:
        sys.exit("No .jpg/.jpeg files found.")

    plan = plan_renames(files, args.start_id)

    # Refuse if a destination name already exists and isn't itself one of the
    # files being renamed in this batch -- renaming is hard to undo once an
    # existing file gets silently overwritten.
    source_names = {old for old, _ in plan}
    conflicts = sorted({
        new for _, new in plan
        if new not in source_names and os.path.exists(os.path.join(args.directory, new))
    })
    if conflicts:
        sys.exit(f"Refusing to proceed -- these destination names already exist and would be overwritten: {conflicts}")

    print(f"{len(plan)} file(s) {'renamed' if args.apply else 'would be renamed'}:")
    for old, new in plan:
        print(f"  {old}  ->  {new}")

    if not args.apply:
        print("\nDry run only -- pass --apply to actually rename.")
        return

    # Two-pass rename via temp names, in case a source name and a target name
    # overlap within the same batch (e.g. one file's destination is another
    # file's current name).
    temps = []
    for old, new in plan:
        tmp_path = os.path.join(args.directory, f".tmp_rename_{old}")
        os.rename(os.path.join(args.directory, old), tmp_path)
        temps.append((tmp_path, new))
    for tmp_path, new in temps:
        os.rename(tmp_path, os.path.join(args.directory, new))

    print("\nDone.")


if __name__ == '__main__':
    main()
