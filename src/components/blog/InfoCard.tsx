import type { ReactNode } from "react";

interface InfoCardProps {
	title: string;
	children: ReactNode;
	type?: "info" | "success" | "warning" | "error";
	icon?: string;
}

export default function InfoCard({ title, children, type = "info", icon }: InfoCardProps) {
	const colors = {
		info: "var(--color-accent)",
		success: "#10b981",
		warning: "#f59e0b",
		error: "#ef4444",
	};

	const bgColors = {
		info: "color-mix(in srgb, var(--color-accent) 4%, transparent)",
		success: "color-mix(in srgb, #10b981 4%, transparent)",
		warning: "color-mix(in srgb, #f59e0b 4%, transparent)",
		error: "color-mix(in srgb, #ef4444 4%, transparent)",
	};

	const borderColors = {
		info: "color-mix(in srgb, var(--color-accent) 25%, transparent)",
		success: "color-mix(in srgb, #10b981 25%, transparent)",
		warning: "color-mix(in srgb, #f59e0b 25%, transparent)",
		error: "color-mix(in srgb, #ef4444 25%, transparent)",
	};

	const defaultIcons = {
		info: "ℹ️",
		success: "✅",
		warning: "⚠️",
		error: "❌",
	};

	return (
		<div
			className="info-card-container"
			style={{
				backgroundColor: bgColors[type],
				borderLeft: `3px solid ${colors[type]}`,
				borderColor: borderColors[type],
				borderRadius: "4px",
				padding: "1rem 1.25rem",
				margin: "1rem 0",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "0.625rem",
					marginBottom: "0.5rem",
				}}
			>
				<span
					className="info-card-emoji"
					style={{
						fontSize: "1.25rem",
						lineHeight: 1,
						display: "inline-block",
					}}
				>
					{icon || defaultIcons[type]}
				</span>
				<h4
					className="info-card-heading"
					style={{
						color: colors[type],
						margin: 0,
						fontWeight: 600,
						fontSize: "1rem",
						fontFamily: '"Atkinson Hyperlegible", sans-serif',
					}}
				>
					{title}
				</h4>
			</div>
			<div
				style={{
					color: "var(--color-global-text)",
					fontSize: "0.9375rem",
					lineHeight: 1.6,
				}}
			>
				{children}
			</div>
		</div>
	);
}
