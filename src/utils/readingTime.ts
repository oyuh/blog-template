import type { CollectionEntry } from "astro:content";
import getReadingTime from "reading-time";

/**
 * Calculate reading time consistently across all components
 * Uses the same logic everywhere - no plugins, no complexity
 */
export function calculateReadingTime(post: CollectionEntry<"post">): string {
	try {
		const postBody = post.body || "";
		const result = getReadingTime(postBody);
		const minutes = Math.max(1, Math.ceil(result.minutes));
		return `${minutes} min read`;
	} catch (e) {
		return "1 min read";
	}
}
