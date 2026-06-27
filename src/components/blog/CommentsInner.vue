<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { computed, onBeforeUnmount, onMounted, provide, reactive, ref, watch } from "vue";
import {
	type ApiOkResponse,
	type CommentsAuthor,
	type CommentsCtx,
	type CommentsItem,
	type CommentsMeResponse,
	type CommentsUser,
	CommentsApiError,
	commentsCtxKey,
	formatDate,
	formatDateTime,
	isApiAnyResponse,
	type LikerDto,
	type ListCommentsResponse,
	type ReplyTarget,
	type ResolveThreadResponse,
	stripHtml,
	tryParseJson,
} from "./commentsShared";
import CommentsPanel from "./CommentsPanel.vue";

const props = defineProps<{
	siteKey: string;
	resourceType: string;
	resourceId: string;
	variant?: "sidebar" | "overlay";
}>();

const OPEN_STATE_KEY = "comments:open:v1";
const DESKTOP_MQL = "(min-width: 1024px)";
const SITE_AUTHOR_GITHUB_LOGIN = "oyuh";

const variant = computed(() => props.variant ?? "sidebar");

const debug = String(import.meta.env.PUBLIC_COMMENTS_DEBUG ?? "").toLowerCase() === "true";
function log(...args: unknown[]) {
	if (debug) console.log("[comments]", ...args);
}
function logError(...args: unknown[]) {
	if (debug) console.error("[comments]", ...args);
}

const apiOrigin = (() => {
	const fromEnv = import.meta.env.PUBLIC_COMMENTS_API_ORIGIN;
	return fromEnv && fromEnv.trim().length > 0 ? fromEnv : "https://comments.lawsonhart.me";
})();

// --- state ----------------------------------------------------------------
const isDesktop = ref<boolean>(
	typeof window === "undefined" ? true : window.matchMedia(DESKTOP_MQL).matches,
);
const me = ref<CommentsUser | null>(null);
const csrfToken = ref("");
const threadId = ref<string | null>(null);
const comments = ref<CommentsItem[]>([]);
const body = ref("");
const loading = ref(true);
const submitting = ref(false);
const signingOut = ref(false);
const error = ref<string | null>(null);
const replyTo = ref<ReplyTarget | null>(null);
const dockOpen = ref(false);
const recentLoginAttempt = ref(false);
const openMenuId = ref<string | null>(null);
const openMenuPos = ref<{ top: number; left: number } | null>(null);
const editingCommentId = ref<string | null>(null);
const editBody = ref("");
const editSubmitting = ref(false);
const confirmDeleteCommentId = ref<string | null>(null);
const deletingCommentId = ref<string | null>(null);
const reactingCommentId = ref<string | null>(null);
const likersTooltip = ref<{ commentId: string; top: number; left: number } | null>(null);
const likersLoadingFor = ref<string | null>(null);
const likersByCommentId = ref<Record<string, LikerDto[]>>({});
const mobileOpen = ref(false);

const popupScrollRef = ref<HTMLDivElement | null>(null);
const textareaEl = ref<HTMLTextAreaElement | null>(null);
const replyTextareaEl = ref<HTMLTextAreaElement | null>(null);

const canonicalUrl = computed(() => (typeof window === "undefined" ? "" : window.location.href));

const resolvedResourceId = computed(() => {
	if (typeof window === "undefined") return props.resourceId;
	try {
		const href = canonicalUrl.value || window.location.href;
		const url = new URL(href);
		const postsPrefix = "/posts/";
		if (!url.pathname.startsWith(postsPrefix)) return props.resourceId;
		const raw = url.pathname.slice(postsPrefix.length).replace(/\/+$/, "");
		if (raw.length === 0) return props.resourceId;
		const decoded = decodeURIComponent(raw);
		const normalized = decoded.endsWith("/index") ? decoded.slice(0, -"/index".length) : decoded;
		return normalized.length > 0 ? normalized : props.resourceId;
	} catch {
		return props.resourceId;
	}
});

const signInUrl = computed(() => {
	const returnTo = canonicalUrl.value || "https://lawsonhart.me";
	return `${apiOrigin}/auth/github/start?returnTo=${encodeURIComponent(returnTo)}`;
});

function clearRecentLoginAttempt() {
	recentLoginAttempt.value = false;
	if (typeof window === "undefined") return;
	try {
		window.sessionStorage.removeItem("comments:loginAttemptAt");
	} catch {
		// ignore
	}
}

