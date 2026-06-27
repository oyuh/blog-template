<script setup lang="ts">
import { Icon } from "@iconify/vue";
import Skeleton from "boneyard-js/vue";
import { computed, inject } from "vue";
import { type CommentsCtx, commentsCtxKey } from "./commentsShared";

const ctl = inject(commentsCtxKey) as CommentsCtx;

const decorated = computed(() =>
	ctl.comments.map((c) => {
		const u = ctl.getCommentUser(c);
		const parent = c.parentCommentId ? (ctl.commentById.get(c.parentCommentId) ?? null) : null;
		const parentUser = parent ? ctl.getCommentUser(parent) : undefined;
		const canReplyHere = Boolean(
			ctl.isDesktop && ctl.me && !c.deletedAt && (c.depth ?? 1) < 5 && ctl.isOwnComment(c),
		);
		const canModifyHere = Boolean(ctl.isDesktop && !c.deletedAt && ctl.canModifyComment(c));
		return {
			c,
			u,
			showYouBadge: Boolean(ctl.me && ctl.isOwnComment(c)),
			showAuthorBadge: ctl.isAuthorComment(c),
			canReplyHere,
			canModifyHere,
			reactions: ctl.getCommentReactions(c),
			parent,
			parentUser,
			parentPreview:
				parent && !parent.deletedAt ? ctl.previewText(ctl.getCommentBodyText(parent), 90) : null,
			hasActions: canReplyHere || canModifyHere,
			marginLeft: Math.max(0, (c.depth ?? 1) - 1) * 10,
		};
	}),
);
</script>

