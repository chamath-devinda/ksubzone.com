# KSubZone advertising configuration

The monetization system is centralized in `src/config/ads.js`. Production ads are enabled by default only in production; local development renders labeled placeholders unless explicitly overridden.

## Environment switches

```text
NEXT_PUBLIC_ADS_ENABLED=true
NEXT_PUBLIC_AD_MODE=HYBRID
NEXT_PUBLIC_ADSTERRA_ENABLED=true
NEXT_PUBLIC_MONETAG_ENABLED=false
NEXT_PUBLIC_BANNER_ADS_ENABLED=true
NEXT_PUBLIC_NATIVE_ADS_ENABLED=true
NEXT_PUBLIC_POPUNDER_ENABLED=true
NEXT_PUBLIC_SOCIAL_BAR_ENABLED=false
NEXT_PUBLIC_IN_PAGE_PUSH_ENABLED=false
NEXT_PUBLIC_ADSTERRA_TRAFFIC_PERCENTAGE=50
NEXT_PUBLIC_POPUNDER_COOLDOWN_MS=43200000
```

`NEXT_PUBLIC_AD_MODE` accepts `ADSTERRA_ONLY`, `MONETAG_ONLY`, `HYBRID`, `AB_TEST`, or `OFF`.

## Official provider code locations

- Adsterra: the official banner keys, native script/container, popunder script, and disabled social-bar script supplied by the publisher are in `src/config/ads.js` under `providers.adsterra.zones`.
- Monetag: no official Monetag code has been supplied. Keep `NEXT_PUBLIC_MONETAG_ENABLED=false`. When official code is available, paste only its exact script URLs into `providers.monetag.zones.multiTagScriptUrl`, `inPagePushScriptUrl`, and `onClickScriptUrl`. The OnClick URL is already connected to the guarded intrusive loader; MultiTag and In-Page Push remain inert placeholders until their exact official snippets and required initialization details are supplied.

Never place ad scripts in the root layout or individual page files. Add page positions through `placements`, then render the reusable `AdSlot` component.

## Safety behavior

- Admin, authentication, profile/account, static, 404, and error routes do not load ads.
- Below-the-fold slots use lazy loading and reserve responsive space before loading.
- Display and native snippets run inside sandboxed frames so provider scripts cannot rewrite the React document.
- The intrusive loader chooses one provider. Adsterra popunder and Monetag OnClick therefore cannot run together.
- A/B assignments persist in `localStorage` under `ksubzone_ad_variant`.
- Provider initialization is centralized so a consent check can be added in `AdProvider` before any third-party script runs.
