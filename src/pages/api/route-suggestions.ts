import { getCollection } from "astro:content";
import { getAllPosts, getUniqueTags } from "@/data/post";
import { menuLinks } from "@/site.config";
import type { APIRoute } from "astro";

export const prerender = false;

const PRIMARY_THRESHOLD = 0.8;
const FALLBACK_THRESHOLD = 0.7;
const MAX_SUGGESTIONS = 2;
const POSTS_PER_PAGE = 10;
const NOTES_PER_PAGE = 10;

type SuggestionTier = "primary" | "fallback";

type RouteSuggestion = {
	route: string;
	similarity: number;
	tier: SuggestionTier;
};

export const GET: APIRoute = async ({ request }) => {
	try {
		const url = new URL(request.url);
		const attemptedPath = toCanonicalRoute(url.searchParams.get("path") ?? "/");
		const suggestions = await getSuggestions(attemptedPath);

		return new Response(
			JSON.stringify({
				attemptedPath,
				suggestions,
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": "no-store",
				},
			},
		);
	} catch {
		return new Response(JSON.stringify({ suggestions: [] }), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "no-store",
			},
		});
	}
};

async function getSuggestions(attemptedPath: string): Promise<RouteSuggestion[]> {
	const posts = await getAllPosts();
	const notes = await getCollection("note");
	const tags = getUniqueTags(posts);
	const allCandidateRoutes = buildSitemapRoutes(
		posts,
		notes.map((note) => note.id),
		tags,
	);
	const normalizedAttemptedPath = normalizeRoute(attemptedPath);

	const rankedCandidates = allCandidateRoutes
		.map((route) => ({
			route,
			similarity: routeSimilarity(normalizedAttemptedPath, normalizeRoute(route)),
		}))
		.filter(({ route }) => route !== attemptedPath)
		.sort((left, right) => right.similarity - left.similarity);

	const primaryMatches = rankedCandidates
		.filter((candidate) => candidate.similarity >= PRIMARY_THRESHOLD)
		.slice(0, MAX_SUGGESTIONS)
		.map((candidate) => ({ ...candidate, tier: "primary" as const }));

	if (primaryMatches.length > 0) {
		return primaryMatches;
	}

	return rankedCandidates
		.filter((candidate) => candidate.similarity >= FALLBACK_THRESHOLD)
		.slice(0, MAX_SUGGESTIONS)
		.map((candidate) => ({ ...candidate, tier: "fallback" as const }));
}

function buildSitemapRoutes(
	posts: Awaited<ReturnType<typeof getAllPosts>>,
	noteIds: string[],
	tags: string[],
): string[] {
	const staticRoutes = [
		"/",
		...menuLinks.map((link) => link.path),
		"/about/",
		"/posts/",
		"/notes/",
		"/tags/",
		"/changelog/",
		"/info-stats/",
		"/themes/",
		"/resume/",
		"/policy/",
		"/policy/privacy/",
		"/policy/tos/",
		"/rss.xml",
		"/notes/rss.xml",
	];

	const postRoutes = posts.map((post) => `/posts/${post.id}/`);
	const noteRoutes = noteIds.map((noteId) => `/notes/${noteId}/`);
	const postPageCount = Math.ceil(posts.length / POSTS_PER_PAGE);
	const notePageCount = Math.ceil(noteIds.length / NOTES_PER_PAGE);

	const paginatedPostRoutes = Array.from({ length: Math.max(0, postPageCount - 1) }, (_, index) => {
		return `/posts/${index + 2}/`;
	});
	const paginatedNoteRoutes = Array.from({ length: Math.max(0, notePageCount - 1) }, (_, index) => {
		return `/notes/${index + 2}/`;
	});

	const tagRoutes = tags.flatMap((tag) => {
		const taggedPosts = posts.filter((post) => post.data.tags.includes(tag));
		const tagPageCount = Math.ceil(taggedPosts.length / POSTS_PER_PAGE);
		const paginatedRoutes = Array.from({ length: Math.max(0, tagPageCount - 1) }, (_, index) => {
			return `/tags/${tag}/${index + 2}/`;
		});
		return [`/tags/${tag}/`, ...paginatedRoutes];
	});

	return [
		...new Set(
			[
				...staticRoutes,
				...postRoutes,
				...noteRoutes,
				...paginatedPostRoutes,
				...paginatedNoteRoutes,
				...tagRoutes,
			].map(toCanonicalRoute),
		),
	];
}

