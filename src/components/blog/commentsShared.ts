// Shared types, helpers, and the inject key for the comments island.
// CommentsInner.vue owns all state/logic and `provide()`s a controller object
// (CommentsCtx); CommentsPanel.vue injects it so the same panel markup can be
// reused by both the desktop dock and the mobile sheet without duplication.
import type { InjectionKey } from "vue";

export type CommentsUser = {
	id: string;
	githubLogin: string;
	avatarUrl?: string;
	profileUrl?: string;
	isAdmin?: boolean;
};

export type ApiOkResponse<TCode extends string, TBody extends Record<string, unknown>> = {
	ok: true;
	code: TCode;
} & TBody;

export type ApiErrorResponse<
	TCode extends string,
	TBody extends Record<string, unknown> = Record<string, unknown>,
> = {
	ok: false;
	code: TCode;
} & TBody;

export type ApiAnyResponse =
	| ApiOkResponse<string, Record<string, unknown>>
	| ApiErrorResponse<string, Record<string, unknown>>;

export function tryParseJson(text: string): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return undefined;
	}
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object";
}

export function isApiAnyResponse(value: unknown): value is ApiAnyResponse {
	if (!isRecord(value)) return false;
	if (typeof value.ok !== "boolean") return false;
	if (typeof value.code !== "string") return false;
	return true;
}

export class CommentsApiError extends Error {
	status: number;
	code: string | undefined;
	payload: Record<string, unknown> | undefined;

	constructor(opts: {
		status: number;
		code?: string;
		message?: string;
		payload?: Record<string, unknown>;
	}) {
		super(opts.message ?? opts.code ?? `Request failed (${opts.status})`);
		this.name = "CommentsApiError";
		this.status = opts.status;
		this.code = opts.code;
		this.payload = opts.payload;
	}
}

export type CommentsMeResponse = ApiOkResponse<
	"ME_LOADED",
	{
		user: CommentsUser | null;
		csrfToken: string;
	}
>;

export type CommentsAuthor = {
	id?: string;
	githubLogin: string;
	avatarUrl?: string;
	profileUrl?: string;
};

export type CommentsItem = {
	id: string;
	body?: string;
	bodyHtml?: string;
	parentCommentId?: string | null;
	depth?: number;
	createdAt: string;
	updatedAt?: string;
	editedAt?: string | null;
	deletedAt?: string | null;
	reactions?: {
		likeCount: number;
		viewerHasLiked: boolean;
	};
	// Service returns `user` (per ASTRO-INTEGRATION.md). Keep `author` for backwards compatibility.
	user?: CommentsAuthor;
	author?: CommentsAuthor;
	canDelete?: boolean;
};

export type ResolveThreadResponse = ApiOkResponse<"THREAD_RESOLVED", { threadId: string }>;

export type ListCommentsResponse = ApiOkResponse<"COMMENTS_LISTED", { comments: CommentsItem[] }>;

export type LikerDto = {
	id: string;
	githubLogin: string;
	displayName: string | null;
	avatarUrl: string;
	profileUrl: string;
	reactedAt: string;
};

export type ReplyTarget = {
	id: string;
	depth: number;
	login: string;
	preview?: string;
};

export function stripHtml(html: string): string {
	return html
		.replace(/<br\s*\/?\s*>/gi, "\n")
		.replace(/<\/p\s*>/gi, "\n\n")
		.replace(/<[^>]*>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.trim();
}

export function formatDate(isoString: string): string {
	const date = new Date(isoString);
	if (Number.isNaN(date.getTime())) return isoString;
	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
}

export function formatDateTime(isoString: string): string {
	const date = new Date(isoString);
	if (Number.isNaN(date.getTime())) return isoString;
	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(date);
}

/**
 * The controller object CommentsInner provides to CommentsPanel. State entries
 * are reactive (built with `reactive()` so refs are auto-unwrapped — writable
 * fields like `body`/`editBody` support v-model); the rest are methods/helpers.
 */
export interface CommentsCtx {
	// state
	isDesktop: boolean;
	me: CommentsUser | null;
	error: string | null;
	loading: boolean;
	comments: CommentsItem[];
	body: string;
	submitting: boolean;
	signingOut: boolean;
	signInUrl: string;
	canReply: boolean;
	replyTo: ReplyTarget | null;
	editingCommentId: string | null;
	editBody: string;
	editSubmitting: boolean;
	reactingCommentId: string | null;
	openMenuId: string | null;
	commentById: Map<string, CommentsItem>;
	// actions
	signOut: () => void;
	submit: () => void;
	saveEdit: (commentId: string, nextBody: string) => void;
	cancelEdit: () => void;
	cancelReply: () => void;
	toggleLike: (commentId: string) => void;
	beginReply: (c: CommentsItem) => void;
	focusComposer: () => void;
	toggleMenu: (commentId: string, buttonEl: HTMLElement) => void;
	hoverLikers: (commentId: string, buttonEl: HTMLElement) => void;
	leaveLikers: () => void;
	scrollToComment: (commentId: string) => void;
	onLoginClick: () => void;
	registerTextarea: (el: Element | null) => void;
	registerReplyTextarea: (el: Element | null) => void;
	// derived helpers
	getCommentUser: (c: CommentsItem) => CommentsAuthor | undefined;
	getCommentBodyText: (c: CommentsItem) => string;
	getCommentReactions: (c: CommentsItem) => { likeCount: number; viewerHasLiked: boolean };
	isOwnComment: (c: CommentsItem) => boolean;
	isAuthorComment: (c: CommentsItem) => boolean;
	canModifyComment: (c: CommentsItem) => boolean;
	previewText: (text: string, maxLen: number) => string;
	formatDate: (iso: string) => string;
	formatDateTime: (iso: string) => string;
}

export const commentsCtxKey: InjectionKey<CommentsCtx> = Symbol("commentsCtx");
