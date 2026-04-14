# Assets

Place the following files here before building:

| File | Size | Notes |
|------|------|-------|
| `icon.png` | 1024×1024 | App icon — no transparency, no rounded corners (iOS adds them) |
| `splash.png` | 1284×2778 | Splash screen — white background recommended |
| `adaptive-icon.png` | 1024×1024 | Android adaptive icon foreground |
| `favicon.png` | 48×48 | Web favicon |

## Quick placeholder generation

If you have ImageMagick installed:

```bash
# Purple background with heart emoji placeholder
convert -size 1024x1024 xc:#d946ef -fill white -pointsize 400 \
  -gravity center -annotate 0 "💜" icon.png

convert -size 1284x2778 xc:#ffffff -fill "#d946ef" -pointsize 200 \
  -gravity center -annotate 0 "💜" splash.png

cp icon.png adaptive-icon.png
convert -size 48x48 xc:#d946ef favicon.png
```

Or use [Expo's online icon generator](https://expo.dev/tools/icon) to upload a PNG and get all sizes.
