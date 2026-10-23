# Pawstead — Pet Insurance website

Static multi-page site built with HTML, Tailwind CSS (CLI) and vanilla ES6. No frameworks, one dev dependency.

## Getting started

```bash
npm install
npm start          # build partials + CSS, then serve at http://localhost:4173
npm run watch:css  # rebuild CSS on change (run alongside `npm run serve`)
npm run check      # structure, links, Home dropdown and heading-alignment checks
```

Deploy by uploading the root HTML files and `assets/` to any static host. Run `npm run build` first.

## Structure

```
*.html                 Pages: index, home-2, about, contact, plans, claims, login, dashboard
styleguide.html        Internal design-system reference (noindex, not linked)
src/input.css          Design tokens, base styles, components (Tailwind source)
src/partials/          head.html, header.html, footer.html (single source of truth)
assets/css/styles.css  Compiled output — do not edit
assets/js/main.js      Dropdown, mobile drawer, footer year, scroll-to-top
assets/images/         Images and icons
scripts/               build-partials, check, serve (zero-dependency Node)
tailwind.config.js     Maps CSS-variable tokens to Tailwind
```

### Shared header and footer

Edit `src/partials/*.html`, then run `npm run build:partials`. The script rewrites the content between
`<!-- partial:name -->` markers in every page. It also sets the active nav state from `<body data-page="...">`
(`data-nav` gets `aria-current="page"`; `data-nav-group` gets `data-active="true"`).

**Adding a page:** copy an existing page shell, change `<title>`, `<meta name="description">` and `data-page`,
then run `npm run build`.

## Design system

### Colour: semantic tokens, two themes

Markup only uses **semantic** colour names. Each one maps to a CSS variable in `src/input.css` whose value
changes per theme (`html[data-theme="light"|"dark"]`) and per surface. The brand palette is the source:
Deep Pine #183C35, Warm Porcelain #F6F2E9, Soft Sage #D8E1D4, Burnt Terracotta #C66B4E and Charcoal Ink #292D2B.
It's also exposed as `brand-*` for fixed uses.

| Utility | Role | Light | Dark |
|---|---|---|---|
| `bg` | Page | Porcelain | #101A17 |
| `surface` / `surface-soft` / `raised` / `field` | Bands, table header, menus, inputs | Sage / #EDE9DE / #FBF8F1 / #FCFAF5 | #182521 / #16221E / #1B2924 / #15211D |
| `fg` / `heading` / `muted` | Text | Ink / Pine / #5B605C | #E2DED3 / #F3EEE3 / #A9B1A9 |
| `accent` / `accent-mark` | Small accent text / decorative marks | #A8543A / Terracotta | #E6967A / #D9805F |
| `cta` (+ `cta-hover`, `cta-fg`) | Primary button | #A8543A, porcelain text | #D9805F, dark text |
| `line` | Borders (always used with alpha) | Ink | Light |
| `positive` | "Included" marks | Pine | #9FC2AE |

- `.surface-alt` is the sage band. `.surface-inverse` is the pine band, also used by the footer. Both re-point the semantic
  variables, so every component inside adapts without extra classes.
- Every text pairing is WCAG AA or better. #C66B4E fails AA for small text, so it's only used for decorative marks.

### Theme and direction

- The theme toggle is icon-only and appears in the header and drawer. It's stored in `localStorage['pawstead-theme']`, and the OS preference is the default.
- The LTR/RTL switch is text-only and appears in the header and drawer. It sets `<html dir>` and is stored in `localStorage['pawstead-dir']`.
- An inline script in `src/partials/head.html` applies both before first paint, so there's no flash.
- Components use logical properties (`ms-`, `ps-`, `start-`, `end-`, `border-s`), so layout mirrors in RTL.
- Latin text blocks use `unicode-bidi: plaintext` in RTL so punctuation stays correct.

### Type, layout, components

- **Type:** DM Sans for headings, Inter for body. Scale: `text-display`, `text-h1`–`text-h4`, `text-lead`, `text-body`, `text-small`, `text-eyebrow`.
- **Layout:** `.container-site` (77.5rem with fluid gutter), `.section` / `.section-tight`, `max-w-prose` / `max-w-measure`.
  The full header nav and the header CTA appear at `xl` (1280px). Below that, an icon-only menu button opens the drawer
  (which has its own CTA); the drawer Home group always starts collapsed.
