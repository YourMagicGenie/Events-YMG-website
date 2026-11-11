#!/usr/bin/env bash
set -euo pipefail

asset_dir="dist/assets"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

inkscape "$asset_dir/favicon.svg" --export-type=png --export-width=16 --export-height=16 --export-filename="$asset_dir/favicon-16.png" >/dev/null 2>&1
inkscape "$asset_dir/favicon.svg" --export-type=png --export-width=32 --export-height=32 --export-filename="$asset_dir/favicon-32.png" >/dev/null 2>&1
inkscape "$asset_dir/favicon.svg" --export-type=png --export-width=180 --export-height=180 --export-filename="$asset_dir/apple-touch-icon.png" >/dev/null 2>&1

for language in en it; do
  if [[ "$language" == "it" ]]; then
    source="$asset_dir/social-card-it.svg"
    output="$asset_dir/social-card-it.png"
  else
    source="$asset_dir/social-card.svg"
    output="$asset_dir/social-card.png"
  fi
  rendered="$tmp_dir/social-card-$language.png"
  inkscape "$source" --export-type=png --export-width=1200 --export-height=630 --export-filename="$rendered" >/dev/null 2>&1
  magick "$rendered" -background '#142724' -alpha remove -alpha off -strip -colors 256 -define png:compression-level=9 PNG8:"$output"
  cp "$output" "${output%.png}-v2.png"
done
