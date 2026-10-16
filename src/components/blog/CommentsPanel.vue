<script setup lang="ts">
import { Icon } from "@iconify/vue";
import Skeleton from "boneyard-js/vue";
import { computed, inject } from "vue";
import { type CommentsCtx, commentsCtxKey } from "./commentsShared";

const ctl = inject(commentsCtxKey) as CommentsCtx;

const decorated = computed(() =>
	ctl.comments.map((c, i) => {
		const u = ctl.getCommentUser(c);
		const depth = c.depth ?? 1;
		const parent = c.parentCommentId ? (ctl.commentById.get(c.parentCommentId) ?? null) : null;
		return {
			c,
			u,
			isReply: depth > 1,
			// Top-level rows get a divider, except the first one.
			divider: depth <= 1 && i > 0,
			indent: Math.max(0, depth - 2) * 0.75,
			showAuthorBadge: ctl.isAuthorComment(c),
			showYouBadge: Boolean(ctl.me && ctl.isOwnComment(c)),
			canReplyHere: Boolean(ctl.isDesktop && ctl.me && !c.deletedAt && depth < 5),
			canModifyHere: Boolean(ctl.isDesktop && !c.deletedAt && ctl.canModifyComment(c)),
			reactions: ctl.getCommentReactions(c),
			parent,
			parentUser: parent ? ctl.getCommentUser(parent) : undefined,
		};
	}),
);

const canPost = computed(() => !ctl.submitting && ctl.body.trim().length > 0 && ctl.canReply);
</script>