// --- networking -----------------------------------------------------------
async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
	const url = `${apiOrigin}${path}`;
	const method = (init?.method ?? "GET").toUpperCase();
	const hasBody = init?.body !== undefined;

	const headers: Record<string, string> = {};
	const providedHeaders = init?.headers;
	if (providedHeaders) {
		if (providedHeaders instanceof Headers) {
			for (const [k, v] of providedHeaders.entries()) headers[k] = v;
		} else if (Array.isArray(providedHeaders)) {
			for (const [k, v] of providedHeaders) headers[k] = v;
		} else {
			for (const [k, v] of Object.entries(providedHeaders)) headers[k] = v;
		}
	}
	if (hasBody && !headers["Content-Type"]) {
		headers["Content-Type"] = "application/json";
	}

	log("request", { method, path, hasBody, headers: Object.keys(headers) });

	let response: Response;
	try {
		response = await fetch(url, { ...init, credentials: "include", headers });
	} catch (e) {
		logError("network error", { method, path, error: e });
		throw e instanceof Error ? e : new Error("Network error");
	}
	log("response", { method, path, status: response.status, ok: response.ok });

	if (response.status === 204) return undefined as T;

	const text = await response.text().catch(() => "");
	const contentType = response.headers.get("content-type") ?? "";
	const maybeJson =
		contentType.includes("application/json") ||
		text.trim().startsWith("{") ||
		text.trim().startsWith("[");
	const parsed = maybeJson ? tryParseJson(text) : undefined;
	const parsedIsApi = isApiAnyResponse(parsed);

	if (!response.ok) {
		logError("response not ok", { method, path, status: response.status, text });
		if (parsedIsApi) {
			throw new CommentsApiError({ status: response.status, code: parsed.code, payload: parsed });
		}
		throw new CommentsApiError({
			status: response.status,
			message: text || `Request failed (${response.status})`,
		});
	}

	if (parsedIsApi && parsed.ok === false) {
		throw new CommentsApiError({ status: response.status, code: parsed.code, payload: parsed });
	}

	if (parsed !== undefined) return parsed as T;
	if (!text) return undefined as T;
	return text as unknown as T;
}

function formatApiErrorForUi(e: unknown): string {
	if (e instanceof CommentsApiError && typeof e.code === "string") {
		const code = e.code;
		const p = e.payload ?? {};
		switch (code) {
			case "AUTH_REQUIRED":
				return "You must be signed in.";
			case "BANNED":
				return "Your account is banned.";
			case "PREBANNED":
				return "Sign-in is disabled for your account.";
			case "ADMIN_REQUIRED":
			case "FORBIDDEN":
				return "You don’t have permission to do that.";
			case "CSRF_INVALID":
				return "Security check failed. Refresh the page and try again.";
			case "MUTATION_ORIGIN_REQUIRED":
				return "Request blocked: missing Origin header.";
			case "MUTATION_ORIGIN_NOT_ALLOWED":
				return "Request blocked: this site origin is not allowed.";
			case "INVALID_BODY":
				return "Invalid request.";
			case "INVALID_QUERY":
				return "Invalid request.";
			case "THREAD_NOT_FOUND":
				return "Comment thread not found.";
			case "SITE_KEY_INVALID":
				return "Comments are misconfigured (site key invalid).";
			case "RESOURCE_ID_NOT_ALLOWED":
				return "Comments are not enabled for this page.";
			case "RSS_VALIDATION_FAILED":
				return "Comments allowlist validation failed.";
			case "RSS_FETCH_FAILED":
				return "Comments allowlist fetch failed.";
			case "COMMENT_NOT_FOUND":
				return "Comment not found.";
			case "PARENT_COMMENT_NOT_FOUND":
				return "That parent comment no longer exists.";
			case "PARENT_COMMENT_WRONG_THREAD":
				return "Invalid reply target.";
			case "COMMENT_LIMIT_REACHED": {
				const limit = typeof p.limit === "number" ? p.limit : undefined;
				return limit ? `Comment limit reached (${limit}).` : "Comment limit reached.";
			}
			case "REPLY_DEPTH_LIMIT": {
				const maxDepth = typeof p.maxDepth === "number" ? p.maxDepth : undefined;
				return maxDepth
					? `Reply depth limit reached (max ${maxDepth}).`
					: "Reply depth limit reached.";
			}
			case "RATE_LIMITED": {
				const resetAt = typeof p.resetAt === "number" ? p.resetAt : undefined;
				if (!resetAt) return "Too many requests. Try again shortly.";
				const when = new Date(resetAt);
				return Number.isNaN(when.getTime())
					? "Too many requests. Try again shortly."
					: `Too many requests. Try again at ${when.toLocaleTimeString()}.`;
			}
			default:
				return `Request failed (${code}).`;
		}
	}
	if (e instanceof Error) return e.message;
	return "Request failed.";
}

