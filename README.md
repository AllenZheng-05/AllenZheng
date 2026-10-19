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

All content lives in [`src/data/`](src/data/). Edit it once and every theme updates. The resume PDF is served from `public/resume.pdf`.

## Themes

Themes live in [`src/themes/`](src/themes/) and are registered in
[`src/shell/themes.ts`](src/shell/themes.ts).
