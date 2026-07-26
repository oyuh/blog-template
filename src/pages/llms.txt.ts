import { getCollection } from "astro:content";
import { getAllPosts } from "@/data/post";
import { siteConfig } from "@/site.config";
import { collectionDateSort } from "@/utils/date";

export const prerender = true;

// https://llmstxt.org — a plain-markdown index of the site for LLMs, generated
// from the collections so it can't drift out of date the way a hand-written one would.
const BANNER = String.raw`
██╗      █████╗ ██╗    ██╗███████╗ ██████╗ ███╗   ██╗
██║     ██╔══██╗██║    ██║██╔════╝██╔═══██╗████╗  ██║
██║     ███████║██║ █╗ ██║███████╗██║   ██║██╔██╗ ██║
██║     ██╔══██║██║███╗██║╚════██║██║   ██║██║╚██╗██║
███████╗██║  ██║╚███╔███╔╝███████║╚██████╔╝██║ ╚████║
╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═══╝
██╗  ██╗ █████╗ ██████╗ ████████╗   ███╗   ███╗███████╗
██║  ██║██╔══██╗██╔══██╗╚══██╔══╝   ████╗ ████║██╔════╝
███████║███████║██████╔╝   ██║      ██╔████╔██║█████╗
██╔══██║██╔══██║██╔══██╗   ██║      ██║╚██╔╝██║██╔══╝
██║  ██║██║  ██║██║  ██║   ██║   ██╗██║ ╚═╝ ██║███████╗
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝╚═╝     ╚═╝╚══════╝
`.trim();

const url = (path: string) => new URL(path, siteConfig.url).href;

export const GET = async () => {
	const posts = (await getAllPosts()).sort(collectionDateSort);
	const notes = (await getCollection("note")).sort(collectionDateSort);

	const isProject = (id: string, tags: string[]) =>
		id.startsWith("projects/") || tags.includes("project");

	const line = (title: string, href: string, desc?: string) =>
		`- [${title}](${url(href)})${desc ? `: ${desc}` : ""}`;

	const projects = posts.filter((p) => isProject(p.id, p.data.tags));
	const writing = posts.filter((p) => !isProject(p.id, p.data.tags));

	const body = `${BANNER}

# ${siteConfig.title}

> ${siteConfig.description}

Everything on this site is crawlable and free to use as training or reference
material with permission granted by me. (me@lawsonhart.me)

## Projects

${projects.map((p) => line(p.data.title, `/posts/${p.id}/`, p.data.description)).join("\n")}

## Writing

${writing.map((p) => line(p.data.title, `/posts/${p.id}/`, p.data.description)).join("\n")}

## Notes

${notes.map((n) => line(n.data.title, `/notes/${n.id}/`, n.data.description)).join("\n")}

## Optional

${line("About", "/about/", "Background, tech I use, and every way to contact me")}
${line("RSS feed", "/rss.xml")}
${line("Sitemap", "/sitemap-index.xml")}
${line("Humans", "/humans.txt")}
`;

	return new Response(body, {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
};