async function refresh() {
	log("refresh:start");
	error.value = null;
	loading.value = true;
	try {
		const meResponse = await fetchJson<CommentsMeResponse>("/v1/me", {
			method: "GET",
			cache: "no-store",
		});
		me.value = meResponse.user;
		csrfToken.value = meResponse.csrfToken ?? "";
		if (meResponse.user) clearRecentLoginAttempt();

		const makeCandidates = (): string[] => {
			const candidates: string[] = [];
			const push = (value: string | null | undefined) => {
				const v = (value ?? "").trim();
				if (!v) return;
				if (candidates.includes(v)) return;
				candidates.push(v);
			};
			push(resolvedResourceId.value);
			push(props.resourceId);
			if (!resolvedResourceId.value.endsWith("/index")) push(`${resolvedResourceId.value}/index`);
			if (resolvedResourceId.value.endsWith("/index"))
				push(resolvedResourceId.value.slice(0, -"/index".length));
			if (!props.resourceId.endsWith("/index")) push(`${props.resourceId}/index`);
			if (props.resourceId.endsWith("/index")) push(props.resourceId.slice(0, -"/index".length));
			return candidates;
		};

		const candidates = makeCandidates();
		let resolve: ResolveThreadResponse | null = null;
		let lastResolveError: unknown = null;
		for (const candidate of candidates) {
			try {
				const resolveUrl = new URL(`${apiOrigin}/v1/threads/resolve`);
				resolveUrl.searchParams.set("siteKey", props.siteKey);
				resolveUrl.searchParams.set("resourceType", props.resourceType);
				resolveUrl.searchParams.set("resourceId", candidate);
				if (canonicalUrl.value) resolveUrl.searchParams.set("canonicalUrl", canonicalUrl.value);
				resolve = await fetchJson<ResolveThreadResponse>(resolveUrl.pathname + resolveUrl.search, {
					method: "GET",
				});
				break;
			} catch (e) {
				lastResolveError = e;
				if (e instanceof CommentsApiError && e.code === "RESOURCE_ID_NOT_ALLOWED") continue;
				throw e;
			}
		}
		if (!resolve) throw lastResolveError;

		threadId.value = resolve.threadId;

		const listUrl = new URL(
			`${apiOrigin}/v1/threads/${encodeURIComponent(resolve.threadId)}/comments`,
		);
		listUrl.searchParams.set("limit", "50");
		const list = await fetchJson<ListCommentsResponse>(listUrl.pathname + listUrl.search, {
			method: "GET",
		});
		comments.value = list.comments ?? [];
	} catch (e) {
		logError("refresh:error", e);
		const message = formatApiErrorForUi(e);
		const hint =
			message === "Failed to fetch"
				? " (network/CORS). Check DevTools Network for /v1/me and ensure the service BLOG_ORIGINS includes this page origin (including www if used), and that CORS allows credentials."
				: "";
		error.value = `${message}${hint}`;
	} finally {
		loading.value = false;
		log("refresh:done");
	}
}

async function submit() {
	if (!threadId.value) return;
	const trimmed = body.value.trim();
	if (trimmed.length === 0) return;
	submitting.value = true;
	error.value = null;
	try {
		await fetchJson<ApiOkResponse<"COMMENT_CREATED", { commentId: string }>>(
			`/v1/threads/${encodeURIComponent(threadId.value)}/comments`,
			{
				method: "POST",
				body: JSON.stringify({ body: trimmed, parentCommentId: replyTo.value?.id ?? null }),
				...(csrfToken.value ? { headers: { "X-CSRF-Token": csrfToken.value } } : {}),
			},
		);
		body.value = "";
		replyTo.value = null;
		await refresh();
	} catch (e) {
		logError("comment:post:error", e);
		error.value = formatApiErrorForUi(e) || "Failed to submit comment";
	} finally {
		submitting.value = false;
	}
}

async function signOut() {
	signingOut.value = true;
	error.value = null;
	try {
		await fetchJson<ApiOkResponse<"LOGOUT_OK", Record<string, never>>>("/auth/logout", {
			method: "POST",
			...(csrfToken.value ? { headers: { "X-CSRF-Token": csrfToken.value } } : {}),
		});
		clearRecentLoginAttempt();
		me.value = null;
		csrfToken.value = "";
		await refresh();
	} catch (e) {
		logError("auth:logout:error", e);
		error.value = formatApiErrorForUi(e) || "Failed to sign out";
	} finally {
		signingOut.value = false;
	}
}

async function remove(commentId: string): Promise<boolean> {
	error.value = null;
	try {
		await fetchJson<
			ApiOkResponse<"COMMENT_DELETED_SOFT" | "COMMENT_DELETED_HARD", Record<string, never>>
		>(`/v1/comments/${encodeURIComponent(commentId)}`, {
			method: "DELETE",
			...(csrfToken.value ? { headers: { "X-CSRF-Token": csrfToken.value } } : {}),
		});
		await refresh();
		return true;
	} catch (e) {
		logError("comment:delete:error", e);
		error.value = formatApiErrorForUi(e) || "Failed to delete comment";
		return false;
	}
}

async function toggleLike(commentId: string) {
	if (!csrfToken.value) {
		error.value = "You must be signed in to react.";
		return;
	}
	reactingCommentId.value = commentId;
	error.value = null;
	try {
		const result = await fetchJson<
			ApiOkResponse<
				"REACTION_TOGGLED",
				{ reaction: string; likeCount: number; viewerHasReacted: boolean }
			>
		>(`/v1/comments/${encodeURIComponent(commentId)}/reactions`, {
			method: "POST",
			body: JSON.stringify({ reaction: "like" }),
			headers: { "X-CSRF-Token": csrfToken.value },
		});
		comments.value = comments.value.map((c) =>
			c.id === commentId
				? { ...c, reactions: { likeCount: result.likeCount, viewerHasLiked: result.viewerHasReacted } }
				: c,
		);

		// Keep the “Liked by” tooltip cache in sync so users don't need a refresh.
		const existing = likersByCommentId.value[commentId];
		const meVal = me.value;
		if (existing && meVal) {
			const isMe = (u: LikerDto) => u.id === meVal.id || u.githubLogin === meVal.githubLogin;
			const hasMe = existing.some(isMe);
			if (result.viewerHasReacted) {
				if (!hasMe) {
					const profileUrl = meVal.profileUrl ?? `https://github.com/${meVal.githubLogin}`;
					const avatarUrl =
						meVal.avatarUrl ??
						`https://github.com/${encodeURIComponent(meVal.githubLogin)}.png?size=32`;
					const meDto: LikerDto = {
						id: meVal.id,
						githubLogin: meVal.githubLogin,
						displayName: null,
						avatarUrl,
						profileUrl,
						reactedAt: new Date().toISOString(),
					};
					likersByCommentId.value = {
						...likersByCommentId.value,
						[commentId]: [meDto, ...existing],
					};
				}
			} else if (hasMe) {
				likersByCommentId.value = {
					...likersByCommentId.value,
					[commentId]: existing.filter((u) => !isMe(u)),
				};
			}
		}
	} catch (e) {
		logError("comment:reaction:error", e);
		error.value = formatApiErrorForUi(e) || "Failed to react";
	} finally {
		reactingCommentId.value = null;
	}
}

