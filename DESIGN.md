# KZubZone Design System (DESIGN.md)
*Synthesized from Taste-Skill, Impeccable, and Awesome-Design-MD standards.*

## 1. Aesthetic Identity & Theme
- **Philosophy**: Luxury Korean Entertainment & Subtitle Platform.
- **Mood**: Cinematic, Ultra-Dark, Sleek, Precision-Crafted (Linear + Apple TV + Netflix Dark).
- **Surface Palette**:
  - `bg-luxury-950`: `#030008` (Obsidian Canvas)
  - `bg-luxury-900`: `#080414` (Deep Layered Card Base)
  - `bg-luxury-800`: `#120926` (Elevated Popovers & Modals)
  - `border-subtle`: `rgba(255, 255, 255, 0.07)` (Hairline Precision Borders)
  - `border-focus`: `rgba(139, 92, 246, 0.45)` (Neon Violet Accent)
- **Accents**:
  - Primary: `#8b5cf6` (Electric Violet)
  - Secondary: `#ec4899` (Hot Pink / Magenta)
  - Amber: `#f59e0b` (IMDB / Golden Star Glow)
  - Emerald: `#10b981` (Approved / Success Status)

## 2. Typography & Hierarchy
- **Primary Body**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
- **Display Headings**: `Outfit`, `sans-serif`
- **Title Tracking**: `tracking-tight` or `tracking-tighter` with bold/black weights.
- **Eyebrow / Subhead**: `text-[10px]` or `text-[11px]`, uppercase, `tracking-wider`, `font-bold`.

## 3. Glassmorphism & Depth (Three.js / 2.5D Parallax)
- **Glass Panel**: `backdrop-blur-xl bg-luxury-900/60 border border-white/[0.07] shadow-2xl`
- **Glow Accents**: Radial background flares with low opacity (3-8%) to avoid visual noise.
- **Card Interactive States**: 
  - Spring scale `1.03`
  - Dynamic subtle 3D tilt tracking (`rotateX`, `rotateY`)
  - Smooth light sheen on hover.

## 4. Craft Anti-Patterns (To Avoid)
- ❌ No harsh solid white backgrounds or standard generic grey borders.
- ❌ No blurry, low-contrast text on dark backgrounds (use `text-slate-200`, `text-slate-300`, or `text-white`).
- ❌ No jumpy or stiff UI transitions (always use Framer Motion springs or CSS `cubic-bezier(0.16, 1, 0.3, 1)`).
- ❌ No cluttered, unaligned badges.
