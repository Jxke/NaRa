# NaRa Design System

This branch contains **only** the NaRa design system — no firmware, no
ROCK source code, no unrelated files. It's a self-contained snapshot
so teammates and AI coding agents can pull it in as reference material
without cloning the whole firmware tree.

**Live showcase**: https://app-three-kappa-39.vercel.app/ds-nara

## Identity rules

- **Palette**: Black `#000000` on white `#FFFFFF`. No accent color.
  Black is forbidden as a full background — only as highlights or
  small design elements.
- **Typefaces**:
  - **PP Mondwest Regular (400)** — display, H1, body. 8-bit styled serif.
  - **PP NeueBit Bold (700)** — UI, subheads, mono body, captions. Pixel
    grid bitmap. All-caps native for H2 and captions.
- **No italics.**
- **Square corners** — zero border radius everywhere except semantic
  circles (avatar dots, legend markers).
- **Differentiation via shape / stroke / pattern**, never color. Status
  markers use glyphs like `☑ ☒ ◯ ◌ ◇ ●`. Cards differentiate via stroke
  weight (1px solid / 2px solid / 1px dashed).

## Contents

```
ds-nara/              # the design system library
├── tokens.ts         # colors, fonts, spacing, typography
├── cockpit-ds.css    # @font-face for PP fonts, keyframes
├── layout.tsx        # scoped wrapper
├── page.tsx          # full component showcase (~4200 lines)
├── components/       # atoms, chips, modals, meta, status, tables, tabs, ...
├── brief-*.tsx       # brief/intro section components
├── architecture*.tsx # architecture diagrams
├── pipeline-flow*.tsx# pipeline visualisations
├── tier-viewer.tsx   # tier dashboard
└── node-info*.ts     # node metadata

route/                # Next.js App Router entry points
├── layout.tsx        # mounts ds-nara under /ds-nara route
└── page.tsx          # renders the showcase

public/               # static assets
├── fonts/pp/         # PP Mondwest Regular + PP NeueBit Bold (.otf)
└── nara/logomark.svg # NaRa logomark from Figma
```

## For agents

If you're an AI agent working on any Nara surface (device UI, companion
app, cockpit, marketing site, docs) and need visual context:

1. Read `ds-nara/tokens.ts` to get the palette, font, and type scale.
2. Skim `ds-nara/page.tsx` for the component gallery and do/don't rules.
3. Respect the identity rules above — don't introduce color, italic
   text, rounded corners, or non-PP fonts.

## Source of truth

- Figma identity guideline:
  https://www.figma.com/design/WuGO7Cv6xSf5MSVchlwgIo/Untitled?node-id=1-2
- Live showcase: https://app-three-kappa-39.vercel.app/ds-nara

## Fonts

`PPMondwest-Regular.otf` and `PPNeueBit-Bold.otf` are trial fonts from
Pangram Pangram. For anything shipped to end users, ensure the project
holds a valid commercial license.
