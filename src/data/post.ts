import { type CollectionEntry, getCollection } from "astro:content";

export type TechnologyProject = {
	id: string;
	title: string;
	description?: string;
	publishDate: string;
	coverImage?: {
		src: string;
		alt?: string;
	};
};

export type TechnologyUsage = Record<string, { count: number; projects: TechnologyProject[] }>;

/** filter out draft posts based on the environment */
export async function getAllPosts(): Promise<CollectionEntry<"post">[]> {
	return await getCollection("post", ({ data }) => {
		return import.meta.env.PROD ? !data.draft : true;
	});
}

/** groups posts by year (based on option siteConfig.sortPostsByUpdatedDate), using the year as the key
 *  Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so.
 */
export function groupPostsByYear(posts: CollectionEntry<"post">[]) {
	return posts.reduce<Record<string, CollectionEntry<"post">[]>>((acc, post) => {
		const year = post.data.publishDate.getFullYear();
		if (!acc[year]) {
			acc[year] = [];
		}
		acc[year]?.push(post);
		return acc;
	}, {});
}

/** returns all tags created from posts (inc duplicate tags)
 *  Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so.
 *  */
export function getAllTags(posts: CollectionEntry<"post">[]) {
	return posts.flatMap((post) => [...post.data.tags]);
}

/** returns all unique tags created from posts
 *  Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so.
 *  */
export function getUniqueTags(posts: CollectionEntry<"post">[]) {
	return [...new Set(getAllTags(posts))];
}

/** returns a count of each unique tag - [[tagName, count], ...]
 *  Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so.
 *  */
export function getUniqueTagsWithCount(posts: CollectionEntry<"post">[]): [string, number][] {
	return [
		...getAllTags(posts).reduce(
			(acc, t) => acc.set(t, (acc.get(t) ?? 0) + 1),
			new Map<string, number>(),
		),
	].sort((a, b) => b[1] - a[1]);
}

/** returns all technologies created from posts (inc duplicate technologies)
 *  Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so.
 *  */
export function getAllTechnologies(posts: CollectionEntry<"post">[]) {
	return posts.flatMap((post) => [...(post.data.technologies ?? [])]);
}

/** returns all unique technologies created from posts
 *  Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so.
 *  */
export function getUniqueTechnologies(posts: CollectionEntry<"post">[]) {
	return [...new Set(getAllTechnologies(posts).map((tech) => tech.toLowerCase()))];
}

/** returns a count of each unique technology for project posts - [[techName, count], ...]
 *  Note: This function doesn't filter draft posts, pass it the result of getAllPosts above to do so.
 *  */
export function getUniqueTechnologiesWithCount(
	posts: CollectionEntry<"post">[],
): [string, number][] {
	const projectPosts = posts.filter(
		(post) => post.id.startsWith("projects/") || post.data.tags.includes("project"),
	);
	return [
		...getAllTechnologies(projectPosts).reduce(
			(acc, t) => acc.set(t.toLowerCase(), (acc.get(t.toLowerCase()) ?? 0) + 1),
			new Map<string, number>(),
		),
	].sort((a, b) => b[1] - a[1]);
}

/** returns usage data for technologies, focusing on project posts for counts */
export function getTechnologyUsage(posts: CollectionEntry<"post">[]): TechnologyUsage {
	const usage = new Map<string, { count: number; projects: TechnologyProject[] }>();
	const projectPosts = posts.filter(
		(post) => post.id.startsWith("projects/") || post.data.tags.includes("project"),
	);

	for (const post of projectPosts) {
		const technologies = post.data.technologies ?? [];
		if (!technologies.length) continue;
		for (const tech of technologies) {
			const key = tech.trim().toLowerCase();
			if (!key) continue;
			const coverImageSrc = post.data.coverImage?.src?.src;
			const coverImageAlt = post.data.coverImage?.alt;
			const entry = usage.get(key) ?? { count: 0, projects: [] };
			entry.count += 1;
			entry.projects.push({
				id: post.id,
				title: post.data.title,
				description: post.data.description,
				publishDate: post.data.publishDate.toISOString(),
				...(coverImageSrc
					? {
							coverImage: {
								src: coverImageSrc,
								...(coverImageAlt !== undefined ? { alt: coverImageAlt } : {}),
							},
						}
					: {}),
			});
			usage.set(key, entry);
		}
	}

	for (const entry of usage.values()) {
		entry.projects.sort((a, b) => b.publishDate.localeCompare(a.publishDate));
	}

	return Object.fromEntries(usage.entries());
}
