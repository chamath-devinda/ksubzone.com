# KSubZone advertising configuration

The monetization system is centralized in `src/config/ads.js`. Production ads are enabled by default only in production; local development renders labeled placeholders unless explicitly overridden.

## Environment switches

```text
NEXT_PUBLIC_ADS_ENABLED=true
NEXT_PUBLIC_AD_MODE=HYBRID
NEXT_PUBLIC_ADSTERRA_ENABLED=true
NEXT_PUBLIC_MONETAG_ENABLED=false
NEXT_PUBLIC_BANNER_ADS_ENABLED=true
NEXT_PUBLIC_DESKTOP_BANNER_ENABLED=true
NEXT_PUBLIC_MOBILE_BANNER_ENABLED=true
NEXT_PUBLIC_SQUARE_ADS_ENABLED=true
NEXT_PUBLIC_NATIVE_ADS_ENABLED=true
NEXT_PUBLIC_SIDEBAR_ADS_ENABLED=true
NEXT_PUBLIC_POPUNDER_ENABLED=true
NEXT_PUBLIC_SOCIAL_BAR_ENABLED=false
NEXT_PUBLIC_IN_PAGE_PUSH_ENABLED=false
NEXT_PUBLIC_ADSTERRA_TRAFFIC_PERCENTAGE=50
NEXT_PUBLIC_POPUNDER_COOLDOWN_MS=43200000
```

`NEXT_PUBLIC_AD_MODE` accepts `ADSTERRA_ONLY`, `MONETAG_ONLY`, `HYBRID`, `AB_TEST`, or `OFF`.

The responsive primary slot loads only one approved unit: 320x50 below 768px and 728x90 from 768px upward. The 300x250 unit is a separate in-content format. The 160x600 unit is shown only in dedicated wide-desktop rails; it is never requested on mobile. A lazy footer banner is enabled on catalog, detail, article, and home routes. Set any corresponding environment switch to `false` to disable that unit, or set `NEXT_PUBLIC_ADS_ENABLED=false` / `NEXT_PUBLIC_AD_MODE=OFF` to disable all advertising.

## Placement map

| Placement | Routes | Rationale |
| --- | --- | --- |
| `home_below_hero` | Home | High viewability after the primary discovery experience, without covering hero actions. |
| `home_content_banner`, `home_content_square`, `home_content_native` | Home | Separates complete catalog rows so ads never masquerade as poster cards. |
| `listing_content_banner` | Movies, dramas, genres, article categories | Sits after filters and before results; the catalog controls remain uninterrupted. |
| `media_below_hero`, `media_after_description` | Movie and drama details | Uses natural content breaks after title metadata and synopsis. |
| `media_before_subtitles`, `media_after_downloads` | Movie and drama details | The subtitle anchor lands on the download section after the first slot, and the direct download controls are never overlaid or wrapped by ads. |
| `article_intro_square`, `article_mid_native` | Articles | Inserted only between editorial blocks. |
| `*_sidebar_left`, `*_sidebar_right` | Home and supported detail routes | Dedicated 160x600 rails appear only at 1600px and wider. |
| `site_footer_banner` | Monetized public routes | Low-pressure final placement after page content and before footer navigation. |

## Official provider code locations

- Adsterra: the official 728x90 desktop, 320x50 mobile, 300x250 square, desktop-only 160x600 sidebar, native, popunder, and disabled social-bar codes supplied by the publisher are in `src/config/ads.js` under `providers.adsterra.zones`.
- Monetag: no official Monetag code has been supplied. Keep `NEXT_PUBLIC_MONETAG_ENABLED=false`. When official code is available, paste only its exact script URLs into `providers.monetag.zones.multiTagScriptUrl`, `inPagePushScriptUrl`, and `onClickScriptUrl`. The OnClick URL is already connected to the guarded intrusive loader; MultiTag and In-Page Push remain inert placeholders until their exact official snippets and required initialization details are supplied.

Never place ad scripts in the root layout or individual page files. Add page positions through `placements`, then render the reusable `AdSlot` component.

## Safety behavior

- Admin, authentication, profile/account, static, 404, and error routes do not load ads.
- Below-the-fold slots use lazy loading and reserve responsive space before loading.
- Display and native snippets run inside dedicated frames so their `atOptions` values cannot conflict. The frames grant the provider the same-origin cookie access required by the official Adsterra runtime while retaining navigation and popup sandbox restrictions.
- The intrusive loader chooses one provider. Adsterra popunder and Monetag OnClick therefore cannot run together.
- A/B assignments persist in `localStorage` under `ksubzone_ad_variant`.
- Provider initialization is centralized so a consent check can be added in `AdProvider` before any third-party script runs.
