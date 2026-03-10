#!/usr/bin/env python3
"""
parse_emotibit_markers.py

Parse LSL event markers from an EmotiBit ground truth CSV file.

Usage:
    cd /path/to/subject/data/folder
    python parse_emotibit_markers.py <ground_truth_filename.csv>

Output:
    A CSV file in the current directory named:
    <YYYYMMDD_HHMMSS>_<subject_id>_emotibit_LSL_event_markers.csv

    Where subject_id is inferred from the ground truth filename
    (expected format: <timestamp>_<subject_id>_emotibit_ground_truth.csv).
    Falls back to 'unknown' if the filename does not match.
"""

import sys
import os
import csv
from datetime import datetime


def infer_subject_id(filename):
    base = os.path.basename(filename)
    parts = base.split('_')
    # Expected: <timestamp>_<subject_id>_emotibit_ground_truth.csv
    # Timestamp occupies parts[0] and parts[1], subject_id is parts[2]
    if len(parts) >= 3:
        return parts[2]
    return 'unknown'


def parse_markers(ground_truth_file):
    markers = []
    lines_checked = 0

    with open(ground_truth_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith(('%', '#')):
                continue

            parts = line.split(',')
            while parts and parts[-1].strip() == '':
                parts.pop()

            if len(parts) < 8 or parts[3].strip() != 'LM':
                continue

            lines_checked += 1
            payload = {}
            i = 6
            while i + 1 < len(parts):
                key = parts[i].strip()
                value = parts[i + 1].strip()
                if key:
                    payload[key] = value
                i += 2

            if 'LD' not in payload:
                continue

            try:
                markers.append({
                    'EmotiBitTimestamp': int(parts[0].strip()),
                    'PacketNumber': int(parts[1].strip()),
                    'LslLocalTimestamp': float(payload.get('LC', 0)),
                    'LslMarkerSourceTimestamp': float(payload.get('LM', 0)),
                    'LslMarkerRxTimestamp': float(payload.get('LR', 0)),
                    'MarkerData': payload['LD']
                })
            except (ValueError, IndexError) as e:
                print(f"Skipping malformed LM line: {e}")
                continue

    return markers, lines_checked


def write_output(markers, subject_id, output_dir):
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_filename = f"{timestamp}_{subject_id}_emotibit_LSL_event_markers.csv"
    output_filepath = os.path.join(output_dir, output_filename)

    fieldnames = [
        'EmotiBitTimestamp', 'PacketNumber', 'LslLocalTimestamp',
        'LslMarkerSourceTimestamp', 'LslMarkerRxTimestamp', 'MarkerData'
    ]

    with open(output_filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(markers)

    return output_filepath


def main():
    if len(sys.argv) != 2:
        print("Usage: python parse_emotibit_markers.py <ground_truth_filename.csv>")
        sys.exit(1)

    input_file = sys.argv[1]

    if not os.path.isabs(input_file):
        input_file = os.path.join(os.getcwd(), input_file)

    if not os.path.exists(input_file):
        print(f"Error: File not found: {input_file}")
        sys.exit(1)

    if not input_file.lower().endswith('.csv'):
        print("Error: Input file must be a CSV file.")
        sys.exit(1)

    subject_id = infer_subject_id(input_file)
    output_dir = os.path.dirname(input_file)

    print(f"Parsing: {input_file}")
    print(f"Subject ID: {subject_id}")

    markers, lines_checked = parse_markers(input_file)

    print(f"Scanned {lines_checked} LM-type lines, found {len(markers)} markers with LD payload.")

    if not markers:
        print("No LSL markers with marker data (LD field) were found.")
        print("Verify this is the correct ground truth CSV from EmotiBit DataParser.")
        sys.exit(1)

    output_filepath = write_output(markers, subject_id, output_dir)
    print(f"Output written to: {output_filepath}")


if __name__ == '__main__':
    main()