async function saveEdit(commentId: string, nextBody: string) {
	if (!csrfToken.value) {
		error.value = "You must be signed in to edit.";
		return;
	}
	const trimmed = nextBody.trim();
	if (trimmed.length === 0) return;
	editSubmitting.value = true;
	error.value = null;
	try {
		const result = await fetchJson<
			ApiOkResponse<
				"COMMENT_UPDATED",
				{
					comment: {
						id: string;
						body: string;
						bodyHtml?: string;
						updatedAt?: string;
						editedAt?: string | null;
					};
				}
			>
		>(`/v1/comments/${encodeURIComponent(commentId)}`, {
			method: "PATCH",
			body: JSON.stringify({ body: trimmed }),
			headers: { "X-CSRF-Token": csrfToken.value },
		});
		comments.value = comments.value.map((c) =>
			c.id === commentId
				? {
						...c,
						body: result.comment.body,
						...(typeof result.comment.bodyHtml === "string"
							? { bodyHtml: result.comment.bodyHtml }
							: {}),
						...(typeof result.comment.updatedAt === "string"
							? { updatedAt: result.comment.updatedAt }
							: {}),
						editedAt:
							result.comment.editedAt === undefined
								? (c.editedAt ?? null)
								: result.comment.editedAt,
					}
				: c,
		);
		editingCommentId.value = null;
		editBody.value = "";
	} catch (e) {
		logError("comment:edit:error", e);
		const message = formatApiErrorForUi(e) || "Failed to edit comment";
		const hint =
			message === "Failed to fetch"
				? " (network/CORS). Your comments service must allow CORS credentials AND allow the PATCH method + the X-CSRF-Token header. Reactions work via POST, but edits use PATCH."
				: "";
		error.value = `${message}${hint}`;
	} finally {
		editSubmitting.value = false;
	}
}

// --- derived helpers ------------------------------------------------------
function getCommentUser(c: CommentsItem): CommentsAuthor | undefined {
	return c.user ?? c.author;
}
function getCommentBodyText(c: CommentsItem): string {
	if (typeof c.body === "string") return c.body;
	if (typeof c.bodyHtml === "string") return stripHtml(c.bodyHtml);
	return "";
}
function getCommentReactions(c: CommentsItem) {
	return c.reactions ?? { likeCount: 0, viewerHasLiked: false };
}
function canModifyComment(c: CommentsItem): boolean {
	if (!me.value) return false;
	if (me.value.isAdmin) return true;
	if (typeof c.canDelete === "boolean") return c.canDelete;
	const commentUserId = getCommentUser(c)?.id;
	return Boolean(commentUserId && commentUserId === me.value.id);
}
function isOwnComment(c: CommentsItem): boolean {
	if (!me.value) return false;
	const u = getCommentUser(c);
	if (!u) return false;
	if (u.id && u.id === me.value.id) return true;
	if (!u.githubLogin) return false;
	return u.githubLogin.toLowerCase() === me.value.githubLogin.toLowerCase();
}
function isAuthorComment(c: CommentsItem): boolean {
	const u = getCommentUser(c);
	if (!u?.githubLogin) return false;
	return u.githubLogin.toLowerCase() === SITE_AUTHOR_GITHUB_LOGIN;
}

const canReply = computed(() => {
	if (!me.value) return false;
	if (!replyTo.value) return true;
	return replyTo.value.depth < 5;
});

const commentById = computed(() => {
	const map = new Map<string, CommentsItem>();
	for (const c of comments.value) map.set(c.id, c);
	return map;
});

const activeComments = computed(() => comments.value.filter((c) => !c.deletedAt));
const count = computed(() => activeComments.value.length);

function previewText(text: string, maxLen: number) {
	const trimmed = text.trim().replace(/\s+/g, " ");
	if (trimmed.length <= maxLen) return trimmed;
	return `${trimmed.slice(0, Math.max(0, maxLen - 1))}…`;
}

