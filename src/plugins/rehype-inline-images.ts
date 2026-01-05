import fs from "node:fs";
import path from "node:path";
import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

/**
 * Rehype plugin to make relative image references in Markdown work without changing content.
 *
 * What it does:
 * - Finds <img> tags with a relative src (e.g., "./logo.png" or "../img.png")
 * - Resolves them relative to the source Markdown file
 * - Copies the image into `public/content-assets/<relative-path-from-src/content>`
 * - Rewrites the src to `/content-assets/<relative-path-from-src/content>` so it serves in dev/build
 */
export default function rehypeInlineImages(options?: {
	/** Public URL prefix where images will be served (under /public). Default: "/content-assets" */
	publicPrefix?: string;
}) {
	const publicPrefix = (options?.publicPrefix ?? "/content-assets").replace(/\/$/, "");
	const projectRoot = process.cwd();
	const contentRoot = path.resolve(projectRoot, "src", "content");
	const publicRoot = path.resolve(projectRoot, "public");

	return function transformer(tree: Root, file: unknown) {
		const vfile = (file ?? {}) as { path?: string; history?: unknown };
		const historyPath =
			Array.isArray(vfile.history) && vfile.history.length > 0
				? String(vfile.history[0])
				: undefined;
		const sourcePath: string | undefined = vfile.path ?? historyPath;
		if (!sourcePath) return;

		visit(tree, "element", (node: Element) => {
			if (node.tagName !== "img") return;
			const props = node.properties ?? {};
			const src: unknown = props.src;
			if (typeof src !== "string") return;

			// Only handle relative paths (./ or ../)
			if (!src.startsWith("./") && !src.startsWith("../")) return;

			const absFrom = path.resolve(path.dirname(sourcePath), src);

			// Ensure the source is within src/content to avoid copying arbitrary files
			if (!absFrom.startsWith(contentRoot)) return;
			if (!fs.existsSync(absFrom)) return;

			// Determine relative path under src/content
			const relFromContent = path.relative(contentRoot, absFrom); // e.g. "post/markdown-elements/logo.png"

			// Compute destination under public/content-assets/... preserving subfolders
			const destPath = path.resolve(publicRoot, publicPrefix.replace(/^\//, ""), relFromContent);
			const destDir = path.dirname(destPath);
			try {
				fs.mkdirSync(destDir, { recursive: true });
				// Only copy if missing or source is newer
				let shouldCopy = true;
				try {
					const srcStat = fs.statSync(absFrom);
					const dstStat = fs.statSync(destPath);
					if (srcStat.mtimeMs <= dstStat.mtimeMs && srcStat.size === dstStat.size) {
						shouldCopy = false;
					}
				} catch {
					// destination doesn't exist => copy
					shouldCopy = true;
				}
				if (shouldCopy) fs.copyFileSync(absFrom, destPath);

				// Rewrite the src to the new public URL (normalize to POSIX for URLs)
				const urlPath = [
					"",
					publicPrefix.replace(/^\//, ""),
					relFromContent.split(path.sep).join("/"),
				]
					.filter(Boolean)
					.join("/");

				node.properties = { ...props, src: urlPath.startsWith("/") ? urlPath : `/${urlPath}` };
			} catch (err) {
				// If anything fails, leave the src as-is to avoid breaking the page
				console.warn("rehype-inline-images: failed to process image", {
					src,
					from: sourcePath,
					error: err,
				});
			}
		});
	};
}
