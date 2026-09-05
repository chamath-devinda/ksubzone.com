# KSubZone cinematic design system

KSubZone uses a mobile-first, premium streaming aesthetic without imitating a specific service. The interface is deliberately quiet around posters and download controls so artwork, Sinhala titles, and subtitle availability remain the focus.

## Color palette

| Token | Hex | Use |
| --- | --- | --- |
| Obsidian canvas | `#06040B` | Page background |
| Deep surface | `#0D0916` | Cards, navigation, footer |
| Raised surface | `#151024` | Inputs, menus, dialogs |
| Cinematic violet | `#7C3AED` | Primary actions, active navigation, links |
| Violet hover | `#6D28D9` | Primary hover/pressed state |
| Editorial pink | `#EC4899` | Sparing secondary emphasis |
| Rating amber | `#F59E0B` | Ratings only |
| Verified emerald | `#10B981` | Approved/available states only |
| Primary text | `#F8FAFC` | Headings and important labels |
| Secondary text | `#CBD5E1` | Body copy |
| Muted text | `#94A3B8` | Metadata and helper copy |

White text on the primary violet is used for large button labels. Muted text never carries an essential action or status by itself.

## Typography

- Display/headings: **Outfit**, weights 700–800. Its compact geometry gives the catalog a contemporary entertainment feel.
- Body/UI: **Inter**, weights 400–700. It remains readable in dense subtitle metadata and on small screens.
- Sinhala fallback: the operating system's Sinhala UI font (`Noto Sans Sinhala`, `Nirmala UI`, or `Iskoola Pota`) is allowed to take over when a bundled Latin font has no glyph.
- Logo wordmark: the existing local Milker font is retained only for the brand mark.

## Layout tokens

- Content width: `1280px` (`max-w-7xl`).
- Mobile gutters: `12–16px`; tablet/desktop gutters: `24–32px`.
- Spacing rhythm: `4, 8, 12, 16, 24, 32, 48, 64px`.
- Radius: controls `12px`, cards `16px`, feature panels `24–32px`, pills fully rounded.
- Borders: one-pixel white at 6–10% opacity; violet borders signal interaction.
- Shadows: deep neutral lift first, violet glow only on active or hovered primary surfaces.

## Components and interaction

- The fixed navigation uses a compact 56/64px bar, an accessible mobile drawer, active-route styling, search, and a primary sign-in action.
- Poster cards use a 2:3 ratio, responsive image sizes, lazy loading, availability/rating badges, and a small translate/zoom hover. Route prefetching happens only on pointer intent to avoid saturating mobile connections.
- Primary buttons use solid cinematic violet with white text. Secondary buttons use a transparent raised surface and visible border.
- Section headings pair one icon with a short title, one supporting line, and an optional right-aligned action.
- Detail templates keep the first download action above the fold, provide a visible breadcrumb, and place all advertisements outside button containers.
- Focus states remain visible. Motion collapses to effectively zero for `prefers-reduced-motion` users.

## Performance guardrails

- No global particle/canvas engine is loaded.
- Next image optimization emits AVIF/WebP with a one-day cache floor.
- Poster links do not bulk-prefetch on mobile; only hover intent prefetches a detail route.
- Non-critical advertisements and article imagery lazy-load with reserved space to limit layout shift.
- Analytics loads after interaction; catalog API responses are compact and cached.

## Admin workspace — KSubZone Studio

The management area uses a brighter, operations-first system inspired by the clean, colorful rhythm of the Doit dashboard reference while keeping KSubZone's own identity and workflows.

- Canvas: `#F3F5FA`; card: `#FFFFFF`; ink sidebar: `#0C1424`.
- Primary aubergine: `#490570`; lighter `#72149A` is used for hover/highlight contrast on black.
- Semantic accents: teal `#12B892`, coral `#FF6268`, amber `#FFB64D`, violet `#8B5CF6`.
- Default admin appearance is full dark: canvas `#05070B`, raised card `#0D1118`, border `#202630`, and sidebar `#07090E`.
- Navigation is grouped by Pages, Content Engine, Studio & Tools, and System & Data.
- Dashboard order: operational hero, quick actions, core KPIs, revenue, catalog metrics, analytics, subtitle queue, content performance, and system health.
- Admin cards use 18–26px radii, restrained shadows, 42px minimum form controls, visible focus rings, and mobile stacked table rows.