function scrollToComment(commentId: string) {
	if (typeof document === "undefined") return;
	const el = document.getElementById(`comment-${commentId}`);
	el?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function focusComposer() {
	if (typeof window === "undefined") return;
	if (replyTo.value) {
		scrollToComment(replyTo.value.id);
		window.requestAnimationFrame(() => replyTextareaEl.value?.focus());
		return;
	}
	popupScrollRef.value?.scrollTo({ top: 0, behavior: "smooth" });
	window.requestAnimationFrame(() => textareaEl.value?.focus());
}

function beginReply(c: CommentsItem) {
	replyTo.value = {
		id: c.id,
		depth: c.depth ?? 1,
		login: (c.author ?? c.user)?.githubLogin ?? "",
		preview: previewText(getCommentBodyText(c), 90),
	};
}

function cancelReply() {
	replyTo.value = null;
}
function cancelEdit() {
	editingCommentId.value = null;
	editBody.value = "";
}

function openMenuFor(commentId: string, buttonEl: HTMLElement) {
	const rect = buttonEl.getBoundingClientRect();
	const gap = 8;
	const left = Math.min(rect.right, window.innerWidth - gap);
	const top = Math.min(rect.bottom + 6, window.innerHeight - gap);
	openMenuPos.value = { top, left: Math.max(gap, left) };
	openMenuId.value = commentId;
}

function toggleMenu(commentId: string, buttonEl: HTMLElement) {
	if (openMenuId.value === commentId) {
		openMenuId.value = null;
		openMenuPos.value = null;
		return;
	}
	openMenuFor(commentId, buttonEl);
}

function startEdit(c: CommentsItem) {
	openMenuId.value = null;
	openMenuPos.value = null;
	editingCommentId.value = c.id;
	editBody.value = typeof c.body === "string" ? c.body : getCommentBodyText(c);
	try {
		window.requestAnimationFrame(() => {
			(document.getElementById(`comment-edit-${c.id}`) as HTMLTextAreaElement | null)?.focus();
		});
	} catch {
		// ignore
	}
}

async function confirmDelete(c: CommentsItem) {
	deletingCommentId.value = c.id;
	const ok = await remove(c.id);
	deletingCommentId.value = null;
	confirmDeleteCommentId.value = null;
	if (ok) {
		openMenuId.value = null;
		openMenuPos.value = null;
	}
}

async function listLikers(commentId: string): Promise<LikerDto[]> {
	const url = new URL(`${apiOrigin}/v1/comments/${encodeURIComponent(commentId)}/reactions`);
	url.searchParams.set("limit", "50");
	const data = await fetchJson<
		ApiOkResponse<"REACTIONS_LISTED", { commentId: string; reaction: "like"; users: LikerDto[] }>
	>(url.pathname + url.search, { method: "GET", cache: "no-store" });
	return data.users ?? [];
}

function openLikersTooltipFor(commentId: string, buttonEl: HTMLElement) {
	const rect = buttonEl.getBoundingClientRect();
	const gap = 8;
	const left = Math.min(Math.max(gap, rect.left), window.innerWidth - gap);
	const top = Math.max(gap, rect.top - 8);
	likersTooltip.value = { commentId, top, left };
}

function hoverLikers(commentId: string, buttonEl: HTMLElement) {
	openLikersTooltipFor(commentId, buttonEl);
	if (likersByCommentId.value[commentId]) return;
	likersLoadingFor.value = commentId;
	void listLikers(commentId)
		.then((users) => {
			likersByCommentId.value = { ...likersByCommentId.value, [commentId]: users };
		})
		.catch((err) => {
			logError("comment:likers:error", err);
			likersByCommentId.value = { ...likersByCommentId.value, [commentId]: [] };
		})
		.finally(() => {
			if (likersLoadingFor.value === commentId) likersLoadingFor.value = null;
		});
}

function leaveLikers() {
	likersTooltip.value = null;
}

function onLoginClick() {
	log("auth:login:click", { signInUrl: signInUrl.value, canonicalUrl: canonicalUrl.value });
	try {
		window.sessionStorage.setItem("comments:loginAttemptAt", String(Date.now()));
	} catch {
		// ignore
	}
}

function closeCommentsMobile() {
	mobileOpen.value = false;
	try {
		window.dispatchEvent(new CustomEvent("comments:close"));
	} catch {
		// ignore
	}
}

function registerTextarea(el: Element | null) {
	textareaEl.value = el as HTMLTextAreaElement | null;
}
function registerReplyTextarea(el: Element | null) {
	replyTextareaEl.value = el as HTMLTextAreaElement | null;
}

// --- action menu / tooltip derived ---------------------------------------
const actionsMenuComment = computed(() =>
	openMenuId.value ? (comments.value.find((c) => c.id === openMenuId.value) ?? null) : null,
);
const menuCanReply = computed(() => {
	const c = actionsMenuComment.value;
	return Boolean(c && me.value && !c.deletedAt && (c.depth ?? 1) < 5 && isOwnComment(c));
});
const menuCanModify = computed(() => {
	const c = actionsMenuComment.value;
	return Boolean(c && !c.deletedAt && canModifyComment(c));
});
const actionsMenuVisible = computed(() =>
	Boolean(
		openMenuId.value &&
			openMenuPos.value &&
			actionsMenuComment.value &&
			(menuCanReply.value || menuCanModify.value),
	),
);

const likersTooltipUsers = computed(() =>
	likersTooltip.value ? (likersByCommentId.value[likersTooltip.value.commentId] ?? []) : [],
);
const likersTooltipLoading = computed(
	() => !!likersTooltip.value && likersLoadingFor.value === likersTooltip.value.commentId,
);

// --- lifecycle / effects --------------------------------------------------
let detachMql: (() => void) | null = null;
let detachCommentsEvents: (() => void) | null = null;

onMounted(() => {
	// recent login attempt detection
	try {
		const raw = window.sessionStorage.getItem("comments:loginAttemptAt");
		if (raw) {
			const ts = Number(raw);
			if (Number.isFinite(ts) && Date.now() - ts < 2 * 60 * 1000) recentLoginAttempt.value = true;
		}
	} catch {
		// ignore
	}

	// desktop media query
	const mql = window.matchMedia(DESKTOP_MQL);
	const onChange = (e: MediaQueryListEvent) => {
		isDesktop.value = e.matches;
		if (!e.matches) {
			mobileOpen.value = false;
			replyTo.value = null;
			openMenuId.value = null;
			openMenuPos.value = null;
		}
	};
	mql.addEventListener("change", onChange);
	detachMql = () => mql.removeEventListener("change", onChange);

	// open/close events route to the right instance
	const onOpen = () => {
		if (isDesktop.value) {
			if (variant.value !== "overlay") dockOpen.value = true;
		} else if (variant.value === "overlay") {
			mobileOpen.value = true;
		}
	};
	const onClose = () => {
		if (isDesktop.value) {
			if (variant.value !== "overlay") dockOpen.value = false;
		} else if (variant.value === "overlay") {
			mobileOpen.value = false;
		}
	};
	window.addEventListener("comments:open", onOpen as EventListener);
	window.addEventListener("comments:close", onClose as EventListener);
	detachCommentsEvents = () => {
		window.removeEventListener("comments:open", onOpen as EventListener);
		window.removeEventListener("comments:close", onClose as EventListener);
	};

	// restore desktop dock open state
	if (isDesktop.value && variant.value !== "overlay") {
		try {
			if (window.localStorage.getItem(OPEN_STATE_KEY) === "true") dockOpen.value = true;
		} catch {
			// ignore
		}
	}
});

// initial + on-desktop refresh
watch(isDesktop, (d) => { if (d) void refresh(); }, { immediate: true });

// mobile lazy-load when the overlay opens
watch(mobileOpen, (open) => {
	if (!isDesktop.value && open) void refresh();

	if (typeof document === "undefined") return;
	const actions = document.getElementById("mobile-toc-actions") as HTMLElement | null;
	const navToggle = document.getElementById("mobile-nav-toggle") as HTMLElement | null;
	if (open) {
		bodyOverflowPrev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		tocPrev = { actions: actions?.style.display ?? "", navToggle: navToggle?.style.display ?? "" };
		if (actions) actions.style.display = "none";
		if (navToggle) navToggle.style.display = "none";
	} else {
		document.body.style.overflow = bodyOverflowPrev;
		if (actions) actions.style.display = tocPrev.actions;
		if (navToggle) navToggle.style.display = tocPrev.navToggle;
	}
});
let bodyOverflowPrev = "";
let tocPrev = { actions: "", navToggle: "" };

// persist dock state
watch(dockOpen, (v) => {
	if (variant.value === "overlay") return;
	try {
		window.localStorage.setItem(OPEN_STATE_KEY, String(v));
	} catch {
		// ignore
	}
});

// login-return-but-still-signed-out diagnostic
watch([loading, recentLoginAttempt, me], () => {
	if (loading.value || !recentLoginAttempt.value || me.value) return;
	let origin: string | null = null;
	try {
		origin = canonicalUrl.value ? new URL(canonicalUrl.value).origin : null;
	} catch {
		origin = null;
	}
	if (error.value != null) return;
	error.value = `Login returned but you're still signed out. Service-side check: BLOG_ORIGINS must include ${origin ?? "this page origin"} (include www if used), and /auth/github/start must be able to redirect to GitHub.${
		origin?.startsWith("http://localhost") && apiOrigin.startsWith("https://")
			? "\n\nLocal dev note: you're on localhost but using an HTTPS comments service. With cookies set to SameSite=Lax (recommended for production), the browser will NOT send the session cookie on fetch() from localhost → comments origin, so /v1/me will always look logged out. Fix: run the comments service locally (PUBLIC_COMMENTS_API_ORIGIN=http://localhost:3000 + SERVICE_ORIGIN=http://localhost:3000 + BLOG_ORIGINS includes http://localhost:4321), or use a separate dev deployment configured with COOKIE_SAMESITE=none (and Secure) just for localhost testing."
			: ""
	}`;
});

// focus the reply composer when a reply target is set
watch(replyTo, (rt) => {
	if (!rt) return;
	try {
		scrollToComment(rt.id);
		window.requestAnimationFrame(() => replyTextareaEl.value?.focus());
	} catch {
		// ignore
	}
});

// action menu: outside-click / escape / scroll dismissal
let detachMenu: (() => void) | null = null;
watch(openMenuId, (id) => {
	confirmDeleteCommentId.value = null;
	detachMenu?.();
	detachMenu = null;
	if (!id || typeof document === "undefined") return;

	const close = () => {
		openMenuId.value = null;
		openMenuPos.value = null;
	};
	const onMouseDown = (e: MouseEvent) => {
		if (!(e.target instanceof Node)) return;
		const menuEl = document.getElementById(`comment-menu-${id}`);
		const buttonEl = document.getElementById(`comment-menu-btn-${id}`);
		if (menuEl?.contains(e.target)) return;
		if (buttonEl?.contains(e.target)) return;
		close();
	};
	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Escape") close();
	};
	document.addEventListener("mousedown", onMouseDown);
	document.addEventListener("keydown", onKeyDown);
	window.addEventListener("resize", close);
	window.addEventListener("scroll", close, { capture: true });
	popupScrollRef.value?.addEventListener("scroll", close, { passive: true });
	detachMenu = () => {
		document.removeEventListener("mousedown", onMouseDown);
		document.removeEventListener("keydown", onKeyDown);
		window.removeEventListener("resize", close);
		window.removeEventListener("scroll", close, { capture: true } as never);
		popupScrollRef.value?.removeEventListener("scroll", close as EventListener);
	};
});

