# Nova Browser - Web V2 Design Specification

## Overview
A brand new, original, minimal, and dark-mode-centric landing page for the Nova Browser. The goal is to establish a premium, serious, and professional brand identity that highlights Nova's speed, local AI, and privacy features.

## Design System (ui-ux-pro-max)
- **Pattern**: Minimal Single Column (Software Hero)
- **Style**: Dark Mode (OLED) - Deep blacks, high contrast, low light emission.
- **Typography**: Inter (Clean, swiss, functional, professional).
- **Core Colors**:
  - Background: `#000000` (True OLED Black)
  - Foreground: `#FFFFFF` (White text)
  - Accent/Primary: `#1E3A5F` (Navy) & `#059669` (Green for paid/secure features) or a glowing white/gray for minimal aesthetic.
  - Muted: `#A1A1AA` (Zinc 400 for secondary text)
  - Border: `#27272A` (Zinc 800)

## Page Structure

### 1. Navigation (Navbar)
- **Layout**: Fixed top, transparent background with slight blur (backdrop-filter) on scroll.
- **Left**: Minimal Nova Logo (Text or SVG).
- **Right**: "Download" CTA Button (Solid white background, black text).

### 2. Hero Section
- **Visuals**: Center-aligned.
- **Headline**: Massive, bold Inter typography (e.g., "The Internet, Darker & Faster").
- **Subheadline**: Gray/Muted text briefly explaining local AI and ad-blocking.
- **CTA**: Primary download button.
- **Mockup**: A large, slightly tilted or perfectly centered mockup of the Nova Browser glowing against the dark background. 

### 3. Features (Scroll Reveal)
- **Interaction**: Features fade in and slide up as the user scrolls down (using Framer Motion).
- **Feature 1**: Local AI (Yerel Yapay Zeka) - Emphasize privacy and speed.
- **Feature 2**: Ad-blocker & Privacy (Gizlilik) - Clean the web, no tracking.
- **Feature 3**: Split View (Bölünmüş Ekran) - Multitasking made easy.
- **Layout**: Zig-zag or grid layout for features, large typography, simple icons/videos.

### 4. Footer
- **Layout**: Extremely minimal.
- **Content**: Copyright, links to Privacy Policy, Terms, and social media.

## Technical Stack constraints
- **Framework**: React (Next.js or Vite). The user requested "ayrı biryerde yap" (in a separate place), so we will scaffold a new Next.js project.
- **Styling**: Tailwind CSS.
- **Animations**: Framer Motion.
- **Icons**: Phosphor Icons (`@phosphor-icons/react`) or Lucide.

## Anti-patterns to Avoid
- **DO NOT** use light mode as default.
- **DO NOT** clutter the UI with unnecessary links or drop-downs.
- **DO NOT** use emojis as icons.
- **DO NOT** compromise on performance; ensure animations are smooth (60fps).