<template>
	<div>
		<div v-if="ctl.isDesktop" class="flex items-center justify-end gap-3">
			<button
				v-if="ctl.me"
				type="button"
				:disabled="ctl.signingOut"
				class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-global-text/70 transition-colors hover:text-accent disabled:opacity-60 disabled:cursor-not-allowed"
				:aria-label="ctl.signingOut ? 'Signing out' : 'Sign out'"
				:title="ctl.signingOut ? 'Signing out…' : 'Sign out'"
				@click="ctl.signOut()"
			>
				<Icon
					:icon="ctl.signingOut ? 'mdi:loading' : 'mdi:logout'"
					:class="ctl.signingOut ? 'h-4 w-4 animate-spin' : 'h-4 w-4'"
				/>
				<span>Sign out</span>
			</button>
			<a
				v-else
				:href="ctl.signInUrl"
				class="inline-flex items-center gap-2 rounded-lg border border-global-text/15 px-3 py-1.5 text-xs text-global-text/80 transition-colors hover:text-accent hover:border-accent/40"
				aria-label="Sign in with GitHub"
				title="Sign in with GitHub"
				@click="ctl.onLoginClick()"
			>
				<span>Sign in with</span>
				<Icon icon="mdi:github" class="h-4 w-4" />
			</a>
		</div>

		<div
			v-if="ctl.error"
			class="mt-3 rounded-lg border border-global-text/15 px-3 py-2 text-xs text-global-text"
		>
			{{ ctl.error }}
		</div>

		<div
			v-if="ctl.isDesktop && ctl.me && !ctl.replyTo"
			class="mt-4 rounded-lg border border-global-text/15 bg-global-text/[0.03] p-3"
		>
			<div class="flex items-start gap-3">
				<img
					v-if="ctl.me.avatarUrl"
					:src="ctl.me.avatarUrl"
					alt=""
					class="h-8 w-8 rounded-full ring-1 ring-global-text/10"
					loading="lazy"
				/>
				<div v-else class="h-8 w-8 rounded-full bg-global-text/10 ring-1 ring-global-text/10" />

				<div class="min-w-0 flex-1">
					<textarea
						:ref="ctl.registerTextarea"
						v-model="ctl.body"
						:rows="3"
						:maxlength="5000"
						placeholder="Write a comment…"
						class="w-full resize-none rounded-lg border border-global-text/15 bg-global-text/[0.03] px-3 py-2 text-sm text-global-text placeholder:text-global-text/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
					/>
					<div class="mt-2 flex items-center justify-between gap-3">
						<div class="truncate text-xs text-global-text/60">
							Signed in as <span class="text-global-text/80">{{ ctl.me.githubLogin }}</span>
						</div>
						<button
							type="button"
							:disabled="ctl.submitting || ctl.body.trim().length === 0 || !ctl.canReply"
							class="rounded-lg border border-global-text/15 px-3 py-2 text-xs text-global-text transition-colors hover:text-accent hover:border-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
							@click="ctl.submit()"
						>
							{{ ctl.submitting ? "Posting…" : "Post" }}
						</button>
					</div>
					<div class="mt-1 flex items-center gap-1 text-[0.7rem] text-global-text/45">
						<Icon icon="mdi:language-markdown-outline" class="h-3.5 w-3.5" />
						<span>Markdown supported</span>
					</div>
				</div>
			</div>
		</div>

		<div class="mt-4">
			<Skeleton name="comments-list" :loading="ctl.loading" animate="pulse" :transition="300">
				<div
					v-if="!ctl.loading && ctl.comments.length === 0"
					class="rounded-lg border border-global-text/15 px-3 py-2 text-xs text-global-text/70"
				>
					No comments yet.
				</div>
				<ul v-else-if="!ctl.loading" class="space-y-3">
					<li
						v-for="d in decorated"
						:key="d.c.id"
						:id="`comment-${d.c.id}`"
						class="rounded-lg border border-global-text/15 bg-global-text/[0.03] p-3"
						:style="{ marginLeft: `${d.marginLeft}px` }"
					>
						<div :class="d.c.parentCommentId ? 'rounded-lg border-l border-global-text/10 pl-3' : undefined">
							<div class="flex items-start justify-between gap-3">
								<div class="flex min-w-0 items-center gap-3">
									<img
										v-if="d.u?.avatarUrl"
										:src="d.u.avatarUrl"
										alt=""
										class="h-8 w-8 rounded-full ring-1 ring-global-text/10"
										loading="lazy"
									/>
									<div v-else class="h-8 w-8 rounded-full bg-global-text/10 ring-1 ring-global-text/10" />
									<div class="min-w-0">
										<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
											<a
												v-if="d.u?.profileUrl"
												:href="d.u.profileUrl"
												target="_blank"
												rel="noopener noreferrer"
												class="text-xs font-semibold text-global-text hover:text-accent transition-colors"
											>
												{{ d.u.githubLogin }}
											</a>
											<span v-else class="text-xs font-semibold text-global-text">{{ d.u?.githubLogin }}</span>
											<span
												v-if="d.showYouBadge"
												class="inline-flex items-center rounded-full bg-accent/12 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent ring-1 ring-accent/30"
											>
												You
											</span>
											<span
												v-if="d.showAuthorBadge"
												class="inline-flex items-center rounded-full bg-global-text/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-global-text/85 ring-1 ring-global-text/20"
											>
												Author
											</span>
											<span class="text-xs text-global-text/60">
												<span
													:title="
														d.c.editedAt
															? `Posted: ${ctl.formatDateTime(d.c.createdAt)}\nEdited: ${ctl.formatDateTime(d.c.editedAt)}`
															: `Posted: ${ctl.formatDateTime(d.c.createdAt)}`
													"
													class="cursor-help"
												>
													{{ ctl.formatDate(d.c.createdAt) }}{{ d.c.editedAt ? ` • edited ${ctl.formatDate(d.c.editedAt)}` : "" }}
												</span>
											</span>
										</div>
									</div>
								</div>

								<div v-if="d.hasActions" class="flex items-center gap-2">
									<button
										type="button"
										:id="`comment-menu-btn-${d.c.id}`"
										class="inline-flex items-center justify-center rounded-lg p-1 text-global-text/60 hover:text-accent transition-colors"
										aria-haspopup="menu"
										:aria-expanded="ctl.openMenuId === d.c.id"
										:aria-controls="`comment-menu-${d.c.id}`"
										aria-label="Comment actions"
										title="Actions"
										@click="ctl.toggleMenu(d.c.id, $event.currentTarget as HTMLElement)"
									>
										<Icon icon="mdi:dots-vertical" class="h-4 w-4" />
									</button>
								</div>
							</div>

							<div
								v-if="d.parentUser?.githubLogin"
								class="mt-2 flex items-start gap-2 rounded-lg border border-global-text/15 px-2 py-2 text-xs text-global-text/65"
							>
								<Icon icon="mdi:subdirectory-arrow-right" class="mt-0.5 h-4 w-4 text-global-text/55" />
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
										<span class="text-global-text/55">In reply to</span>
										<button
											type="button"
											class="font-medium text-global-text/80 hover:text-accent transition-colors"
											:aria-label="`Jump to @${d.parentUser.githubLogin}`"
											title="Jump to parent comment"
											@click="d.parent?.id && ctl.scrollToComment(d.parent.id)"
										>
											@{{ d.parentUser.githubLogin }}
										</button>
										<span v-if="d.parent?.deletedAt" class="text-global-text/50">(deleted)</span>
									</div>
									<div v-if="d.parentPreview" class="mt-1 truncate text-global-text/50">
										“{{ d.parentPreview }}”
									</div>
								</div>
							</div>

							<div class="mt-2 text-sm text-global-text">
								<span v-if="d.c.deletedAt" class="text-global-text/60">[deleted]</span>
								<div v-else-if="ctl.editingCommentId === d.c.id">
									<textarea
										:id="`comment-edit-${d.c.id}`"
										v-model="ctl.editBody"
										:rows="4"
										:maxlength="5000"
										class="w-full resize-none rounded-lg border border-global-text/15 bg-global-text/[0.03] px-3 py-2 text-sm text-global-text placeholder:text-global-text/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
									/>
									<div class="mt-2 flex items-center justify-end gap-2">
										<button
											type="button"
											:disabled="ctl.editSubmitting"
											class="text-xs text-global-text/60 hover:text-accent transition-colors"
											@click="ctl.cancelEdit()"
										>
											Cancel
										</button>
										<button
											type="button"
											:disabled="ctl.editSubmitting || ctl.editBody.trim().length === 0"
											class="rounded-lg border border-global-text/15 px-3 py-2 text-xs text-global-text transition-colors hover:text-accent hover:border-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
											@click="ctl.saveEdit(d.c.id, ctl.editBody)"
										>
											{{ ctl.editSubmitting ? "Saving…" : "Save" }}
										</button>
									</div>
								</div>
								<!-- eslint-disable-next-line vue/no-v-html: bodyHtml is sanitized server-side via a strict allowlist (see comments/EMBEDDING.md) -->
								<div
									v-else-if="d.c.bodyHtml"
									class="comment-body space-y-2 break-words [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent/80 [&_blockquote]:border-l-2 [&_blockquote]:border-global-text/20 [&_blockquote]:pl-3 [&_blockquote]:text-global-text/70 [&_code]:rounded [&_code]:bg-global-text/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_em]:italic [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:whitespace-pre-wrap [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-global-text/[0.06] [&_pre]:p-3 [&_pre]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
									v-html="d.c.bodyHtml"
								/>
								<p v-else class="whitespace-pre-wrap">{{ ctl.getCommentBodyText(d.c) }}</p>
							</div>

							<div
								v-if="!d.c.deletedAt && ctl.editingCommentId !== d.c.id"
								class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2"
							>
								<button
									v-if="d.canReplyHere"
									type="button"
									class="inline-flex items-center gap-2 rounded-lg border border-global-text/15 px-2 py-1 text-xs text-global-text/60 transition-colors hover:text-accent hover:border-accent/40"
									:aria-label="d.u?.githubLogin ? `Reply to @${d.u.githubLogin}` : 'Reply to comment'"
									title="Reply"
									@click="ctl.beginReply(d.c); ctl.focusComposer()"
								>
									<Icon icon="mdi:reply" class="h-4 w-4" />
									<span>Reply</span>
								</button>
								<button
									type="button"
									:disabled="ctl.reactingCommentId === d.c.id"
									class="inline-flex items-center gap-2 rounded-lg border border-global-text/15 px-2 py-1 text-xs text-global-text/60 transition-colors hover:text-accent hover:border-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
									title=""
									:aria-label="d.reactions.viewerHasLiked ? 'Unlike' : 'Like'"
									@click="ctl.toggleLike(d.c.id)"
									@mouseenter="ctl.hoverLikers(d.c.id, $event.currentTarget as HTMLElement)"
									@mouseleave="ctl.leaveLikers()"
									@focus="ctl.hoverLikers(d.c.id, $event.currentTarget as HTMLElement)"
									@blur="ctl.leaveLikers()"
								>
									<Icon
										v-if="ctl.reactingCommentId === d.c.id"
										icon="mdi:loading"
										class="h-4 w-4 animate-spin"
									/>
									<Icon
										v-else
										:icon="d.reactions.viewerHasLiked ? 'mdi:heart' : 'mdi:heart-outline'"
										class="h-4 w-4"
									/>
									<span class="tabular-nums">{{ d.reactions.likeCount }}</span>
								</button>
							</div>

							<div
								v-if="ctl.replyTo && ctl.replyTo.id === d.c.id && ctl.me && !d.c.deletedAt && ctl.editingCommentId !== d.c.id"
								class="mt-3 rounded-lg border border-global-text/15 bg-global-text/[0.03] p-3"
							>
								<div class="flex items-start gap-3">
									<img
										v-if="ctl.me.avatarUrl"
										:src="ctl.me.avatarUrl"
										alt=""
										class="h-7 w-7 rounded-full ring-1 ring-global-text/10"
										loading="lazy"
									/>
									<div v-else class="h-7 w-7 rounded-full bg-global-text/10 ring-1 ring-global-text/10" />
									<div class="min-w-0 flex-1">
										<div class="mb-2 flex items-center justify-between gap-3">
											<div class="min-w-0 truncate text-xs text-global-text/70">
												Replying to <span class="text-global-text/90">@{{ ctl.replyTo.login }}</span>
												<span v-if="ctl.replyTo.depth >= 5" class="ml-2 text-global-text/60">
													(max depth reached)
												</span>
											</div>
											<button
												type="button"
												class="text-xs text-global-text/60 hover:text-accent transition-colors"
												@click="ctl.cancelReply()"
											>
												Cancel
											</button>
										</div>
										<textarea
											:ref="ctl.registerReplyTextarea"
											v-model="ctl.body"
											:rows="3"
											:maxlength="5000"
											placeholder="Write a reply…"
											class="w-full resize-none rounded-lg border border-global-text/15 bg-global-text/[0.03] px-3 py-2 text-sm text-global-text placeholder:text-global-text/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
										/>
										<div class="mt-2 flex items-center justify-end gap-2">
											<button
												type="button"
												:disabled="ctl.submitting || ctl.body.trim().length === 0 || !ctl.canReply"
												class="rounded-lg border border-global-text/15 px-3 py-2 text-xs text-global-text transition-colors hover:text-accent hover:border-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
												@click="ctl.submit()"
											>
												{{ ctl.submitting ? "Posting…" : "Post reply" }}
											</button>
										</div>
									</div>
								</div>
							</div>
						</div>
					</li>
				</ul>
			</Skeleton>
		</div>
	</div>
</template>
