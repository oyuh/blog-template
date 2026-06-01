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
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
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
					setMetadata({ title: new URL(url).hostname, description: url, url });
				}
			} catch (err) {
				console.error("Failed to fetch link preview:", err);
				setMetadata({ title: new URL(url).hostname, description: url, url });
			} finally {
				setLoading(false);
			}
		}

		if (!metadata) fetchMetadata();
	}, [url, hovered, showPreview, metadata, mounted]);

	const handleMouseEnter = () => {
		timeoutRef.current = setTimeout(() => {
			setHovered(true);
			setShowCard(true);
		}, 300);
	};

	const handleMouseLeave = () => {
		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		setHovered(false);
		if (!showPreview) setTimeout(() => setShowCard(false), 100);
	};

	if (!mounted)
		return (
			<a href={url} target="_blank" rel="noopener noreferrer">
				{children || url}
			</a>
		);

	const displayUrl = new URL(url).hostname.replace("www.", "");

	const Meta = ({ size }: { size: "card" | "tip" }) =>
		metadata ? (
			<div className={`link-preview-meta link-preview-meta--${size}`}>
				{metadata.image && (
					<img className="link-preview-img" src={metadata.image} alt={metadata.title} />
				)}
				<div className="link-preview-body">
					<div className="link-preview-source">
						{metadata.favicon && (
							<img className="link-preview-favicon" src={metadata.favicon} alt="" />
						)}
						<span>{metadata.siteName || displayUrl}</span>
					</div>
					<div className="link-preview-name">{metadata.title}</div>
					{metadata.description && (
						<p className="link-preview-desc">{metadata.description}</p>
					)}
				</div>
			</div>
		) : null;

	if (showPreview) {
		// Always-visible card
		return (
			<a
				className="link-preview-card not-prose"
				href={url}
				target="_blank"
				rel="noopener noreferrer"
			>
				{loading ? (
					<div className="link-preview-skeleton">
						<div className="link-preview-skeleton-line" style={{ width: "60%" }} />
						<div className="link-preview-skeleton-line" style={{ width: "90%" }} />
					</div>
				) : (
					<Meta size="card" />
				)}
			</a>
		);
	}

	// Hover tooltip
	return (
		<span className="link-preview-wrapper" ref={wrapperRef}>
			<a
				className="link-preview-link"
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
			>
				{children || url}
			</a>
			{showCard && metadata && (
				<span className="link-preview-tooltip not-prose">
					<Meta size="tip" />
				</span>
			)}
		</span>
	);
}
