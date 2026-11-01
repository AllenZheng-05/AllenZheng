# allenzheng.com — Plan

A personal portfolio where the same information can be viewed in many completely different
designs ("themes"). The `default` theme (clean and minimalist) is the default; a theme switcher
in the header and footer invites visitors to try the others.

## Decisions

- **One React app.** Vite + React + TypeScript + Tailwind CSS v4, built to a static site.
  Every portfolio theme is React. Other frameworks/experiments go on subdomains
  (e.g. `angular.allenzheng.com`) as separate, unrelated repos.
- **No database.** All content lives in typed TypeScript files in [`src/data/`](src/data/) and
  is bundled into the site.
- **`default` is the default theme.** Visitors switch themes from the "Theme" button in the
  header (top right) and the "Try another theme" link in the footer.
- **No phone number** anywhere on the site (enforced by a test). Contact is email, LinkedIn,
  GitHub.
- **Resume:** a one-page PDF at `public/resume.pdf`, linked from every theme.
- **Hosting:** Cloudflare (Workers static assets), domain already on Cloudflare.

## Architecture

```
src/
  data/            # the single source of truth (schema.ts defines the shape)
  shell/           # theme registry, provider, picker/menu, error boundary
  themes/<id>/     # one folder per theme: default-exported component + Preview.tsx
  components/      # small shared pieces (icons)
  lib/             # helpers (date formatting)
```

- **Theme registry** ([`src/shell/themes.ts`](src/shell/themes.ts)): each theme has an id,
  name, description, a small eagerly-loaded `Preview`, and a lazily-loaded `Component`
  (code-split, so visitors only download the theme they view). Themes can be marked
  `coming-soon` to show in the picker before they exist.
- **Theme routing** ([`src/shell/theme-route.ts`](src/shell/theme-route.ts)): each theme has
  its own path. `allenzheng.com/` is always the default theme; other themes live at `/<id>`
  (e.g. `/pokemon`, `/vscode`). `/default` redirects to `/` (via `public/_redirects` and
  client-side), and unknown or not-yet-released paths fall back to `/`. Switching themes
  pushes a history entry, so Back returns to the previous theme. There is no saved
  preference — the URL alone decides.
- **Reserved names:** a theme id can't be `default` or collide with a real file/folder in the
  build (`assets`, `resume.pdf`, `favicon.png`, `apple-touch-icon.png`, …).
- **Semantic color tokens** (`bg`, `surface`, `fg`, `muted`, `line`, `accent`) are defined in
  [`src/index.css`](src/index.css); each theme sets the underlying `--theme-*` variables on
  `:root[data-theme='<id>']`, so the shared picker matches whatever theme it appears in.

### Theme contract

Every theme must:

1. Show all portfolio content: bio, photo, quick facts, experience (with logos and links),
   and projects (with awards and links).
2. Link to the resume PDF (opening in a new tab), email, GitHub, and LinkedIn.
3. Include the theme switcher (`<ThemeMenu />` or `<ThemePicker />`).
4. Work at phone width (375px) with no horizontal scrolling.
5. Be keyboard-navigable with sensible headings, and respect `prefers-reduced-motion`.

Items 1–3 are enforced automatically by
[`src/shell/themes.contract.test.tsx`](src/shell/themes.contract.test.tsx).

### Adding a theme

1. Create `src/themes/<id>/` with `index.ts` default-exporting the theme component
   (`(props: ThemeProps) => JSX`) and a `Preview.tsx`.
2. Set its colors on `:root[data-theme='<id>']` in a CSS file the theme imports.
3. Register it in `src/shell/themes.ts` with `status: 'available'`. It is now served at
   `/<id>`.
4. `pnpm test` — the contract test now covers it.

## Phases

### Phase 1 — Foundation

- [x] Scaffold Vite + React + TypeScript + Tailwind, ESLint, Prettier
- [x] Typed data layer converted from the master resume (no phone number)
- [x] Theme registry, path-based theme routing (`/`, `/<id>`), picker, menu dialog
- [x] Default (minimalist) theme with the theme switcher in the header and footer
- [x] Tests: theme contract, data checks (incl. no phone number), theme resolution, dates
- [x] GitHub Actions CI (format, lint, typecheck, test, build)
- [x] Cloudflare config (`wrangler.jsonc`, `public/_headers`, `public/_redirects`)
- [x] Add `public/resume.pdf` (one-page version)
- [x] `hello@allenzheng.com` via Cloudflare Email Routing
- [x] Final copy for tagline, bio, experience, and projects
- [x] Deploy to Cloudflare and connect `allenzheng.com` (steps below); `www` and `http://`
      redirect to `https://allenzheng.com`

### Phase 2 — Pokédex theme

- Pokédex-style UI: dex entry for Allen (flavor-text bio, type badges, photo), projects as
  caught entries with dex numbers (their tech stacks as "moves"), experience as a trainer
  card / journey log, project awards as gym badges.
- Intro: switching to this theme plays the Pokéball sequence (drop, three wobbles, burst
  open, Pokédex scales out). Skippable on click/key; skipped for `prefers-reduced-motion`.
- Navigation: normal clickable tabs, with optional D-pad/arrow-key control.
- Original artwork only (SVG/CSS) — no official sprites, logos, or fonts.

### Phase 3 — VS Code theme

- Explorer tree (`README.md` bio, `experience/`, `projects/` with files in each project's real
  language, `resume.pdf`), tabs, breadcrumbs,
  status bar.
- Shiki for real syntax highlighting.
- Command palette (`Ctrl+Shift+P`) doubles as the theme switcher; terminal panel with
  `whoami`, `ls projects`, `theme <id>`.
- Mobile: explorer becomes a slide-out drawer.

### Later

- More themes (ideas: Pokémon Showdown battle UI, chessboard, Unix terminal, Game Boy,
  Netflix-style browse, Japanese stationery/zine).
- Prerender each theme's path to static HTML (with its own title and Open Graph image, e.g. a
  Pokéball preview for `/pokemon`) for faster first paint and better link previews.
- Open Graph image (`public/og-image.png`).
- Manual light/dark toggle for the default theme (currently follows the OS).
- Project detail pages / longer write-ups.

## Deploying to Cloudflare

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Import a repository** → pick the repo.
   - Build command: `pnpm run build`
   - Deploy command: `npx wrangler deploy` (uses [`wrangler.jsonc`](wrangler.jsonc))
3. Worker → **Settings → Domains & Routes → Add → Custom domain**: add `allenzheng.com`, then
   `www.allenzheng.com`.
4. Redirect `www` → apex: **Rules → Redirect Rules**, "Redirect from WWW to root" template.
   The dashboard warns that `www` may not be proxied; that's expected because the record
   belongs to the Worker's custom domain — choose "Ignore and deploy rule anyway".
5. **SSL/TLS → Edge Certificates → Always Use HTTPS**: on, so `http://` redirects to `https://`.
6. Optional: enable **Web Analytics** (cookieless), **Email Routing**, and **DMARC Management**.

Every push to `main` then redeploys, and pull requests get preview URLs.
