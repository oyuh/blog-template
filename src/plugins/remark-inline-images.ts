import fs from "node:fs";
import path from "node:path";
import type { Root } from "mdast";
import { visit } from "unist-util-visit";

/**
 * Remark plugin to ensure relative Markdown images load correctly without Astro optimization.
 * - Matches markdown image nodes with a relative url (./ or ../)
 * - Resolves path relative to the markdown file
 * - Copies the image to `public/content-assets/<relative-from-src/content>`
 * - Rewrites the image url to `/content-assets/<relative-from-src/content>` (absolute URL),
 *   which bypasses Astro's image optimizer and serves as-is.
 */
export default function remarkInlineImages(options?: {
	publicPrefix?: string; // default: "/content-assets"
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
		if (!sourcePath) {
			// Skip if we cannot determine source path
			return;
		}

		visit(tree, "image", (node) => {
			const url: unknown = (node as { url?: unknown }).url;
			if (typeof url !== "string") return;
			if (!url.startsWith("./") && !url.startsWith("../")) return;

			const absFrom = path.resolve(path.dirname(sourcePath), url);
			if (!absFrom.startsWith(contentRoot)) return;
			if (!fs.existsSync(absFrom)) return;

			const relFromContent = path.relative(contentRoot, absFrom);
			const destPath = path.resolve(publicRoot, publicPrefix.replace(/^\//, ""), relFromContent);
			const destDir = path.dirname(destPath);
			try {
				fs.mkdirSync(destDir, { recursive: true });
				let shouldCopy = true;
				try {
					const srcStat = fs.statSync(absFrom);
					const dstStat = fs.statSync(destPath);
					if (srcStat.mtimeMs <= dstStat.mtimeMs && srcStat.size === dstStat.size) {
						shouldCopy = false;
					}
				} catch {
					shouldCopy = true;
				}
				if (shouldCopy) fs.copyFileSync(absFrom, destPath);

				const urlPath = [
					"",
					publicPrefix.replace(/^\//, ""),
					relFromContent.split(path.sep).join("/"),
				]
					.filter(Boolean)
					.join("/");
				(node as { url: string }).url = urlPath.startsWith("/") ? urlPath : `/${urlPath}`;
			} catch (err) {
				console.warn("remark-inline-images: failed to process image", {
					url,
					from: sourcePath,
					error: err,
				});
			}
		});
	};
}
