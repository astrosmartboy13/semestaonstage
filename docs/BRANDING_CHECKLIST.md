# Pusat Kendali Semesta Branding Checklist

Release target: `v1.0.0`

Dokumen ini menjadi inventory asset branding yang perlu diganti saat official Illustrator assets sudah final. Sprint ini hanya menstandarkan nama produk, browser title, footer release, dan penanda temporary branding.

## Product Metadata

| Field | Value |
|---|---|
| Product | Pusat Kendali Semesta |
| Version | v1.0.0 |
| Public owner label | Powered by SIGNAL13 |

## Active Dashboard Branding Assets

| Asset | Current File | Current Role | Status | Replacement Note |
|---|---|---|---|---|
| Main sidebar logo | `dashboard/assets/images/logo-semesta.png` | Logo utama di sidebar Dashboard | Temporary | Replace dengan official logo export dari Illustrator. |
| Hero logo | `dashboard/assets/images/logo-semesta.png` | Logo besar pada hero Dashboard | Temporary | Gunakan source official yang sama atau varian lockup resmi. |
| Browser favicon | `dashboard/assets/images/favicon.svg` | Favicon Dashboard | Temporary | Replace dengan favicon resmi dari Illustrator. |
| Hero background | `dashboard/assets/images/hero-bg.svg` | Background visual hero | Temporary | Replace atau validasi ulang setelah brand kit final. |

## Active Navigation And Action Icons

| Asset | Current File | Current Role | Status | Replacement Note |
|---|---|---|---|---|
| Dashboard icon | `dashboard/assets/icons/dashboard.svg` | Sidebar navigation | Temporary | Replace dengan ikon resmi. |
| Timer icon | `dashboard/assets/icons/timer.svg` | Sidebar dan Quick Access | Temporary | Replace dengan ikon resmi. |
| Backstage icon | `dashboard/assets/icons/backstage.svg` | Sidebar dan Quick Access | Temporary | Replace dengan ikon resmi. |
| Timeline icon | `dashboard/assets/icons/timeline.svg` | Sidebar dan Quick Access | Temporary | Replace dengan ikon resmi. |
| Studio icon | `dashboard/assets/icons/studio.svg` | Sidebar, Quick Access, action | Temporary | Replace dengan ikon resmi. |
| Editor icon | `dashboard/assets/icons/editor.svg` | Sidebar dan Quick Access | Temporary | Replace dengan ikon resmi. |
| Instagram icon | `dashboard/assets/icons/instagram.svg` | Action link | Temporary | Replace jika brand kit menyediakan social icon set. |

## Admin Branding

| Asset | Current File | Current Role | Status | Replacement Note |
|---|---|---|---|---|
| Browser title | `admin/index.html` | Admin page title | Release-ready | Sudah memakai `Pusat Kendali Semesta | Admin`. |
| Header label | `admin/index.html` | SIGNAL13 eyebrow pada Admin | Temporary | Review pada branding phase setelah logo dan lockup final. |

## OnTime Temporary Branding

OnTime adalah upstream application yang diproxy oleh Gateway. File OnTime tidak dimodifikasi di repository ini.

| Surface | Source | Current Role | Status | Replacement Note |
|---|---|---|---|---|
| Timer browser title | Gateway HTML response branding | Browser title untuk `/timer/` | Release-ready wrapper | Upstream OnTime UI branding tetap temporary. |
| Backstage browser title | Gateway HTML response branding | Browser title untuk `/backstage/` | Release-ready wrapper | Upstream OnTime UI branding tetap temporary. |
| Timeline browser title | Gateway HTML response branding | Browser title untuk `/timeline/` | Release-ready wrapper | Upstream OnTime UI branding tetap temporary. |
| Studio browser title | Gateway HTML response branding | Browser title untuk `/studio/` | Release-ready wrapper | Upstream OnTime UI branding tetap temporary. |
| Editor browser title | Gateway HTML response branding | Browser title untuk `/editor/` | Release-ready wrapper | Upstream OnTime UI branding tetap temporary. |
| Operator browser title | Gateway HTML response branding | Browser title untuk `/operator/` | Release-ready wrapper | Upstream OnTime UI branding tetap temporary. |
| Cue Sheet browser title | Gateway HTML response branding | Browser title untuk `/cuesheet/` | Release-ready wrapper | Upstream OnTime UI branding tetap temporary. |
| Countdown browser title | Gateway HTML response branding | Browser title untuk `/countdown/` | Release-ready wrapper | Upstream OnTime UI branding tetap temporary. |
| OnTime favicon, manifest, icons, internal logo marks | Upstream OnTime application | Browser/app assets served by OnTime | Temporary | Replace only after deciding whether to fork, theme, or configure OnTime branding officially. |

## Temporary Branding Markers

- Gateway injects `signal13-temporary-branding` metadata into branded OnTime HTML documents.
- The marker means the page title has been standardized for SIGNAL13, while upstream OnTime visual assets are still pending official branding work.

## Replacement Checklist

- [ ] Export official logo lockups from Illustrator.
- [ ] Replace Dashboard logo files.
- [ ] Replace Dashboard favicon.
- [ ] Replace navigation/action icons.
- [ ] Review Admin header branding.
- [ ] Decide official approach for OnTime upstream branding.
- [ ] Verify favicons and browser titles on all public and protected hostnames.
- [ ] Run desktop and mobile visual smoke test after asset replacement.
