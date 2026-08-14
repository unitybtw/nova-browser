import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_dmg_background():
    # 2x Retina dimensions: 1320 x 880 (Base 1x is 660 x 440)
    w, h = 1320, 880
    img = Image.new('RGBA', (w, h), (10, 13, 22, 255))
    draw = ImageDraw.Draw(img)

    # 1. Background Gradient (Dark OLED Midnight)
    for y in range(h):
        ratio = y / h
        r = int(12 * (1 - ratio) + 4 * ratio)
        g = int(16 * (1 - ratio) + 6 * ratio)
        b = int(28 * (1 - ratio) + 12 * ratio)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))

    # 2. Ambient Nebula Radial Glows
    glow_layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)

    # Cyan ambient glow on left
    glow_draw.ellipse([200, 280, 520, 600], fill=(6, 182, 212, 45))
    # Indigo ambient glow on right
    glow_draw.ellipse([800, 280, 1120, 600], fill=(99, 102, 241, 45))
    # Center connecting stream
    glow_draw.ellipse([450, 360, 870, 520], fill=(59, 130, 246, 35))

    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(80))
    img.paste(Image.alpha_composite(Image.new('RGBA', (w, h), (0,0,0,0)), glow_layer), (0, 0), glow_layer)

    draw = ImageDraw.Draw(img)

    # 3. Micro Grid Pattern for Technical Depth
    grid_color = (255, 255, 255, 6)
    grid_spacing = 40
    for x in range(0, w, grid_spacing):
        draw.line([(x, 0), (x, h)], fill=grid_color)
    for y in range(0, h, grid_spacing):
        draw.line([(0, y), (w, y)], fill=grid_color)

    # 4. Target Pods (Left for App, Right for Applications)
    # Left Pod at (360, 440) -> 1x (180, 220)
    left_cx, left_cy = 360, 440
    # Right Pod at (960, 440) -> 1x (480, 220)
    right_cx, right_cy = 960, 440
    pod_r = 130

    # Draw left pod ring
    draw.ellipse([left_cx - pod_r, left_cy - pod_r, left_cx + pod_r, left_cy + pod_r], 
                 outline=(6, 182, 212, 60), width=3)
    draw.ellipse([left_cx - pod_r + 6, left_cy - pod_r + 6, left_cx + pod_r - 6, left_cy + pod_r - 6], 
                 fill=(6, 182, 212, 12))

    # Draw right pod ring
    draw.ellipse([right_cx - pod_r, right_cy - pod_r, right_cx + pod_r, right_cy + pod_r], 
                 outline=(99, 102, 241, 60), width=3)
    draw.ellipse([right_cx - pod_r + 6, right_cy - pod_r + 6, right_cx + pod_r - 6, right_cy + pod_r - 6], 
                 fill=(99, 102, 241, 12))

    # 5. Connecting Cyber Directional Arrow
    # Arrow line from x=530 to x=790 at y=440
    arrow_y = 440
    arrow_start_x = 530
    arrow_end_x = 790

    # Glow line behind arrow
    draw.line([(arrow_start_x, arrow_y), (arrow_end_x, arrow_y)], fill=(56, 189, 248, 120), width=6)
    
    # Arrowhead
    arrow_head_size = 28
    draw.polygon([
        (arrow_end_x + 12, arrow_y),
        (arrow_end_x - arrow_head_size, arrow_y - arrow_head_size),
        (arrow_end_x - arrow_head_size + 8, arrow_y),
        (arrow_end_x - arrow_head_size, arrow_y + arrow_head_size)
    ], fill=(56, 189, 248, 220))

    # Subtle pulse dots along arrow
    for dx in [570, 620, 670, 720]:
        draw.ellipse([dx - 5, arrow_y - 5, dx + 5, arrow_y + 5], fill=(255, 255, 255, 200))

    # 6. Typography
    try:
        # Load system font on macOS
        font_title = ImageFont.truetype("/System/Library/Fonts/SFPro-Bold.ttf", 44)
        font_subtitle = ImageFont.truetype("/System/Library/Fonts/SFPro-Regular.ttf", 24)
        font_label = ImageFont.truetype("/System/Library/Fonts/SFPro-Medium.ttf", 26)
    except:
        try:
            font_title = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 44)
            font_subtitle = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 24)
            font_label = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 26)
        except:
            font_title = ImageFont.load_default()
            font_subtitle = ImageFont.load_default()
            font_label = ImageFont.load_default()

    # Title: "Install Nova Browser"
    title_text = "Install Nova Browser"
    title_bbox = draw.textbbox((0, 0), title_text, font=font_title)
    title_w = title_bbox[2] - title_bbox[0]
    draw.text(((w - title_w) // 2, 110), title_text, fill=(255, 255, 255, 240), font=font_title)

    # Subtitle: "Drag Nova Browser into the Applications folder to install"
    sub_text = "Drag Nova Browser into Applications to begin"
    sub_bbox = draw.textbbox((0, 0), sub_text, font=font_subtitle)
    sub_w = sub_bbox[2] - sub_bbox[0]
    draw.text(((w - sub_w) // 2, 175), sub_text, fill=(148, 163, 184, 200), font=font_subtitle)

    # Labels below pods
    lbl1 = "Nova Browser"
    lbl1_bbox = draw.textbbox((0, 0), lbl1, font=font_label)
    lbl1_w = lbl1_bbox[2] - lbl1_bbox[0]
    draw.text((left_cx - lbl1_w // 2, 600), lbl1, fill=(203, 213, 225, 200), font=font_label)

    lbl2 = "Applications"
    lbl2_bbox = draw.textbbox((0, 0), lbl2, font=font_label)
    lbl2_w = lbl2_bbox[2] - lbl2_bbox[0]
    draw.text((right_cx - lbl2_w // 2, 600), lbl2, fill=(203, 213, 225, 200), font=font_label)

    # Save 2x Retina image
    out_dir = '/Users/siracsimsek/Desktop/novabrowser/build'
    img.save(os.path.join(out_dir, 'dmg-background@2x.png'), 'PNG', dpi=(144, 144))

    # Save 1x Standard image
    img_1x = img.resize((660, 440), Image.Resampling.LANCZOS)
    img_1x.save(os.path.join(out_dir, 'dmg-background.png'), 'PNG', dpi=(72, 72))

    print("✓ Successfully generated dmg-background.png (660x440) and dmg-background@2x.png (1320x880)!")

if __name__ == '__main__':
    create_dmg_background()
