// Dev-only stand-in for the comments service, so the panel can be seen and
// used without running it. Enabled by PUBLIC_COMMENTS_MOCK=true in `astro dev`
// (CommentsInner imports this lazily behind import.meta.env.DEV, so it never
// ships). State lives in localStorage: fake comments survive a reload and are
// shared across posts by resourceId. Clear it with
// localStorage.removeItem("comments:mock:v1").
import { CommentsApiError, type CommentsAuthor, type CommentsItem, type CommentsUser, type LikerDto } from "./commentsShared";

const STORE_KEY = "comments:mock:v1";

type MockComment = CommentsItem & { threadId: string; likedBy: string[] };
type Store = { signedIn: boolean; comments: MockComment[] };

const ME: CommentsUser = {
	id: "u-me",
	githubLogin: "oyuh",
	avatarUrl: "https://github.com/oyuh.png?size=64",
	profileUrl: "https://github.com/oyuh",
	isAdmin: true,
};

const guest = (login: string) => ({
	id: `u-${login}`,
	githubLogin: login,
	avatarUrl: `https://github.com/${login}.png?size=64`,
	profileUrl: `https://github.com/${login}`,
});

function seed(threadId: string): MockComment[] {
	const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
	const c = (id: string, user: CommentsAuthor, body: string, ago: number, parent: string | null = null, likedBy: string[] = []): MockComment => ({
		id: `${threadId}:${id}`,
		threadId,
		user,
		body,
		bodyHtml: renderMarkdown(body),
		parentCommentId: parent ? `${threadId}:${parent}` : null,
		createdAt: day(ago),
		editedAt: null,
		deletedAt: null,
		likedBy,
	});
	return [
		c("1", guest("octocat"), "Really nice write-up. How did you handle `rate limits`?", 6, null, ["u-torvalds", "u-gaearon"]),
		c("2", ME, "Per-user token bucket, resets every minute. Nothing fancy.", 5, "1", ["u-octocat"]),
		c("3", guest("octocat"), "Makes sense, thanks!", 5, "2"),
		c("4", guest("torvalds"), "Would love a follow-up on moderation.\n\nAlso: did you look at hosted options first?", 2),
	];
}

function load(): Store {
	try {
		const raw = localStorage.getItem(STORE_KEY);
		if (raw) return JSON.parse(raw) as Store;
	} catch {
		// fall through to a fresh store
	}
	return { signedIn: true, comments: [] };
}

