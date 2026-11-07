# allenzheng.com

My personal portfolio. Built with React, TypeScript, Vite, and Tailwind CSS. Hosted on Cloudflare.

## Development

Requires Node 22+ and [pnpm](https://pnpm.io).

```sh
pnpm install
pnpm dev          # local dev server
pnpm test         # unit + theme contract tests
pnpm lint
pnpm typecheck
pnpm build        # static site in dist/
```

## Updating content

All content lives in [`src/data/`](src/data/). Edit it once and every theme updates. The resume PDF is served from `public/resume.pdf`, which `pnpm dev` and `pnpm build` refresh from the sibling `AllenZhengResume` repo (or run `pnpm sync:resume`). Commit the updated file to publish it.

Every experience and project has a `description` with a `sentence`, `paragraph`, and `bullets`. Themes choose which to show; the default theme sets this at the top of [`sections.tsx`](src/themes/default/sections.tsx), for all entries or for one by id.

Add demo videos, GIFs, and screenshots to an entry's `media` list. Put files in `src/assets/` and import them, the same way as logos:

```ts
media: [
  { kind: 'image', src: screenshot, alt: 'Search results page', caption: 'Searching teams' }, // also GIFs
  { kind: 'video', src: demoClip, poster: demoPoster, alt: 'Building a team' },
  { kind: 'embed', src: 'https://www.youtube-nocookie.com/embed/<id>', alt: 'Demo video' },
]
```

## Themes

Themes live in [`src/themes/`](src/themes/) and are registered in
[`src/shell/themes.ts`](src/shell/themes.ts).
