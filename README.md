# blog-template (lawsonhart.me)

This is the Astro codebase that powers the blog/posts section of **lawsonhart.me** — and it’s also set up to be published as a lightweight **blog template**.

It’s meant to be cloned and customized (site config + content), while letting you export a “public template snapshot” that omits private integrations.

## What you get

- Astro 5 + TypeScript
- Content Collections for posts + notes
- Tailwind styling + a component-driven layout
- Opinionated linting/formatting (Biome + Prettier)

## Quick start

### Prerequisites

- Node.js 20+ (recommended)
- pnpm

### Install

```sh
pnpm install
```

### Run locally

```sh
pnpm dev
```

Open http://localhost:4321

## Scripts

These are the main scripts you’ll use day-to-day:

- `pnpm dev` / `pnpm start` — Run the dev server
- `pnpm check` — Run `astro check`
- `pnpm lint` — Run Biome lint
- `pnpm format` — Format code + imports (Biome + Prettier)

Template-focused helpers:

- `pnpm template:dev` — Run the site from a sandbox copy with excluded paths removed
- `pnpm template:build` — Build the sandbox copy (useful to verify the template export won’t break)

Notes:

- `pnpm install` runs a `postinstall` patch for Astro MDX internals (see `scripts/patch-astrojs-mdx-server.cjs`).

## Configure your site

At minimum, update the site metadata in `src/site.config.ts`:

- `url` (your domain)
- `title`, `author`, and `description`

You’ll also probably want to adjust navigation links (`menuLinks`) and any integrations you don’t use.

## Content & frontmatter

Posts live under `src/content/post/**` and notes live under `src/content/note/**`.

Frontmatter for posts supports:

```yaml
title: "Your Post Title"           # required
description: "Short summary"       # required
publishDate: "2025-09-01"          # required (string or date)
updatedDate: 2025-09-15             # optional
tags: [astro, webgl]                # optional
draft: false                        # optional (defaults false)
coverImage:                         # optional
  alt: "Alt text"
  src: ./cover.png
ogImage: "/og/custom.png"          # optional
tryLink: "https://example.app"      # optional (adds a "Try it live" button)
```

## Environment variables

This template supports optional integrations driven by `import.meta.env`.

Common ones:

- `PUBLIC_COMMENTS_API_ORIGIN` — Comments API origin (if you use the comment service)
- `PUBLIC_COMMENTS_DEBUG` — Enables client-side debug logging for comments
- `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` — Used for GitHub-powered widgets
- `UMAMI_*` — Used for analytics proxying/widgets (if enabled)

See `src/env.d.ts` for the full list.

## Template sandbox + exporting

This repo has a simple workflow for keeping the **real site** private while producing a safe-to-publish **template snapshot**.

1) Add private paths to `template-excludes.txt` (one workspace-relative path per line)
2) Validate the template view:

```sh
pnpm template:dev
```

3) Export a filtered snapshot:

```sh
node scripts/export-template.cjs --out .template-export
```

The exporter also hard-excludes any `.env*` files as defense-in-depth.

## License

MIT — see LICENSE.
