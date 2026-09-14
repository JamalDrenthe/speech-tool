---
name: jd-logo
description: Standardize Jamal Drenthe (JD) logo assets and usage across themes and interfaces. Use when adding, replacing, resizing, exporting, or reviewing any JD logo.
---

# JD Logo

Use one canonical JD mark and derive theme variants from it. Never resize or recolor the original artwork directly in a component.

## Canonical asset rules

- Keep the supplied artwork as the source of truth.
- Remove opaque black or white backgrounds before using the mark in a UI.
- Trim transparent padding, then export every variant to the same canvas: `256x162`.
- Preserve the original aspect ratio of the JD mark. Do not stretch it to fill a square.
- Keep the visible mark aligned to the same canvas bounds in every variant.
- Use transparent PNGs for UI placement:
  - `jdlogo-dark-transparent.png`: white mark for dark surfaces.
  - `jdlogo-mark-light.png`: dark `#17202b` mark for light surfaces.
- Keep the source artwork separately when it is needed for brand downloads or future derivations.

## Theme usage

Use separate image elements or an equivalent theme-aware source switch:

```tsx
<img
  src={theme === 'dark' ? '/jdlogo-dark-transparent.png' : '/jdlogo-mark-light.png'}
  alt="Jamal Drenthe"
  className="h-6 w-auto object-contain"
/>
```

- Use the same rendered height and `width: auto` in every theme.
- Do not use CSS `filter: invert()` as the primary light-theme solution; it can change anti-aliased edges and make variants appear different sizes.
- Keep the logo container background transparent when the logo should visually blend into the page.
- Do not add a visible border, frame, or contrasting tile around the logo unless the product specification explicitly requires one.
- If a container is necessary, match its background exactly to the surrounding surface and remove unintended shadows.

## Creating a variant

1. Inspect the source dimensions, alpha channel, and visible bounds.
2. Remove the background color with a small fuzz tolerance, usually `8–10%`.
3. Trim transparent padding, resize proportionally so it fits within `256x162`, then center it on a transparent `256x162` canvas.
4. For a dark variant, preserve the white mark and make the background transparent.
5. For a light variant, recolor the opaque mark to `#17202b` while preserving the alpha mask.
6. Compare both exported files on dark and light page backgrounds at the final rendered size.

ImageMagick example:

```bash
convert source.png -fuzz 10% -transparent black -trim +repage \
  -resize 256x162 -gravity center -background none -extent 256x162 \
  jdlogo-dark-transparent.png
convert jdlogo-dark-transparent.png -alpha extract /tmp/jdlogo-mask.png
convert -size 256x162 xc:'#17202b' /tmp/jdlogo-mask.png \
  -alpha off -compose CopyOpacity -composite jdlogo-mark-light.png
```

Use a persistent project path for intermediate files; do not commit temporary masks.

## Validation checklist

- Both variants are `256x162` and use the same visible crop.
- Dark mode shows a white JD mark without a rectangular image background.
- Light mode shows a dark JD mark without a rectangular image background.
- Both variants have the same apparent height and visual weight.
- The logo has no visible border, halo, frame, or mismatched background.
- Check the result at the actual header size in both themes.
- Run the project build after changing logo assets or component usage.
