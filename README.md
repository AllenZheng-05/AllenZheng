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

Every experience and project has a `description` with a `sentence`, `paragraph`, and `bullets`. Themes choose which to show. The scroll theme (the default, in [`src/themes/scroll/`](src/themes/scroll/)) shows each entry's `sentence`, and a project's first image in `media` appears in its window. A project's small animated motif is chosen by its id in [`src/themes/scroll/motifs.ts`](src/themes/scroll/motifs.ts); projects not listed there get a lantern. All of its text is drawn in the handwriting font (below), so content with a character the font lacks fails the font-coverage test in `pnpm test` until that letter is added to the font.

Add demo videos, GIFs, and screenshots to an entry's `media` list. Put files in `src/assets/` and import them, the same way as logos:

```ts
media: [
  { kind: 'image', src: screenshot, alt: 'Search results page', caption: 'Searching teams' }, // also GIFs
  { kind: 'video', src: demoClip, poster: demoPoster, alt: 'Building a team' },
  { kind: 'embed', src: 'https://www.youtube-nocookie.com/embed/<id>', alt: 'Demo video' },
]
```

## Handwriting font

`src/assets/hand/AllenHand.woff2` is a font built from my own handwriting. The letters were written in a
small drawing tool and saved as strokes in `src/assets/hand/allen-studio-data.json`. To rebuild the font
after rewriting letters, replace that file with a new export and run:

```sh
pip install fonttools brotli skia-pathops   # once
pnpm build:font
```

## Themes

Themes live in [`src/themes/`](src/themes/) and are registered in
[`src/shell/themes.ts`](src/shell/themes.ts).
