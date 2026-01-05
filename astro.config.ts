import fs from "node:fs";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import tailwind from "@tailwindcss/vite";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import robotsTxt from "astro-robots-txt";
import webmanifest from "astro-webmanifest";
import { defineConfig } from "astro/config";
import { expressiveCodeOptions } from "./src/site.config";
import { siteConfig } from "./src/site.config";

// Remark plugins
import remarkDirective from "remark-directive"; /* Handle ::: directives as nodes */
import { remarkAdmonitions } from "./src/plugins/remark-admonitions"; /* Add admonitions */
import remarkInlineImages from "./src/plugins/remark-inline-images";

// Rehype plugins
import { rehypeHeadingIds } from "@astrojs/markdown-remark";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import rehypeUnwrapImages from "rehype-unwrap-images";
import rehypeInlineImages from "./src/plugins/rehype-inline-images";

import react from "@astrojs/react";

export default defineConfig({
	site: siteConfig.url,
	adapter: vercel(),
	image: {
		service: { entrypoint: "astro/assets/services/noop" },
	},
	integrations: [
		expressiveCode(expressiveCodeOptions),
		icon(),
		sitemap(),
		mdx(),
		robotsTxt({
			policy: [
				{
					userAgent: "*",
					allow: "/",
				},
			],
			sitemap: true,
			host: "https://lawsonhart.me",
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
		react(),
	],
	markdown: {
		rehypePlugins: [
			rehypeHeadingIds,
			[rehypeAutolinkHeadings, { behavior: "wrap", properties: { className: ["not-prose"] } }],
			[
				rehypeExternalLinks,
				{
					rel: ["noreferrer", "noopener"],
					target: "_blank",
				},
			],
			rehypeUnwrapImages,
			rehypeInlineImages({ publicPrefix: "/content-assets" }),
		],
		remarkPlugins: [
			remarkDirective,
			remarkAdmonitions,
			remarkInlineImages({ publicPrefix: "/content-assets" }),
		],
		remarkRehype: {
			footnoteLabelProperties: {
				className: [""],
			},
		},
	},
	// https://docs.astro.build/en/guides/prefetch/
	prefetch: true,
	vite: {
		resolve: {
			// Prevent "Invalid hook call" by forcing Vite to always use a single
			// React instance for both the renderer and all components.
			dedupe: ["react", "react-dom"],
			// pnpm uses symlinks; preserving them can lead to duplicated module instances.
			preserveSymlinks: false,
		},
		optimizeDeps: {
			exclude: ["@resvg/resvg-js"],
		},
		plugins: [tailwind(), rawFonts([".ttf", ".woff"])],
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
