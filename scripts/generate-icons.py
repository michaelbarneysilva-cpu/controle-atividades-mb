from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BACKGROUND_COLOR = (47, 129, 247)  # #2f81f7
TEXT_COLOR = (255, 255, 255)
SIZES = (192, 512)
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "icons"


def generate_icon(size):
    image = Image.new("RGB", (size, size), BACKGROUND_COLOR)
    draw = ImageDraw.Draw(image)

    font = ImageFont.load_default(size=int(size * 0.55))
    text = "M"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    position = ((size - text_width) / 2 - bbox[0], (size - text_height) / 2 - bbox[1])
    draw.text(position, text, fill=TEXT_COLOR, font=font)

    return image


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)
    for size in SIZES:
        icon = generate_icon(size)
        icon.save(OUTPUT_DIR / f"icon-{size}.png")


if __name__ == "__main__":
    main()
