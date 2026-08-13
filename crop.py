import sys
from PIL import Image

img = Image.open('website/public/browser-assets/hero-mockup-new.png')
w, h = img.size

# Split view (Center)
img.crop((w*0.2, h*0.2, w*0.8, h*0.8)).convert('RGB').save('website/public/browser-assets/mockup-split.jpg', quality=95)

# Tabs (Left Sidebar area)
img.crop((0, 0, w*0.3, h*0.6)).convert('RGB').save('website/public/browser-assets/mockup-tabs.jpg', quality=95)

# AI Sidebar (Right area)
img.crop((w*0.7, 0, w, h*0.7)).convert('RGB').save('website/public/browser-assets/mockup-ai.jpg', quality=95)

# Shield (Top left area)
img.crop((w*0.1, 0, w*0.4, h*0.3)).convert('RGB').save('website/public/browser-assets/mockup-shield.jpg', quality=95)