<template>
	<div class="text-sm">
		<template v-if="ctl.isDesktop">
			<div v-if="ctl.me && !ctl.replyTo">
				<textarea
					:ref="ctl.registerTextarea"
					v-model="ctl.body"
					:rows="3"
					:maxlength="5000"
					placeholder="Write a comment… (Markdown supported)"
					aria-label="Write a comment"
					class="c-input"
					@keydown.ctrl.enter.prevent="canPost && ctl.submit()"
					@keydown.meta.enter.prevent="canPost && ctl.submit()"
				/>
				<div class="mt-1.5 flex items-center justify-between gap-3 text-xs">
					<span class="min-w-0 truncate text-global-text/55">
						{{ ctl.me.githubLogin }} ·
						<button type="button" class="c-action" :disabled="ctl.signingOut" @click="ctl.signOut()">
							{{ ctl.signingOut ? "Signing out…" : "Sign out" }}
						</button>
					</span>
					<button type="button" class="c-primary" title="Ctrl+Enter to post" :disabled="!canPost" @click="ctl.submit()">
						{{ ctl.submitting ? "Posting…" : "Post" }}
					</button>
				</div>
			</div>
			<a
				v-else-if="!ctl.me && !ctl.loading"
				:href="ctl.signInUrl"
				class="c-action inline-flex items-center gap-1.5 text-xs text-global-text/70"
				@click="ctl.onLoginClick($event)"
			>
				<Icon icon="mdi:github" class="h-4 w-4" />
				<span>Sign in with GitHub to comment</span>
			</a>
		</template>

		<p v-if="ctl.error" role="alert" class="mt-3 whitespace-pre-line text-xs text-global-text/80">{{ ctl.error }}</p>

		<div :class="ctl.isDesktop ? 'mt-4' : undefined">
			<Skeleton name="comments-list" :loading="ctl.loading" animate="pulse" :transition="300">
				<p v-if="!ctl.loading && ctl.comments.length === 0" class="text-xs text-global-text/55">
					No comments yet.
				</p>
				<ul v-else-if="!ctl.loading">
					<li
						v-for="d in decorated"
						:key="d.c.id"
						:id="`comment-${d.c.id}`"
						:class="[
							d.isReply ? 'c-reply pb-3 pl-3' : 'py-3',
							{ 'border-t border-global-text/10': d.divider },
						]"
						:style="d.indent ? { marginLeft: `${d.indent}rem` } : undefined"
					>
						<div class="flex min-w-0 items-center gap-2">
							<img
								v-if="d.u?.avatarUrl"
								:src="d.u.avatarUrl"
								alt=""
								class="h-6 w-6 flex-shrink-0 rounded-full"
								loading="lazy"
							/>
							<div v-else class="h-6 w-6 flex-shrink-0 rounded-full bg-global-text/10" />
							<a
								v-if="d.u?.profileUrl"
								:href="d.u.profileUrl"
								target="_blank"
								rel="noopener noreferrer"
								class="c-action min-w-0 truncate text-[0.8rem] font-medium text-global-text"
							>
								{{ d.u.githubLogin }}
							</a>
							<span v-else class="min-w-0 truncate text-[0.8rem] font-medium text-global-text">
								{{ d.u?.githubLogin }}
							</span>
							<span v-if="d.showAuthorBadge" class="text-xs text-accent">author</span>
							<span v-else-if="d.showYouBadge" class="text-xs text-global-text/55">you</span>
							<span
								class="ml-auto flex-shrink-0 text-xs tabular-nums text-global-text/50"
								:title="
									d.c.editedAt
										? `Posted ${ctl.formatDateTime(d.c.createdAt)}\nEdited ${ctl.formatDateTime(d.c.editedAt)}`
										: `Posted ${ctl.formatDateTime(d.c.createdAt)}`
								"
							>
								{{ ctl.formatDate(d.c.createdAt) }}{{ d.c.editedAt ? " · edited" : "" }}
							</span>
						</div>

						<div v-if="d.parentUser?.githubLogin" class="mt-1 text-xs text-global-text/50">
							replying to
							<button
								type="button"
								class="c-action text-global-text/70"
								title="Jump to that comment"
								@click="d.parent && ctl.scrollToComment(d.parent.id)"
							>
								@{{ d.parentUser.githubLogin }}</button
							><span v-if="d.parent?.deletedAt"> (deleted)</span>
						</div>

						<div class="mt-1.5 text-global-text">
							<span v-if="d.c.deletedAt" class="text-global-text/55">[deleted]</span>
							<div v-else-if="ctl.editingCommentId === d.c.id">
								<textarea
									:id="`comment-edit-${d.c.id}`"
									v-model="ctl.editBody"
									:rows="4"
									:maxlength="5000"
									aria-label="Edit comment"
									class="c-input"
									@keydown.ctrl.enter.prevent="ctl.saveEdit(d.c.id, ctl.editBody)"
									@keydown.meta.enter.prevent="ctl.saveEdit(d.c.id, ctl.editBody)"
									@keydown.esc="ctl.cancelEdit()"
								/>
								<div class="mt-1.5 flex items-center justify-end gap-4 text-xs">
									<button
										type="button"
										class="c-action text-global-text/60"
										:disabled="ctl.editSubmitting"
										@click="ctl.cancelEdit()"
									>
										Cancel
									</button>
									<button
										type="button"
										class="c-primary"
										title="Ctrl+Enter to save"
										:disabled="ctl.editSubmitting || ctl.editBody.trim().length === 0"
										@click="ctl.saveEdit(d.c.id, ctl.editBody)"
									>
										{{ ctl.editSubmitting ? "Saving…" : "Save" }}
									</button>
								</div>
							</div>
							<!-- eslint-disable-next-line vue/no-v-html: bodyHtml is sanitized server-side via a strict allowlist (see comments/EMBEDDING.md) -->
							<div
								v-else-if="d.c.bodyHtml"
								class="comment-body space-y-2 break-words [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-2 [&_blockquote]:border-global-text/20 [&_blockquote]:pl-3 [&_blockquote]:text-global-text/70 [&_code]:rounded [&_code]:bg-global-text/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_em]:italic [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:whitespace-pre-wrap [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-global-text/[0.06] [&_pre]:p-3 [&_pre]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
								v-html="d.c.bodyHtml"
							/>
							<p v-else class="whitespace-pre-wrap break-words">{{ ctl.getCommentBodyText(d.c) }}</p>
						</div>

						<div
							v-if="!d.c.deletedAt && ctl.editingCommentId !== d.c.id"
							class="c-actions mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-global-text/55"
						>
							<button
								type="button"
								:class="['c-action c-like inline-flex items-center gap-1', { 'text-accent': d.reactions.viewerHasLiked }]"
								:disabled="ctl.reactingCommentId === d.c.id"
								:aria-pressed="d.reactions.viewerHasLiked"
								:aria-label="d.reactions.viewerHasLiked ? 'Unlike' : 'Like'"
								@click="ctl.toggleLike(d.c.id)"
								@mouseenter="ctl.hoverLikers(d.c.id, $event.currentTarget as HTMLElement)"
								@mouseleave="ctl.leaveLikers()"
								@focus="ctl.hoverLikers(d.c.id, $event.currentTarget as HTMLElement)"
								@blur="ctl.leaveLikers()"
							>
								<Icon
									:icon="d.reactions.viewerHasLiked ? 'mdi:heart' : 'mdi:heart-outline'"
									class="h-3.5 w-3.5"
								/>
								<span class="tabular-nums">{{ d.reactions.likeCount }}</span>
							</button>
							<button
								v-if="d.canReplyHere"
								type="button"
								class="c-action"
								:aria-label="d.u?.githubLogin ? `Reply to @${d.u.githubLogin}` : 'Reply'"
								@click="ctl.beginReply(d.c)"
							>
								Reply
							</button>
							<template v-if="d.canModifyHere">
								<template v-if="ctl.confirmDeleteCommentId !== d.c.id">
									<button type="button" class="c-action" @click="ctl.startEdit(d.c)">Edit</button>
									<button type="button" class="c-action" @click="ctl.confirmDeleteCommentId = d.c.id">
										Delete
									</button>
								</template>
								<span v-else class="inline-flex items-center gap-4">
									<span class="text-global-text/80">Delete this comment?</span>
									<button
										type="button"
										class="c-action text-global-text"
										:disabled="ctl.deletingCommentId === d.c.id"
										@click="ctl.confirmDelete(d.c)"
									>
										{{ ctl.deletingCommentId === d.c.id ? "Deleting…" : "Yes, delete" }}
									</button>
									<button
										type="button"
										class="c-action"
										:disabled="ctl.deletingCommentId === d.c.id"
										@click="ctl.confirmDeleteCommentId = null"
									>
										Keep
									</button>
								</span>
							</template>
						</div>

						<div
							v-if="ctl.replyTo && ctl.replyTo.id === d.c.id && ctl.me && !d.c.deletedAt && ctl.editingCommentId !== d.c.id"
							class="c-reply mt-3 pl-3"
						>
							<textarea
								:ref="ctl.registerReplyTextarea"
								v-model="ctl.body"
								:rows="3"
								:maxlength="5000"
								:placeholder="`Reply to @${ctl.replyTo.login}… (Markdown supported)`"
								:aria-label="`Reply to @${ctl.replyTo.login}`"
								class="c-input"
								@keydown.ctrl.enter.prevent="canPost && ctl.submit()"
								@keydown.meta.enter.prevent="canPost && ctl.submit()"
								@keydown.esc="ctl.cancelReply()"
							/>
							<div class="mt-1.5 flex items-center justify-end gap-4 text-xs">
								<button type="button" class="c-action text-global-text/60" @click="ctl.cancelReply()">
									Cancel
								</button>
								<button type="button" class="c-primary" title="Ctrl+Enter to reply" :disabled="!canPost" @click="ctl.submit()">
									{{ ctl.submitting ? "Posting…" : "Reply" }}
								</button>
							</div>
						</div>
					</li>
				</ul>
			</Skeleton>
		</div>
	</div>
