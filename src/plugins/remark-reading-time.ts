import { toString as mdastToString } from "mdast-util-to-string";
import getReadingTime from "reading-time";

interface ReadingTimeResult {
	text: string; // e.g. "3 min read"
	minutes: number; // fractional minutes
	time: number; // milliseconds
	words: number;
}

export function remarkReadingTime() {
	// @ts-expect-error:next-line
	return (tree, { data }) => {
		const textOnPage = mdastToString(tree);
		const readingTime: ReadingTimeResult = getReadingTime(textOnPage) as ReadingTimeResult;

		// Ensure at least 1 minute for non-empty content
		const minutesCeil = Math.max(1, Math.ceil(readingTime.minutes));
		const readingTimeText = `${minutesCeil} min read`;

		// Store both the original library result and our normalized version
		data.astro.frontmatter.readingTime = readingTimeText;
		data.astro.frontmatter.readingTimeText = readingTimeText;
		data.astro.frontmatter.readingTimeMinutes = minutesCeil;
		data.astro.frontmatter.readingTimeWords = readingTime.words;
		data.astro.frontmatter.readingTimeOriginalMinutes = readingTime.minutes;
		// Use the reading-time library's default WPM (200) for consistency
		data.astro.frontmatter.readingTimeWPM = 200;
	};
}
