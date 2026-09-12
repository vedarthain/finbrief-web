#!/usr/bin/env bash
# chunk_pdf.sh — split an oversized e-paper PDF into page-range chunks
# each under a target size, so the Read tool's 100MB text-extraction
# ceiling is never hit (and so a single Read call can cover multiple
# printed pages instead of one call per page).
#
# Usage: chunk_pdf.sh <input.pdf> <output_dir> [max_mb]
#   max_mb defaults to 5 (MB). Uses poppler's pdfseparate + pdfunite,
# both already installed via `brew install poppler`.
#
# Output: <output_dir>/chunk-NN.pdf for each chunk, plus a manifest
# <output_dir>/manifest.txt listing "chunk-NN.pdf: pages A-B (size)".
#
# Page numbers in the manifest are the PDF's internal page index
# (1-based within this file) — apply the usual printed-page offset
# documented in SKILL.md §2 when mapping to the printed page number.

set -euo pipefail

INPUT="${1:?Usage: chunk_pdf.sh <input.pdf> <output_dir> [max_mb]}"
OUTDIR="${2:?Usage: chunk_pdf.sh <input.pdf> <output_dir> [max_mb]}"
MAX_MB="${3:-8}"
MAX_BYTES=$((MAX_MB * 1024 * 1024))

if [[ ! -f "$INPUT" ]]; then
  echo "Input file not found: $INPUT" >&2
  exit 1
fi

mkdir -p "$OUTDIR"
WORKDIR=$(mktemp -d /tmp/chunk_pdf_pages.XXXXXX)
trap 'rm -rf "$WORKDIR"' EXIT

echo "Splitting $INPUT into per-page files..." >&2
pdfseparate "$INPUT" "$WORKDIR/page-%04d.pdf"

MANIFEST="$OUTDIR/manifest.txt"
: > "$MANIFEST"

chunk_num=0
range_start=1
current_bytes=0
files_in_chunk=()

flush_chunk() {
  local range_end="$1"
  if [[ ${#files_in_chunk[@]} -eq 0 ]]; then
    return
  fi
  chunk_num=$((chunk_num + 1))
  local outfile
  outfile=$(printf "%s/chunk-%02d.pdf" "$OUTDIR" "$chunk_num")
  pdfunite "${files_in_chunk[@]}" "$outfile"
  local size_h
  size_h=$(du -h "$outfile" | awk '{print $1}')
  echo "$(basename "$outfile"): pages ${range_start}-${range_end} (${size_h})" >> "$MANIFEST"
  files_in_chunk=()
  current_bytes=0
  range_start=$((range_end + 1))
}

page_num=0
for f in "$WORKDIR"/page-*.pdf; do
  page_num=$((page_num + 1))
  size=$(stat -f%z "$f" 2>/dev/null || stat -c%s "$f")

  # If a single page alone exceeds max, flush what we have. A single PDF
  # page can't be split further, so rasterize it to a JPEG instead (much
  # smaller than the vector/high-res original, and still readable by the
  # Read tool's multimodal image support) rather than emitting an
  # oversized single-page PDF chunk.
  if (( size > MAX_BYTES )); then
    flush_chunk $((page_num - 1))
    chunk_num=$((chunk_num + 1))
    jpg_base=$(printf "%s/chunk-%02d" "$OUTDIR" "$chunk_num")
    pdftocairo -jpeg -r 100 -jpegopt quality=70 "$f" "$jpg_base"
    jpg_file="${jpg_base}-1.jpg"
    jpg_size_h=$(du -h "$jpg_file" | awk '{print $1}')
    echo "$(basename "$jpg_file"): pages ${page_num}-${page_num} (${jpg_size_h}, rasterized)" >> "$MANIFEST"
    range_start=$((page_num + 1))
    files_in_chunk=()
    current_bytes=0
    continue
  fi

  if (( current_bytes + size > MAX_BYTES && ${#files_in_chunk[@]} > 0 )); then
    flush_chunk $((page_num - 1))
  fi

  files_in_chunk+=("$f")
  current_bytes=$((current_bytes + size))
done

flush_chunk "$page_num"

echo "Done. $chunk_num chunk(s) written to $OUTDIR" >&2
cat "$MANIFEST" >&2
