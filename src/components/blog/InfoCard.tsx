import type { ReactNode } from "react";

type InfoType = "info" | "success" | "warning" | "error";

interface InfoCardProps {
	title: string;
	children: ReactNode;
	type?: InfoType;
	/** Optional custom icon (emoji or short text) to replace the default glyph. */
	icon?: string;
}

// Minimal line icons that echo the site's admonition set rather than emoji.
const ICON_PATHS: Record<InfoType, ReactNode> = {
	info: (
		<>
			<circle cx="12" cy="12" r="9" />
			<line x1="12" y1="11" x2="12" y2="16" />
			<line x1="12" y1="8" x2="12" y2="8" />
		</>
	),
	success: (
		<>
			<circle cx="12" cy="12" r="9" />
			<path d="M8.5 12.5l2.5 2.5 4.5-5" />
		</>
	),
	warning: (
		<>
			<path d="M12 4 21 19 3 19 12 4z" />
			<line x1="12" y1="10" x2="12" y2="14" />
			<line x1="12" y1="17" x2="12" y2="17" />
		</>
	),
	error: (
		<>
			<circle cx="12" cy="12" r="9" />
			<line x1="9" y1="9" x2="15" y2="15" />
			<line x1="15" y1="9" x2="9" y2="15" />
		</>
	),
};

export default function InfoCard({ title, children, type = "info", icon }: InfoCardProps) {
	return (
		<div className={`info-callout not-prose info-callout--${type}`}>
			<div className="info-callout-head">
				<span className="info-callout-icon" aria-hidden="true">
					{icon ? (
						<span className="info-callout-emoji">{icon}</span>
					) : (
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.75"
							strokeLinecap="round"
							strokeLinejoin="round"
							width="18"
							height="18"
						>
							{ICON_PATHS[type]}
						</svg>
					)}
				</span>
				<h4 className="info-callout-title">{title}</h4>
			</div>
			<div className="info-callout-body">{children}</div>
		</div>
	);
}