- **Components:** `.logo`, `.btn` + `-primary` / `-secondary` / `-quiet` (fixed 48px), `.icon-btn`, `.dir-switch`, `.link`,
  `.link-arrow`, `.nav-link`, `.dropdown`, `.drawer`, form fields.
  Home 1: `.hero` (contained split), `.compare` (plans as columns), `.wide-media`, `.reasons`, `.steps`, `.cta-panel`.
  Home 2: `.overlap-hero` (pine panel over the image), `.factors`, `.calc` (worked example), `.ledger` (plans as rows), `.level`, `.benefits` / `.benefit-row`, `.process`, `.principles`.
  Inner pages: `.page-hero` (shared hero, see below), `.principle-rows`, `.pull`, `.support-list`, `.options` / `.option`, `.resource-list` / `.resource-link`, form states (`.form-summary`, `.form-success`).
  Plans: `.page-hero--media-start` + `.hero-legend`, `.table-scroll` / `.plan-table` (real table with a sticky feature column, scrolls inside a focusable region below 768px), `.bill` (bill breakdown diagram), `.terms`, `.checklist`.
  Claims: `.hero-steps`, `.timeline`, `.invoice` (annotated sample), `.tracker` / `.status-panel` (`.claim-flow__status` stacks it beside the form from lg), `.tag`.
  Contact: `.map-frame` (compact OpenStreetMap embed, regional view, no marker).
  Shared: `.scroll-top`, created by main.js on public pages only (not login/dashboard). It sits in the inline-end corner. Where the side
  margin holds it, it stays shown; on narrower screens it hides while reading downward, shows on scroll-up (fading out once scrolling
  settles if it covers content) and rests at page end in a corner the footer keeps clear (`data-scroll-top-dock`).
  Dashboard: inside `.app-sidebar` / `.app-topbar` the direction switch has 3:1 borders, hover/press fills, and an inverse pressed state.
- **Images:** `assets/images/home/`, `assets/images/home-2/` and `assets/images/inner/` hold responsive WebP files. Each folder has a `CREDITS.md` with provenance (all CC0 / public domain).


## Inner-page hero standard

Every inner page starts with the same `.page-hero` markup: `__grid` > `__body` (eyebrow, `__title`, `__lead`, one CTA in `__actions`) + `__media`.
Its height comes from tokens, not from the copy, so all inner heroes are identical at any viewport:

- Stacked layout (< 768px): `--page-hero-body` sets the text block's min-height, and the image has a fixed ratio (16:10, or 2:1 from 640px).
- Split layout (768px+, and phones in landscape): `--page-hero-h` sets the grid's min-height (26 / 27 / 28rem at md / lg / xl, 22rem on short landscape screens), and the image stretches to fill it.
- Keep the hero copy short: it must fit inside the token. QA measures the text height against the token at every 8px width from 320 to 1920.

Hero **variants** change only the composition, never the box: `--media-start` mirrors the columns, and overlays (`.hero-legend`, `.hero-steps`) sit inside the image. Keep the copy within the token: one-sentence leads, and at most one button plus one text link.

Prototype forms share `assets/js/forms.js` (`PawsteadForms.attach(form, { rules, onValid })`):

- `assets/js/contact.js` is the contact form.
- `assets/js/claims.js` is the claim submission form plus the status tracker.
- Validation runs entirely on the client. Nothing is sent, uploaded or stored.
- A valid submission shows an on-page note that says so.

## Account portal (login.html, dashboard.html)

These pages use application chrome instead of the public header and footer. Their `<body>` carries `data-chrome="app"`: the build injects only the head partial, and `npm run check` verifies the app rules (logo links to Home 1, no public nav).

- **Login** (`assets/js/login.js`):
  - **Sign In / Create Account tabs:** ARIA tabs with arrow, Home and End key support. Sign In is the default; `login.html#create-account` opens registration.
  - **Sign in:** validates the fields and opens `dashboard.html` with no network call.
  - **Create account:**
    - Validates name, email, password (at least 8 characters, with a letter and a number), matching confirmation, and terms.
    - Shows an in-page success state, then continues to the dashboard as that user.
  - **Passwords** are never written to any storage. Only the identity (name, email) is kept in `sessionStorage`.
  - **Remember me** keeps only the email, in `localStorage`.
  - **Password recovery** is an inline view that confirms the request without claiming an email was sent.
- **Shared header:** includes Dashboard (`dashboard.html`) and Login (`login.html`) in both the desktop nav and the mobile drawer. With seven items, the desktop nav uses tighter link padding (`.site-nav`) so it stays centred.
- **Dashboard** (`assets/js/dashboard.js`):
  - **Data:** one `state` object (user, policy, pet, claims) renders every view through `data-bind`, so values never disagree.
  - **Routing:** hash routes `#overview #policy #compare #claims #claims-new #claim-<ref> #pet #settings`.
  - **Persistence:** state lives in `sessionStorage` for the browser session, and Sign Out clears it.
  - **Sidebar:** persistent from 1024px. Below that it's a modal drawer with a focus trap, scroll lock, an inert background, and close on Escape, outside click or resize.
- **Shared form validation:** the claim, pet-profile and settings forms use `forms.js`.
- **Theme in Settings:** the Settings theme choice uses `window.PawsteadTheme` (from `main.js`). It stays in sync with the top-bar toggle through the `pawstead:themechange` event.

## Mandatory rule: heading alignment

Headings are **never** right- or end-aligned, at any breakpoint, in RTL, or via a container.
They are left-aligned by default. Centre one only when the composition calls for it, using `.heading-center`.
`src/input.css` enforces this with a guard (`text-align: left !important`), and `npm run check` fails on right/end
alignment classes on headings.
