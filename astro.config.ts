import fs from "node:fs";
// Rehype plugins
import { rehypeHeadingIds, unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import vue from "@astrojs/vue";
import tailwind from "@tailwindcss/vite";
import type { AstroUserConfig } from "astro";
import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import robotsTxt from "astro-robots-txt";
import webmanifest from "astro-webmanifest";
import { boneyardPlugin } from "boneyard-js/vite";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
// `astro-expressive-code` only auto-wires the `.md` processor; for `.mdx` we add the
// underlying rehype plugin to the mdx() pipeline ourselves. It's the default export of
// `rehype-expressive-code` (which `astro-expressive-code` does not re-export by name).
import rehypeExpressiveCode from "rehype-expressive-code";
import rehypeExternalLinks from "rehype-external-links";
import rehypeUnwrapImages from "rehype-unwrap-images";
// Remark plugins
import remarkDirective from "remark-directive"; /* Handle ::: directives as nodes */
import rehypeInlineImages from "./src/plugins/rehype-inline-images";
import { remarkAdmonitions } from "./src/plugins/remark-admonitions"; /* Add admonitions */
import remarkInlineImages from "./src/plugins/remark-inline-images";
import { expressiveCodeOptions, siteConfig } from "./src/site.config";

// `@astrojs/vercel` intentionally does not support `astro preview`.
// Our `bun preview` script rebuilds with `ASTRO_ADAPTER=node` so local preview works.
const useNodeAdapter = process.env.ASTRO_ADAPTER === "node";
const vitePlugins = [
	tailwind(),
	rawFonts([".ttf", ".woff"]),
	boneyardPlugin(),
] as unknown as NonNullable<NonNullable<AstroUserConfig["vite"]>["plugins"]>;

// Markdown pipeline plugins. Defined once and applied to BOTH the core `.md`
// pipeline (via the `processor` below) AND the top-level keys — `@astrojs/mdx`
// reads the top-level `remarkPlugins`/`rehypePlugins`/`gfm`, NOT `markdown.processor`,
// so `.mdx` posts need them here or they lose `:::` directives, GFM tables, etc.
type MarkdownConfig = NonNullable<AstroUserConfig["markdown"]>;
const remarkPlugins: NonNullable<MarkdownConfig["remarkPlugins"]> = [
	remarkDirective,
	remarkAdmonitions,
	remarkInlineImages({ publicPrefix: "/content-assets" }),
];
const rehypePlugins: NonNullable<MarkdownConfig["rehypePlugins"]> = [
	rehypeHeadingIds,
	[rehypeAutolinkHeadings, { behavior: "wrap", properties: { className: ["not-prose"] } }],
	[rehypeExternalLinks, { rel: ["noreferrer", "noopener"], target: "_blank" }],
	rehypeUnwrapImages,
	rehypeInlineImages({ publicPrefix: "/content-assets" }),
];
const remarkRehypeOptions: NonNullable<MarkdownConfig["remarkRehype"]> = {
	footnoteLabelProperties: { className: [""] },
};

export default defineConfig({
	site: siteConfig.url,
	output: "server",
	// The dev toolbar loads a burst of scripts ~0.8s in and injects its own element,
	// which forces a reflow that the centred layout amplifies. It's dev-only and we
	// don't use it, so disable it.
	devToolbar: { enabled: false },
	adapter: useNodeAdapter ? node({ mode: "standalone" }) : vercel(),
	image: {
		service: { entrypoint: "astro/assets/services/noop" },
	},
	integrations: [
		expressiveCode(expressiveCodeOptions),
		icon({
			include: {
				"simple-icons": ["*"],
				// MDI is used across the site (social links, rss icons, and Java icon)
				mdi: [
					"account-circle",
					"api",
					"arrow-left",
					"home-outline",
					"coffee",
					"cloud",
					"code-tags",
					"mouse-left-click-outline",
					"mouse-right-click-outline",
					"cube-outline",
					"database",
					"discord",
					"email",
					"flask-outline",
					"github",
					"instagram",
					"language-java",
					"linkedin",
					"lock",
					"palette",
					"cellphone",
					"rss",
					"tools",
					"twitter",
				],
			},
		}),
		sitemap(),
		// `@astrojs/mdx` reads its plugins from these integration options (it does
		// NOT read `markdown.processor`), so the `.mdx` pipeline gets directives,
		// GFM, etc. here. The core `.md` pipeline is fed by `markdown.processor` below.
		mdx({
			remarkPlugins: remarkPlugins as NonNullable<NonNullable<Parameters<typeof mdx>[0]>["remarkPlugins"]>,
			// Expressive Code only auto-injects into the `.md` `processor` (see `markdown`
			// below) and globally sets `syntaxHighlight: false`. MDX has its own plugin
			// pipeline that doesn't read `processor`, so without adding EC's rehype plugin
			// here, `.mdx` code blocks render completely unstyled. Keep it LAST so it runs
			// on the final code nodes; the inherited `syntaxHighlight: false` avoids any
			// double highlighting.
			rehypePlugins: [
				...rehypePlugins,
				[rehypeExpressiveCode, expressiveCodeOptions],
			] as NonNullable<NonNullable<Parameters<typeof mdx>[0]>["rehypePlugins"]>,
			remarkRehype: remarkRehypeOptions,
			gfm: true,
		}),
		robotsTxt({
			policy: [
				{
					userAgent: "*",
					allow: "/",
				},
			],
			sitemap: true,
			host: true,
		}),
		// PWA manifest generation. Not strictly required for the site to run,
		// but enabling it avoids browsers repeatedly requesting a missing manifest.
		webmanifest({
			// See: https://github.com/alextim/astro-lib/blob/main/packages/astro-webmanifest/README.md
			name: siteConfig.title,
			short_name: "Lawson_Hart",
			description: siteConfig.description,
			lang: siteConfig.lang,
			icon: "public/icon.svg",
			icons: [
				{
					src: "icons/apple-touch-icon.png",
					sizes: "180x180",
					type: "image/png",
				},
				{
					src: "icons/icon-192.png",
					sizes: "192x192",
					type: "image/png",
				},
				{
					src: "icons/icon-512.png",
					sizes: "512x512",
					type: "image/png",
				},
			],
			start_url: "/",
			background_color: "#1e1f25",
			theme_color: "#3580ac",
			display: "standalone",
			config: {
				insertFaviconLinks: true,
				insertManifestLink: true,
				insertThemeColorMeta: true,
			},
		}),
		vue(),
	],
	markdown: {
		// Only `processor` here — the deprecated top-level `remarkPlugins`/
		// `rehypePlugins`/`remarkRehype`/`gfm` keys are gone (Astro warns on them).
		// This `processor` feeds the core `.md` pipeline; `.mdx` gets the same
		// plugins via the `mdx({...})` integration options above.
		processor: unified({
			remarkPlugins,
			rehypePlugins,
			remarkRehype: remarkRehypeOptions,
			gfm: true,
		}),
	},
	// https://docs.astro.build/en/guides/prefetch/
	prefetch: true,
	vite: {
		resolve: {
			// bun can use symlinks; preserving them can lead to duplicated module instances.
			preserveSymlinks: false,
		},
		optimizeDeps: {
			exclude: ["@resvg/resvg-js"],
			include: ["aos", "baffle"],
		},
		plugins: vitePlugins,
	},
});

function rawFonts(ext: string[]) {
	return {
		name: "vite-plugin-raw-fonts",
		// @ts-expect-error:next-line
		transform(_, id) {
			if (ext.some((e) => id.endsWith(e))) {
				const buffer = fs.readFileSync(id);
				return {
					code: `export default ${JSON.stringify(buffer)}`,
					map: null,
				};
			}
		},
	};
}