function toCanonicalRoute(pathname: string): string {
	if (!pathname || pathname === "/") {
		return "/";
	}
	const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
	return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function normalizeRoute(pathname: string): string {
	return toCanonicalRoute(pathname).toLowerCase().replace(/\/+$/g, "").replace(/^\//, "");
}

function routeSimilarity(normalizedSource: string, normalizedCandidate: string): number {
	if (normalizedSource === normalizedCandidate) {
		return 1;
	}

	const sourceSegments = normalizedSource.split("/").filter(Boolean);
	const candidateSegments = normalizedCandidate.split("/").filter(Boolean);
	const segmentCount = Math.max(sourceSegments.length, candidateSegments.length);

	if (segmentCount === 0) {
		return 1;
	}

	let segmentSimilaritySum = 0;
	let segmentWordCoverageSum = 0;

	for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
		const sourceSegment = sourceSegments[segmentIndex] ?? "";
		const candidateSegment = candidateSegments[segmentIndex] ?? "";
		segmentSimilaritySum += segmentSimilarity(sourceSegment, candidateSegment);
		segmentWordCoverageSum += segmentWordCoverage(sourceSegment, candidateSegment);
	}

	const averageSegmentSimilarity = segmentSimilaritySum / segmentCount;
	const averageWordCoverage = segmentWordCoverageSum / segmentCount;
	return (averageSegmentSimilarity + averageWordCoverage) / 2;
}

function segmentSimilarity(sourceSegment: string, candidateSegment: string): number {
	if (!sourceSegment || !candidateSegment) {
		return 0;
	}
	if (sourceSegment === candidateSegment) {
		return 1;
	}

	const sourceWords = splitSegmentWords(sourceSegment);
	const candidateWords = splitSegmentWords(candidateSegment);

	if (sourceWords.length === 0 || candidateWords.length === 0) {
		return characterSimilarity(sourceSegment, candidateSegment);
	}

	const sourceToCandidateScore = average(
		sourceWords.map((sourceWord) => bestWordSimilarity(sourceWord, candidateWords)),
	);
	const candidateToSourceScore = average(
		candidateWords.map((candidateWord) => bestWordSimilarity(candidateWord, sourceWords)),
	);
	const wordSimilarityScore = (sourceToCandidateScore + candidateToSourceScore) / 2;
	const segmentCharacterSimilarity = characterSimilarity(sourceSegment, candidateSegment);

	return wordSimilarityScore * 0.8 + segmentCharacterSimilarity * 0.2;
}

function segmentWordCoverage(sourceSegment: string, candidateSegment: string): number {
	if (!sourceSegment || !candidateSegment) {
		return 0;
	}

	const sourceWords = splitSegmentWords(sourceSegment);
	const candidateWords = splitSegmentWords(candidateSegment);

	if (sourceWords.length === 0) {
		return characterSimilarity(sourceSegment, candidateSegment);
	}
	if (candidateWords.length === 0) {
		return 0;
	}

	const sourceWordMatches = sourceWords.map((sourceWord) =>
		bestWordSimilarity(sourceWord, candidateWords),
	);
	return Math.min(...sourceWordMatches);
}

function splitSegmentWords(segment: string): string[] {
	return segment
		.toLowerCase()
		.split(/[^a-z0-9]+/g)
		.map((word) => word.trim())
		.filter(Boolean);
}

function bestWordSimilarity(sourceWord: string, candidateWords: string[]): number {
	if (!candidateWords.length) {
		return 0;
	}
	return Math.max(
		...candidateWords.map((candidateWord) => characterSimilarity(sourceWord, candidateWord)),
	);
}

function characterSimilarity(sourceValue: string, targetValue: string): number {
	const maxLength = Math.max(sourceValue.length, targetValue.length);
	if (!maxLength) {
		return 1;
	}
	const distance = computeLevenshteinDistance(sourceValue, targetValue);
	return Math.max(0, 1 - distance / maxLength);
}

function average(values: number[]): number {
	if (!values.length) {
		return 0;
	}
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function computeLevenshteinDistance(sourceValue: string, targetValue: string): number {
	if (sourceValue === targetValue) {
		return 0;
	}
	if (!sourceValue.length) {
		return targetValue.length;
	}
	if (!targetValue.length) {
		return sourceValue.length;
	}

	const rows = sourceValue.length + 1;
	const columns = targetValue.length + 1;
	const matrix = Array.from({ length: rows }, () => Array<number>(columns).fill(0));

	for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
		const row = matrix[rowIndex];
		if (row) {
			row[0] = rowIndex;
		}
	}
	for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
		const firstRow = matrix[0];
		if (firstRow) {
			firstRow[columnIndex] = columnIndex;
		}
	}

	for (let rowIndex = 1; rowIndex < rows; rowIndex += 1) {
		for (let columnIndex = 1; columnIndex < columns; columnIndex += 1) {
			const substitutionCost = sourceValue[rowIndex - 1] === targetValue[columnIndex - 1] ? 0 : 1;
			const currentRow = matrix[rowIndex];
			if (!currentRow) {
				continue;
			}
			const top = matrix[rowIndex - 1]?.[columnIndex] ?? 0;
			const left = currentRow[columnIndex - 1] ?? 0;
			const topLeft = matrix[rowIndex - 1]?.[columnIndex - 1] ?? 0;
			currentRow[columnIndex] = Math.min(top + 1, left + 1, topLeft + substitutionCost);
		}
	}

	return matrix[rows - 1]?.[columns - 1] ?? Math.max(rows, columns);
}