</template>

<style scoped>
/* Flat inputs: a 1px line, no fill, accent ring on keyboard focus. */
.c-input {
	display: block;
	width: 100%;
	resize: vertical;
	min-height: 4.5rem;
	padding: 0.5rem 0.65rem;
	border: 1px solid color-mix(in srgb, var(--color-global-text) 18%, transparent);
	border-radius: 0.25rem;
	background: transparent;
	color: var(--color-global-text);
	font-size: 0.875rem;
	line-height: 1.5;
}
.c-input::placeholder {
	color: color-mix(in srgb, var(--color-global-text) 50%, transparent);
}
.c-input:focus {
	outline: none;
	border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
}
.c-input:focus-visible {
	outline: 2px solid color-mix(in srgb, var(--color-accent) 50%, transparent);
	outline-offset: 1px;
}

/* Text buttons: no box, underline on hover like every other text link. */
.c-action,
.c-primary {
	text-underline-offset: 3px;
}
.c-action:hover:not(:disabled),
.c-action:focus-visible,
.c-primary:hover:not(:disabled),
.c-primary:focus-visible {
	text-decoration: underline;
}
.c-action:hover:not(:disabled) {
	color: var(--color-global-text);
}
.c-primary {
	color: var(--color-accent);
	font-weight: 500;
}
.c-action:disabled,
.c-primary:disabled {
	opacity: 0.45;
	cursor: not-allowed;
}

/* The heart turns to marker ink on hover, same as the site's other icons. */
.c-like:hover:not(:disabled),
.c-like:focus-visible {
	color: var(--color-accent);
}
.c-like:hover:not(:disabled) :deep(svg) {
	filter: url(#marker-ink);
}

/* Threads hang off the same 2px rule the TOC uses. */
.c-reply {
	border-left: 2px solid color-mix(in srgb, var(--color-global-text) 14%, transparent);
}

/* Comfortable tap targets for the only buttons mobile shows. */
@media (pointer: coarse) {
	.c-actions > button {
		min-width: 44px;
		min-height: 44px;
	}
}
</style>
