import { useEffect, useRef, useState } from "react";

interface LinkMetadata {
	title: string;
	description: string;
	image?: string;
	url: string;
	siteName?: string;
	favicon?: string;
}

interface LinkPreviewProps {
	url: string;
	children?: React.ReactNode;
	showPreview?: boolean; // If false, only shows preview on hover
}

export default function LinkPreview({ url, children, showPreview = false }: LinkPreviewProps) {
	const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
	const [loading, setLoading] = useState(false);
	const [showCard, setShowCard] = useState(showPreview);
	const [hovered, setHovered] = useState(false);
	const [mounted, setMounted] = useState(false);
	const timeoutRef = useRef<NodeJS.Timeout>();
	const wrapperRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		setMounted(true);
		return () => setMounted(false);
	}, []);

	useEffect(() => {
		if (!mounted || (!hovered && !showPreview)) return;

		async function fetchMetadata() {
			setLoading(true);
			try {
				const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
				if (response.ok) {
					const data = await response.json();
					setMetadata(data);
				} else {
					setMetadata({
						title: new URL(url).hostname,
						description: url,
						url: url,
					});
				}
			} catch (err) {
				console.error("Failed to fetch link preview:", err);
				setMetadata({
					title: new URL(url).hostname,
					description: url,
					url: url,
				});
			} finally {
				setLoading(false);
			}
		}

		if (!metadata) {
			fetchMetadata();
		}
	}, [url, hovered, showPreview, metadata, mounted]);

	const handleMouseEnter = () => {
		timeoutRef.current = setTimeout(() => {
			setHovered(true);
			setShowCard(true);
		}, 300);
	};

	const handleMouseLeave = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		setHovered(false);
		if (!showPreview) {
			setTimeout(() => setShowCard(false), 100);
		}
	};

	if (!mounted)
		return (
			<a href={url} target="_blank" rel="noopener noreferrer">
				{children || url}
			</a>
		);

	const displayUrl = new URL(url).hostname.replace("www.", "");

	if (showPreview) {
		// Card view (always shown)
		return (
			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				style={{
					display: "block",
					padding: "1rem",
					margin: "1rem 0",
					border: "1px solid color-mix(in srgb, var(--color-global-text) 15%, transparent)",
					borderRadius: "6px",
					textDecoration: "none",
					color: "inherit",
					transition: "all 0.15s ease",
					background: "transparent",
					overflow: "hidden",
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.borderColor = "var(--color-accent)";
					e.currentTarget.style.transform = "translateY(-2px)";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.borderColor =
						"color-mix(in srgb, var(--color-global-text) 15%, transparent)";
					e.currentTarget.style.transform = "translateY(0)";
				}}
			>
				{loading ? (
					<div style={{ padding: "1rem" }}>
						<div
							style={{
								height: "1rem",
								background: "color-mix(in srgb, var(--color-global-text) 20%, transparent)",
								borderRadius: "4px",
								marginBottom: "0.5rem",
								width: "60%",
							}}
						/>
						<div
							style={{
								height: "0.75rem",
								background: "color-mix(in srgb, var(--color-global-text) 15%, transparent)",
								borderRadius: "4px",
								width: "90%",
							}}
						/>
					</div>
				) : metadata ? (
					<>
						{metadata.image && (
							<img
								src={metadata.image}
								alt={metadata.title}
								style={{
									width: "100%",
									height: "160px",
									objectFit: "cover",
									borderRadius: "4px",
									marginBottom: "0.75rem",
								}}
							/>
						)}
						<div>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									marginBottom: "0.5rem",
									opacity: 0.6,
								}}
							>
								{metadata.favicon && (
									<img src={metadata.favicon} alt="" style={{ width: "14px", height: "14px" }} />
								)}
								<span
									style={{
										fontSize: "0.8125rem",
										fontFamily: '"Atkinson Hyperlegible Mono", monospace',
									}}
								>
									{metadata.siteName || displayUrl}
								</span>
							</div>
							<h4
								style={{
									fontWeight: 600,
									fontSize: "1rem",
									color: "var(--color-accent-2)",
									marginBottom: "0.375rem",
									margin: 0,
								}}
							>
								{metadata.title}
							</h4>
							{metadata.description && (
								<p
									style={{
										fontSize: "0.875rem",
										opacity: 0.75,
										margin: 0,
										lineHeight: 1.5,
										overflow: "hidden",
										textOverflow: "ellipsis",
										display: "-webkit-box",
										WebkitLineClamp: 2,
										WebkitBoxOrient: "vertical",
									}}
								>
									{metadata.description}
								</p>
							)}
						</div>
					</>
				) : null}
			</a>
		);
	}

	// Hover preview (tooltip style)
	return (
		<span
			ref={wrapperRef}
			style={{
				position: "relative",
				display: "inline-block",
			}}
		>
			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				style={{
					color: "var(--color-link)",
					textDecoration: "underline",
					textUnderlineOffset: "2px",
					transition: "all 0.15s ease",
				}}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
			>
				{children || url}
			</a>
			{showCard && metadata && (
				<div
					style={{
						position: "absolute",
						bottom: "100%",
						left: "50%",
						transform: "translateX(-50%)",
						marginBottom: "8px",
						width: "320px",
						maxWidth: "90vw",
						padding: "0.875rem",
						background: "var(--color-global-bg)",
						border: "1px solid color-mix(in srgb, var(--color-global-text) 15%, transparent)",
						borderRadius: "6px",
						boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
						zIndex: 1000,
						pointerEvents: "none",
					}}
					onMouseEnter={(e) => e.stopPropagation()}
				>
					{metadata.image && (
						<img
							src={metadata.image}
							alt={metadata.title}
							style={{
								width: "100%",
								height: "120px",
								objectFit: "cover",
								borderRadius: "4px",
								marginBottom: "0.625rem",
							}}
						/>
					)}
					<div>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.375rem",
								marginBottom: "0.375rem",
								opacity: 0.6,
							}}
						>
							{metadata.favicon && (
								<img src={metadata.favicon} alt="" style={{ width: "12px", height: "12px" }} />
							)}
							<span
								style={{
									fontSize: "0.75rem",
									fontFamily: '"Atkinson Hyperlegible Mono", monospace',
								}}
							>
								{metadata.siteName || displayUrl}
							</span>
						</div>
						<h5
							style={{
								fontWeight: 600,
								fontSize: "0.875rem",
								color: "var(--color-accent-2)",
								margin: 0,
								marginBottom: "0.25rem",
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap",
							}}
						>
							{metadata.title}
						</h5>
						{metadata.description && (
							<p
								style={{
									fontSize: "0.8125rem",
									opacity: 0.75,
									margin: 0,
									lineHeight: 1.4,
									overflow: "hidden",
									textOverflow: "ellipsis",
									display: "-webkit-box",
									WebkitLineClamp: 2,
									WebkitBoxOrient: "vertical",
								}}
							>
								{metadata.description}
							</p>
						)}
					</div>
				</div>
			)}
		</span>
	);
}
