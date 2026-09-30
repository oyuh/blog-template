import fs from "node:fs";
// Rehype plugins
import { rehypeHeadingIds, unified } from "@astrojs/markdown-remark";
import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import vue from "@astrojs/vue";
import tailwind from "@tailwindcss/vite";
import type { AstroUserConfig } from "astro";
import { defineConfig, envField } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
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

const vitePlugins = [
	tailwind(),
	rawFonts([".ttf", ".woff"]),
	boneyardPlugin(),
] as unknown as NonNullable<NonNullable<AstroUserConfig["vite"]>["plugins"]>;

// Markdown pipeline plugins, shared by the `.md` processor (`markdown.processor`)
// and the `.mdx` processor (`mdx({ processor })`). Both stay on unified so these
// remark/rehype plugins keep running; Astro 7's default Sätteri processor ignores them.
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
	// Prerender in Node, not workerd: the OG image route uses the native
	// `@resvg/resvg-js` binary and about.astro reads the filesystem.
	// `passthrough` keeps images unprocessed, matching the `noop` service below.
	adapter: cloudflare({ prerenderEnvironment: "node", imageService: "passthrough" }),
	env: {
		schema: {
			// Secret for the music-thing worker, read server-side only by /api/now-playing.
			MUSIC_THING_SECRET: envField.string({ context: "server", access: "secret", optional: true }),
		},
	},
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
					"puzzle-outline",
					"cellphone",
					"rss",
					"tools",
					"twitter",
				],
			},
		}),
		sitemap(),
		// Expressive Code only auto-injects into the `.md` processor and globally sets
		// `syntaxHighlight: false`, so `.mdx` gets its own processor with EC's rehype
		// plugin added LAST (it must run on the final code nodes). Without it, `.mdx`
		// code blocks render completely unstyled.
		mdx({
			processor: unified({
				remarkPlugins,
				rehypePlugins: [...rehypePlugins, [rehypeExpressiveCode, expressiveCodeOptions]],
				remarkRehype: remarkRehypeOptions,
				gfm: true,
			}),
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
		processor: unified({
			remarkPlugins,
			rehypePlugins,
			remarkRehype: remarkRehypeOptions,
			gfm: true,
		}),
	},
	// Astro 7 defaults to JSX-style compression, which drops the spaces between
	// newline-separated inline elements (footer links, tech lists). Keep HTML-aware.
	compressHTML: true,
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
		environments: {
			// Dev renders on-demand pages in workerd. A dependency discovered on first
			// request triggers a reload that drops that request, so pre-bundle it.
			ssr: { optimizeDeps: { include: ["astro-icon/components"] } },
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
