# blog-template (lawsonhart.me)

This is the Astro codebase that powers the blog/posts section of **lawsonhart.me**, and it doubles as a lightweight **blog template** you can publish and reuse.

The idea: clone it, customize the site config and content, and when you want to share it, export a "public template snapshot" that leaves the private integrations behind.

## What you get

- Astro 5 + TypeScript
- Content Collections for posts + notes
- Tailwind styling + a component-driven layout
- Opinionated linting/formatting (Biome + Prettier)

## Quick start

### Prerequisites

- Node.js 20+ (recommended)
- bun

### Install

```sh
bun install
```

### Run locally

```sh
bun dev
```

Open http://localhost:4321 and you should be looking at the site.

## Scripts

The ones you'll actually use day-to-day:

- `bun dev` / `bun start` runs the dev server
- `bun check` runs `astro check`
- `bun lint` runs Biome lint
- `bun format` formats code + imports (Biome + Prettier)

And the template-focused helpers:

- `bun template:dev` runs the site from a sandbox copy with the excluded paths removed
- `bun template:build` builds that sandbox copy, which is a nice way to verify the template export won't break

One heads-up: `bun install` runs a `postinstall` patch for Astro MDX internals (see `scripts/patch-astrojs-mdx-server.cjs`). That's expected, not something going wrong.

## Configure your site

At minimum, update the site metadata in `src/site.config.ts`:

- `url` (your domain)
- `title`, `author`, and `description`

You'll also probably want to adjust the navigation links (`menuLinks`) and rip out any integrations you don't use.

## Site credits

The About page includes a short credits section that references:

- Built with Astro
- Theme base: Astro Cactus

It also includes two quick links:

- `Info & stats` (internal): `/info-stats`
- `Blog template` (external): only shows up when configured via `PUBLIC_TEMPLATE_REPO_URL`

## Content & frontmatter

Posts live under `src/content/post/**` and notes live under `src/content/note/**`.

Post frontmatter supports:

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
technologies: []                  # optional (Adds the icons of the used technologies) [You must also add them if needed]
```

## Environment variables

Optional integrations are driven by `import.meta.env`. The common ones:

- `PUBLIC_COMMENTS_API_ORIGIN`: the comments API origin, if you use the comment service
- `PUBLIC_COMMENTS_DEBUG`: enables client-side debug logging for comments
- `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`: used for the GitHub-powered widgets
- `UMAMI_*`: used for analytics proxying/widgets, if enabled

See `src/env.d.ts` for the full list.

## Template sandbox + exporting

This is how the repo keeps the **real site** private while still producing a safe-to-publish **template snapshot**.

1) Add private paths to `template-excludes.txt` (one workspace-relative path per line)
2) Validate the template view:

```sh
bun template:dev
```

3) Export a filtered snapshot:

```sh
node scripts/export-template.cjs --out .template-export
```

The exporter also hard-excludes any `.env*` files as defense-in-depth, so a stray secret can't ride along in the export.

## License

MIT, see LICENSE.