// likers tooltip: escape dismissal
let detachLikers: (() => void) | null = null;
watch(likersTooltip, (t) => {
	detachLikers?.();
	detachLikers = null;
	if (!t || typeof document === "undefined") return;
	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Escape") likersTooltip.value = null;
	};
	document.addEventListener("keydown", onKeyDown);
	detachLikers = () => document.removeEventListener("keydown", onKeyDown);
});

onBeforeUnmount(() => {
	detachMql?.();
	detachCommentsEvents?.();
	detachMenu?.();
	detachLikers?.();
	if (typeof document !== "undefined") document.body.style.overflow = bodyOverflowPrev;
});

// --- controller for the shared panel -------------------------------------
const ctx: CommentsCtx = reactive({
	isDesktop,
	me,
	error,
	loading,
	comments,
	body,
	submitting,
	signingOut,
	signInUrl,
	canReply,
	replyTo,
	editingCommentId,
	editBody,
	editSubmitting,
	reactingCommentId,
	openMenuId,
	commentById,
	signOut,
	submit,
	saveEdit,
	cancelEdit,
	cancelReply,
	toggleLike,
	beginReply,
	focusComposer,
	toggleMenu,
	hoverLikers,
	leaveLikers,
	scrollToComment,
	onLoginClick,
	registerTextarea,
	registerReplyTextarea,
	getCommentUser,
	getCommentBodyText,
	getCommentReactions,
	isOwnComment,
	isAuthorComment,
	canModifyComment,
	previewText,
	formatDate,
	formatDateTime,
}) as CommentsCtx;

