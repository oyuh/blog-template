import { formatInTimeZone } from "date-fns-tz";
import { useEffect, useState } from "react";

interface GitHubCommit {
	sha: string;
	commit: {
		author: {
			date: string;
			name: string;
		};
		message: string;
	};
	html_url: string;
	stats?: {
		additions: number;
		deletions: number;
		total: number;
	};
	files?: Array<{
		filename: string;
		status: string;
		additions: number;
		deletions: number;
	}>;
}

const CENTRAL_TIME_ZONE = "America/Chicago";

type CommitBadge = {
	text: string;
	className: string;
};

type ParsedCommitTitle = {
	displayTitle: string;
	badge: CommitBadge | null;
};

function formatDate(dateString: string) {
	try {
		return formatInTimeZone(new Date(dateString), CENTRAL_TIME_ZONE, "MMM d, yyyy, h:mm a");
	} catch (e) {
		return dateString;
	}
}

function parseCommitTitle(title: string): ParsedCommitTitle {
	const raw = title.trim();
	// Conventional Commits: type(scope)!: description
	const match = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/.exec(raw);
	if (!match) return { displayTitle: raw, badge: null };

	const type = (match[1] ?? "").toLowerCase();
	const breaking = Boolean(match[3]);
	const description = (match[4] ?? "").trim();
	if (!description) return { displayTitle: raw, badge: null };

	const badgeText = `${type.toUpperCase()}${breaking ? "!" : ""}`;
	const baseBadge =
		"inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset";

	const badgeClassByType: Record<string, string> = {
		feat: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
		fix: "bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:text-rose-300",
		blog: "bg-accent/15 text-global-text ring-accent/60 dark:text-global-text",
		docs: "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300",
		refactor: "bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:text-violet-300",
		perf: "bg-amber-500/10 text-amber-800 ring-amber-500/25 dark:text-amber-300",
		chore: "bg-slate-500/10 text-slate-700 ring-slate-500/25 dark:text-slate-300",
		test: "bg-indigo-500/10 text-indigo-700 ring-indigo-500/25 dark:text-indigo-300",
		build: "bg-cyan-500/10 text-cyan-700 ring-cyan-500/25 dark:text-cyan-300",
		ci: "bg-teal-500/10 text-teal-700 ring-teal-500/25 dark:text-teal-300",
		style: "bg-fuchsia-500/10 text-fuchsia-700 ring-fuchsia-500/25 dark:text-fuchsia-300",
		revert: "bg-orange-500/10 text-orange-800 ring-orange-500/25 dark:text-orange-300",
	};

	const badgeStyle = badgeClassByType[type];
	if (!badgeStyle) return { displayTitle: raw, badge: null };

	return {
		displayTitle: description,
		badge: {
			text: badgeText,
			className: `${baseBadge} ${badgeStyle}${breaking ? " ring-2" : ""}`,
		},
	};
}

export default function ChangelogList() {
	const [commits, setCommits] = useState<GitHubCommit[]>([]);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchCommits = async () => {
			setLoading(true);
			setError(null);
			try {
				const response = await fetch(`/api/commits?page=${page}&per_page=10`);
				if (!response.ok) {
					throw new Error("Failed to fetch commits");
				}
				const data = await response.json();
				setCommits(data);
			} catch (err) {
				setError(err instanceof Error ? err.message : "An error occurred");
			} finally {
				setLoading(false);
			}
		};

		fetchCommits();
	}, [page]);

	const handlePrev = () => {
		if (page > 1) setPage((p) => p - 1);
	};

	const handleNext = () => {
		setPage((p) => p + 1);
	};

	if (error) {
		return <div className="text-red-500">Error: {error}</div>;
	}

	return (
		<div className="w-full">
			{loading ? (
				<div className="space-y-6">
					{["one", "two", "three"].map((k) => (
						<div
							key={k}
							className="h-32 animate-pulse rounded-lg border border-accent/20 bg-global-bg p-4"
						>
							<div className="mb-2 h-4 w-1/4 rounded bg-accent/10" />
							<div className="mb-2 h-6 w-3/4 rounded bg-accent/10" />
							<div className="h-4 w-1/2 rounded bg-accent/10" />
						</div>
					))}
				</div>
			) : (
				<div className="space-y-6">
					{commits.map((commit) => {
						const firstLine = commit.commit.message.split("\n")[0] ?? "";
						const parsed = parseCommitTitle(firstLine);
						const rest = commit.commit.message.split("\n").slice(1).join("\n").trim();

						return (
							<div
								key={commit.sha}
								className="rounded-lg border border-accent/20 bg-global-bg p-4 transition-colors hover:border-accent/40"
							>
								<div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
									<div className="font-mono text-sm text-accent">
										{formatDate(commit.commit.author.date)}
									</div>
									<a
										href={commit.html_url}
										target="_blank"
										rel="noopener noreferrer"
										className="lawson-link font-mono text-xs opacity-60 transition-all hover:opacity-100"
									>
										{commit.sha.substring(0, 7)}
									</a>
								</div>
								<h2 className="mb-2 flex flex-wrap items-center gap-2 text-lg font-semibold">
									{parsed.badge ? (
										<span className={parsed.badge.className}>{parsed.badge.text}</span>
									) : null}
									<span>{parsed.displayTitle}</span>
								</h2>
								{rest && (
									<div className="whitespace-pre-wrap rounded bg-accent/5 p-3 font-mono text-xs opacity-80">
										{rest}
									</div>
								)}

								{commit.files && commit.files.length > 0 && (
									<div className="mt-4 border-t border-accent/10 pt-3">
										<details className="group">
											<summary className="flex cursor-pointer items-center gap-2 text-xs font-medium opacity-70 hover:text-accent hover:opacity-100">
												<svg
													className="h-4 w-4 rotate-0 transition-transform group-open:rotate-90"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth="2"
														d="M9 5l7 7-7 7"
													/>
												</svg>
												View {commit.files.length} changed file
												{commit.files.length === 1 ? "" : "s"}
												<span className="ml-auto flex gap-3 font-mono text-[10px]">
													<span className="text-green-500">+{commit.stats?.additions}</span>
													<span className="text-red-500">-{commit.stats?.deletions}</span>
												</span>
											</summary>
											<div className="mt-3 space-y-1 pl-2">
												{commit.files.map((file) => (
													<div
														key={file.filename}
														className="flex items-center justify-between gap-4 font-mono text-xs"
													>
														<span className="truncate opacity-80" title={file.filename}>
															{file.filename}
														</span>
														<div className="flex shrink-0 gap-2 text-[10px]">
															{file.additions > 0 && (
																<span className="text-green-500">+{file.additions}</span>
															)}
															{file.deletions > 0 && (
																<span className="text-red-500">-{file.deletions}</span>
															)}
														</div>
													</div>
												))}
											</div>
										</details>
									</div>
								)}

								<div className="mt-3 flex items-center gap-4 text-xs opacity-60">
									<div className="flex items-center gap-1">
										<span>{commit.commit.author.name}</span>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			<nav className="mt-8 flex items-center gap-x-4">
				<button
					type="button"
					onClick={handlePrev}
					disabled={page === 1 || loading}
					className="lawson-link me-auto disabled:opacity-50 disabled:no-underline"
				>
					Previous
				</button>
				<button
					type="button"
					onClick={handleNext}
					disabled={loading || (commits.length < 10 && !loading)}
					className="lawson-link ms-auto disabled:opacity-50 disabled:no-underline"
				>
					Next
				</button>
			</nav>
		</div>
	);
}
