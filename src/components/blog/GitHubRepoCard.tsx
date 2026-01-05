import { useEffect, useState } from "react";

interface GitHubRepoData {
	name: string;
	full_name: string;
	description: string;
	html_url: string;
	stargazers_count: number;
	forks_count: number;
	language: string;
	topics: string[];
	owner: {
		login: string;
		avatar_url: string;
	};
	open_issues_count: number;
	updated_at: string;
}

interface GitHubRepoCardProps {
	repo: string; // Format: "owner/repo"
	compact?: boolean;
	client?: string; // For Astro client directive
}

export default function GitHubRepoCard({ repo, compact = false }: GitHubRepoCardProps) {
	const [repoData, setRepoData] = useState<GitHubRepoData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		async function fetchRepoData() {
			try {
				setLoading(true);
				const response = await fetch(`https://api.github.com/repos/${repo}`);
				if (!response.ok) {
					throw new Error("Repository not found");
				}
				const data = await response.json();
				if (mounted) {
					setRepoData(data);
					setError(null);
				}
			} catch (err) {
				if (mounted) {
					setError(err instanceof Error ? err.message : "Failed to load repository");
				}
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		}

		fetchRepoData();

		return () => {
			mounted = false;
		};
	}, [repo]);

	if (loading) {
		return (
			<div
				style={{
					padding: "1.25rem",
					margin: "1rem 0",
					border: "1px solid color-mix(in srgb, var(--color-global-text) 15%, transparent)",
					borderRadius: "6px",
					background: "transparent",
					minHeight: "120px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<span
					style={{
						color: "color-mix(in srgb, var(--color-global-text) 50%, transparent)",
						fontFamily: '"Atkinson Hyperlegible Mono", monospace',
						fontSize: "0.875rem",
					}}
				>
					Loading repository...
				</span>
			</div>
		);
	}

	if (error || !repoData) {
		return (
			<div
				style={{
					padding: "1rem",
					margin: "1rem 0",
					border: "1px solid color-mix(in srgb, var(--color-global-text) 15%, transparent)",
					borderRadius: "6px",
					background: "transparent",
				}}
			>
				<p
					style={{
						margin: 0,
						color: "color-mix(in srgb, var(--color-global-text) 60%, transparent)",
						fontFamily: '"Atkinson Hyperlegible Mono", monospace',
						fontSize: "0.875rem",
					}}
				>
					Failed to load: {repo}
				</p>
			</div>
		);
	}

	const updatedDate = new Date(repoData.updated_at).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});

	if (compact) {
		return (
			<a
				href={repoData.html_url}
				target="_blank"
				rel="noopener noreferrer"
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: "0.5rem",
					padding: "0.375rem 0.75rem",
					margin: "0.25rem",
					textDecoration: "none",
					border: "1px solid color-mix(in srgb, var(--color-global-text) 15%, transparent)",
					borderRadius: "4px",
					transition: "all 0.15s ease",
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.borderColor = "var(--color-accent)";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.borderColor =
						"color-mix(in srgb, var(--color-global-text) 15%, transparent)";
				}}
			>
				<img
					src={repoData.owner.avatar_url}
					alt={repoData.owner.login}
					style={{
						width: "20px",
						height: "20px",
						borderRadius: "3px",
					}}
				/>
				<span
					style={{
						fontWeight: 500,
						fontSize: "0.875rem",
						color: "var(--color-accent-2)",
						fontFamily: '"Atkinson Hyperlegible Mono", monospace',
					}}
				>
					{repoData.full_name}
				</span>
				<span style={{ fontSize: "0.75rem", opacity: 0.6 }}>
					⭐ {repoData.stargazers_count.toLocaleString()}
				</span>
			</a>
		);
	}

	return (
		<a
			href={repoData.html_url}
			target="_blank"
			rel="noopener noreferrer"
			style={{
				display: "block",
				padding: "1.25rem",
				margin: "1rem 0",
				border: "1px solid color-mix(in srgb, var(--color-global-text) 15%, transparent)",
				borderRadius: "6px",
				textDecoration: "none",
				color: "inherit",
				transition: "all 0.15s ease",
				background: "transparent",
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.borderColor = "var(--color-accent)";
				e.currentTarget.style.transform = "translateY(-2px)";
				e.currentTarget.style.background =
					"color-mix(in srgb, var(--color-accent) 3%, transparent)";
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.borderColor =
					"color-mix(in srgb, var(--color-global-text) 15%, transparent)";
				e.currentTarget.style.transform = "translateY(0)";
				e.currentTarget.style.background = "transparent";
			}}
		>
			<div
				style={{
					display: "flex",
					gap: "0.875rem",
					alignItems: "flex-start",
					marginBottom: "0.875rem",
				}}
			>
				<img
					src={repoData.owner.avatar_url}
					alt={repoData.owner.login}
					style={{
						width: "32px",
						height: "32px",
						borderRadius: "4px",
						flexShrink: 0,
					}}
				/>
				<div style={{ flex: 1, minWidth: 0 }}>
					<h3
						style={{
							fontWeight: 600,
							fontSize: "1rem",
							color: "var(--color-accent-2)",
							margin: 0,
							marginBottom: "0.25rem",
							fontFamily: '"Atkinson Hyperlegible Mono", monospace',
						}}
					>
						{repoData.full_name}
					</h3>
					{repoData.description && (
						<p
							style={{
								margin: 0,
								opacity: 0.75,
								fontSize: "0.875rem",
								lineHeight: 1.5,
								color: "var(--color-global-text)",
							}}
						>
							{repoData.description}
						</p>
					)}
				</div>
			</div>
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: "1rem",
					fontSize: "0.8125rem",
					opacity: 0.6,
					alignItems: "center",
					paddingTop: "0.5rem",
					borderTop: "1px solid color-mix(in srgb, var(--color-global-text) 8%, transparent)",
					fontFamily: '"Atkinson Hyperlegible Mono", monospace',
				}}
			>
				{repoData.language && (
					<span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
						<span
							style={{
								width: "8px",
								height: "8px",
								borderRadius: "50%",
								background: "var(--color-accent)",
								display: "inline-block",
							}}
						/>
						{repoData.language}
					</span>
				)}
				<span>⭐ {repoData.stargazers_count.toLocaleString()}</span>
				<span>🍴 {repoData.forks_count.toLocaleString()}</span>
			</div>
		</a>
	);
}