provide(commentsCtxKey, ctx);
</script>

<template>
	<!-- Mobile sheet (overlay instance) -->
	<Teleport v-if="!isDesktop && mobileOpen" to="body">
		<dialog open class="fixed inset-0 z-50 lg:hidden p-0 border-0 bg-transparent" aria-label="Comments">
			<button
				type="button"
				aria-label="Close comments"
				class="fixed inset-0 bg-global-bg/70"
				@click="closeCommentsMobile"
			/>
			<div
				class="fixed top-0 left-0 right-0 bg-global-bg border-b border-global-text/15 rounded-b-2xl max-h-[70vh] overflow-hidden"
			>
				<div class="flex items-center justify-between px-4 py-3 border-b border-global-text/10">
					<h2 class="text-base font-medium text-accent-2">Comments</h2>
					<button
						type="button"
						class="inline-flex h-8 w-8 items-center justify-center rounded-md text-global-text hover:text-accent hover:bg-accent/5 transition-colors"
						aria-label="Close comments"
						@click="closeCommentsMobile"
					>
						<Icon icon="mdi:close" class="h-4 w-4" />
					</button>
				</div>
				<div class="overflow-y-auto px-4 py-3" style="max-height: calc(70vh - 64px)">
					<div><CommentsPanel /></div>
					<div class="mt-4 border-t border-global-text/10 pt-3 text-xs text-global-text/60">
						Access this on desktop to post comments
					</div>
				</div>
			</div>
		</dialog>
	</Teleport>

	<!-- Desktop dock (sidebar instance) -->
	<section
		v-else-if="isDesktop && variant !== 'overlay'"
		class="comments-dock__inner"
		aria-label="Comments"
	>
		<button
			type="button"
			class="flex w-full items-center justify-between gap-2 text-left"
			:aria-expanded="dockOpen"
			aria-controls="comments-dock-body"
			:title="dockOpen ? 'Hide comments' : 'Show comments'"
			@click="dockOpen = !dockOpen"
		>
			<span class="flex items-baseline gap-2">
				<span class="text-xs font-bold uppercase tracking-[0.08em] text-global-text/55">Comments</span>
				<span v-if="!loading" class="text-xs font-semibold tabular-nums text-global-text/45">{{ count }}</span>
			</span>
			<Icon
				icon="mdi:chevron-down"
				:class="[
					'h-4 w-4 flex-shrink-0 text-global-text/55 transition-[transform,color] duration-200 group-hover:text-accent',
					{ 'rotate-180': dockOpen },
				]"
			/>
		</button>

		<div v-if="dockOpen" id="comments-dock-body" ref="popupScrollRef" class="mt-3 max-h-[60vh] overflow-auto">
			<CommentsPanel />
		</div>

		<!-- Action menu (portaled to body) -->
		<Teleport v-if="actionsMenuVisible && actionsMenuComment && openMenuPos" to="body">
			<div
				:id="`comment-menu-${openMenuId}`"
				role="menu"
				aria-label="Comment actions"
				class="fixed z-[60] min-w-[180px] overflow-hidden rounded-lg border border-global-text/15 bg-global-bg"
				:style="{ top: `${openMenuPos.top}px`, left: `${openMenuPos.left}px`, transform: 'translateX(-100%)' }"
			>
				<div class="max-h-56 overflow-auto p-1">
					<button
						v-if="menuCanReply"
						type="button"
						role="menuitem"
						class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-global-text/80 hover:bg-global-text/[0.06] hover:text-accent transition-colors"
						@click="() => { const c = actionsMenuComment!; openMenuId = null; openMenuPos = null; beginReply(c); focusComposer(); }"
					>
						<Icon icon="mdi:reply" class="h-4 w-4" />
						Reply
					</button>
					<button
						v-if="menuCanModify"
						type="button"
						role="menuitem"
						class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-global-text/80 hover:bg-global-text/[0.06] hover:text-accent transition-colors"
						@click="startEdit(actionsMenuComment!)"
					>
						<Icon icon="mdi:pencil" class="h-4 w-4" />
						Edit
					</button>
					<button
						v-if="menuCanModify && confirmDeleteCommentId !== actionsMenuComment.id"
						type="button"
						role="menuitem"
						class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-global-text/80 hover:bg-global-text/[0.06] hover:text-accent transition-colors"
						@click="confirmDeleteCommentId = actionsMenuComment.id"
					>
						<Icon icon="mdi:trash-can-outline" class="h-4 w-4" />
						Delete
					</button>
					<div v-else-if="menuCanModify" class="rounded-lg px-2 py-2">
						<div class="flex items-center gap-2 text-xs text-global-text/70">
							<Icon icon="mdi:alert-circle-outline" class="h-4 w-4" />
							<span>Delete this comment?</span>
						</div>
						<div class="mt-2 flex gap-2">
							<button
								type="button"
								role="menuitem"
								class="flex-1 rounded-lg px-2 py-1.5 text-xs text-global-text/80 hover:bg-global-text/[0.06] transition-colors"
								:disabled="deletingCommentId === actionsMenuComment.id"
								@click="confirmDeleteCommentId = null"
							>
								Cancel
							</button>
							<button
								type="button"
								role="menuitem"
								class="flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-1.5 text-xs text-global-text/80 hover:bg-global-text/[0.06] hover:text-accent transition-colors"
								:disabled="deletingCommentId === actionsMenuComment.id"
								@click="confirmDelete(actionsMenuComment!)"
							>
								<Icon
									v-if="deletingCommentId === actionsMenuComment.id"
									icon="mdi:loading"
									class="h-4 w-4 animate-spin"
								/>
								<Icon v-else icon="mdi:trash-can-outline" class="h-4 w-4" />
								Delete
							</button>
						</div>
					</div>
				</div>
			</div>
		</Teleport>

		<!-- Likers tooltip (portaled to body) -->
		<Teleport v-if="likersTooltip" to="body">
			<div
				class="fixed z-[60] max-w-[260px] rounded-lg border border-global-text/15 bg-global-bg px-3 py-2 text-xs text-global-text/80"
				:style="{ top: `${likersTooltip.top}px`, left: `${likersTooltip.left}px`, transform: 'translateY(-100%)' }"
				role="tooltip"
				aria-label="People who liked"
			>
				<div v-if="likersTooltipLoading" class="flex items-center gap-2 text-global-text/70">
					<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
					<span>Loading likes…</span>
				</div>
				<div v-else-if="likersTooltipUsers.length === 0" class="text-global-text/70">No likes yet.</div>
				<div v-else class="space-y-2">
					<div class="text-global-text/60">Liked by</div>
					<ul class="space-y-1">
						<li v-for="u in likersTooltipUsers.slice(0, 8)" :key="u.id" class="flex items-center gap-2">
							<img
								:src="u.avatarUrl"
								alt=""
								class="h-4 w-4 rounded-full ring-1 ring-global-text/10"
								loading="lazy"
							/>
							<a
								:href="u.profileUrl"
								target="_blank"
								rel="noopener noreferrer"
								class="truncate text-global-text/80 hover:text-accent transition-colors"
								:title="u.displayName ? `${u.githubLogin} (${u.displayName})` : u.githubLogin"
							>
								{{ u.githubLogin }}
							</a>
						</li>
						<li v-if="likersTooltipUsers.length > 8" class="text-global-text/60">
							+{{ likersTooltipUsers.length - 8 }} more
						</li>
					</ul>
				</div>
			</div>
		</Teleport>
	</section>
</template>
