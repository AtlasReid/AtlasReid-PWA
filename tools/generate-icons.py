"""Regenerate the AtlasReid app icons. Requires Pillow; no remote assets."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SCALE = 4
SIZE = 512 * SCALE
CREAM = "#f4f1e8"
TEAL = "#203733"

image = Image.new("RGB", (SIZE, SIZE), CREAM)
draw = ImageDraw.Draw(image)
inset = 80 * SCALE
draw.rounded_rectangle(
    (inset, inset, SIZE - inset, SIZE - inset),
    radius=70 * SCALE,
    fill=TEAL,
)
font_paths = [
    Path("C:/Windows/Fonts/georgiab.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"),
]
font_path = next((path for path in font_paths if path.exists()), None)
if not font_path:
    raise RuntimeError("Install a bold serif font, or set font_paths to its local file.")
font = ImageFont.truetype(str(font_path), 170 * SCALE)
box = draw.textbbox((0, 0), "AR", font=font)
x = (SIZE - (box[2] - box[0])) / 2 - box[0]
y = (SIZE - (box[3] - box[1])) / 2 - box[1] - 6 * SCALE
draw.text((x, y), "AR", font=font, fill=CREAM)
draw.rounded_rectangle(
    (190 * SCALE, 349 * SCALE, 322 * SCALE, 354 * SCALE),
    radius=2 * SCALE,
    fill=CREAM,
)
ASSETS.mkdir(exist_ok=True)
for name, size in [("icon-192.png", 192), ("icon-512.png", 512), ("apple-touch-icon.png", 180)]:
    output = ASSETS / name
    image.resize((size, size), Image.Resampling.LANCZOS).save(output, optimize=True)
    print(f"{output.name}: {size} x {size}")