function save(store: Store) {
	localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function escapeHtml(s: string) {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ponytail: inline code, bold, italics and paragraphs only; the real service renders full markdown.
function renderMarkdown(src: string) {
	return src
		.trim()
		.split(/\n{2,}/)
		.map((para) => {
			const html = escapeHtml(para)
				.replace(/`([^`]+)`/g, "<code>$1</code>")
				.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
				.replace(/\*([^*]+)\*/g, "<em>$1</em>");
			return `<p>${html}</p>`;
		})
		.join("");
}

// Parents before children, siblings oldest first, with depth filled in.
function threaded(all: MockComment[], viewerId: string | null): CommentsItem[] {
	const out: CommentsItem[] = [];
	const walk = (parentId: string | null, depth: number) => {
		for (const c of all
			.filter((x) => (x.parentCommentId ?? null) === parentId)
			.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
			const { likedBy, threadId: _t, ...rest } = c;
			out.push({
				...rest,
				depth,
				reactions: { likeCount: likedBy.length, viewerHasLiked: viewerId ? likedBy.includes(viewerId) : false },
			});
			walk(c.id, depth + 1);
		}
	};
	walk(null, 1);
	return out;
}

function fail(status: number, code: string): never {
	throw new CommentsApiError({ status, code });
}

export function mockSignIn() {
	const store = load();
	store.signedIn = true;
	save(store);
}

export async function mockFetch<T>(path: string, init?: RequestInit): Promise<T> {
	await new Promise((r) => setTimeout(r, 150)); // let loading states show
	const url = new URL(path, "http://mock");
	const method = (init?.method ?? "GET").toUpperCase();
	const body = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {};
	const store = load();
	const me = store.signedIn ? ME : null;
	const ok = <B extends Record<string, unknown>>(code: string, b: B) => ({ ok: true, code, ...b }) as unknown as T;
	const find = (id: string) => store.comments.find((c) => c.id === id) ?? fail(404, "COMMENT_NOT_FOUND");
	const requireMe = () => me ?? fail(401, "AUTH_REQUIRED");

	if (url.pathname === "/v1/me") return ok("ME_LOADED", { user: me, csrfToken: me ? "mock" : "" });

	if (url.pathname === "/auth/logout" && method === "POST") {
		store.signedIn = false;
		save(store);
		return ok("LOGOUT_OK", {});
	}

	if (url.pathname === "/v1/threads/resolve") {
		const threadId = url.searchParams.get("resourceId") ?? "unknown";
		if (!store.comments.some((c) => c.threadId === threadId)) {
			store.comments.push(...seed(threadId));
			save(store);
		}
		return ok("THREAD_RESOLVED", { threadId });
	}

	const thread = url.pathname.match(/^\/v1\/threads\/([^/]+)\/comments$/);
	if (thread) {
		const threadId = decodeURIComponent(thread[1]!);
		if (method === "GET") {
			return ok("COMMENTS_LISTED", { comments: threaded(store.comments.filter((c) => c.threadId === threadId), me?.id ?? null) });
		}
		const user = requireMe();
		const text = String(body.body ?? "").trim();
		if (!text) fail(400, "INVALID_BODY");
		const parentId = (body.parentCommentId as string | null) ?? null;
		if (parentId) find(parentId);
		const id = `${threadId}:${crypto.randomUUID()}`;
		store.comments.push({
			id,
			threadId,
			user,
			body: text,
			bodyHtml: renderMarkdown(text),
			parentCommentId: parentId,
			createdAt: new Date().toISOString(),
			editedAt: null,
			deletedAt: null,
			likedBy: [],
		});
		save(store);
		return ok("COMMENT_CREATED", { commentId: id });
	}

	const reactions = url.pathname.match(/^\/v1\/comments\/([^/]+)\/reactions$/);
	if (reactions) {
		const c = find(decodeURIComponent(reactions[1]!));
		if (method === "GET") {
			const users: LikerDto[] = c.likedBy.map((uid) => {
				const login = uid === ME.id ? ME.githubLogin : uid.replace(/^u-/, "");
				return { ...guest(login), id: uid, displayName: null, reactedAt: c.createdAt };
			});
			return ok("REACTIONS_LISTED", { commentId: c.id, reaction: "like", users });
		}
		const user = requireMe();
		c.likedBy = c.likedBy.includes(user.id) ? c.likedBy.filter((u) => u !== user.id) : [...c.likedBy, user.id];
		save(store);
		return ok("REACTION_TOGGLED", { reaction: "like", likeCount: c.likedBy.length, viewerHasReacted: c.likedBy.includes(user.id) });
	}

	const one = url.pathname.match(/^\/v1\/comments\/([^/]+)$/);
	if (one) {
		requireMe();
		const c = find(decodeURIComponent(one[1]!));
		if (method === "PATCH") {
			c.body = String(body.body ?? "").trim();
			c.bodyHtml = renderMarkdown(c.body);
			c.editedAt = new Date().toISOString();
			save(store);
			return ok("COMMENT_UPDATED", { comment: { id: c.id, body: c.body, bodyHtml: c.bodyHtml, editedAt: c.editedAt } });
		}
		if (method === "DELETE") {
			c.deletedAt = new Date().toISOString();
			save(store);
			return ok("COMMENT_DELETED_SOFT", {});
		}
	}

	return fail(404, "NOT_FOUND");
}
