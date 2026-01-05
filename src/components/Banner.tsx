import type React from "react";
import { useEffect, useState } from "react";

interface BannerProps {
	message: string;
	type?: "info" | "warning" | "success" | "error";
	initialVisible?: boolean;
	closable?: boolean;
	link?: string;
	id?: string; // Unique identifier for this banner
	hideDurationDays?: number; // How many days to hide after dismiss
}

const Banner: React.FC<BannerProps> = ({
	message,
	type = "info",
	initialVisible = true,
	closable = true,
	link,
	id = "default-banner", // Default ID if none provided
	hideDurationDays = 5, // Default to 5 days
}) => {
	const [isVisible, setIsVisible] = useState(false);
	const [isHovered, setIsHovered] = useState(false);

	useEffect(() => {
		// Check if this banner has been dismissed and if the ID matches
		const dismissed = localStorage.getItem(`banner-dismissed-${id}`);
		if (dismissed) {
			const { timestamp } = JSON.parse(dismissed);
			const now = Date.now();
			const msInDay = 24 * 60 * 60 * 1000;
			if (now - timestamp < hideDurationDays * msInDay) {
				setIsVisible(false);
				return;
			}
		}
		setIsVisible(initialVisible);
	}, [id, initialVisible, hideDurationDays]);

	// Show the cookie consent message
	const showCookieConsentReminder = () => {
		const cookieConsent = document.getElementById("cookie-consent");
		const mainText = document.getElementById("main-text");

		if (cookieConsent && mainText) {
			cookieConsent.classList.remove("translate-y-full", "opacity-0");
			mainText.innerText = `You need to accept cookies to hide this banner for ${hideDurationDays} days.`;
			cookieConsent.classList.add("pulse-animation");
			setTimeout(() => {
				cookieConsent.classList.remove("pulse-animation");
			}, 1000);
		}
	};

	if (!isVisible) {
		return null;
	}

	// Gradient styles for different banner types with transparency
	const typeStyles = {
		info: {
			background: "linear-gradient(to right, rgba(224, 242, 254, 0.8), rgba(186, 230, 253, 0.8))",
			borderColor: "rgba(125, 211, 252, 0.5)",
			color: "#0c4a6e",
		},
		warning: {
			background: "linear-gradient(to right, rgba(254, 249, 195, 0.8), rgba(253, 224, 71, 0.8))",
			borderColor: "rgba(253, 224, 71, 0.5)",
			color: "#713f12",
		},
		success: {
			background: "linear-gradient(to right, rgba(220, 252, 231, 0.8), rgba(187, 247, 208, 0.8))",
			borderColor: "rgba(134, 239, 172, 0.5)",
			color: "#15803d",
		},
		error: {
			background: "linear-gradient(to right, rgba(254, 226, 226, 0.8), rgba(254, 202, 202, 0.8))",
			borderColor: "rgba(252, 165, 165, 0.5)",
			color: "#991b1b",
		},
	};

	const bannerStyle = {
		width: "100%",
		padding: "0.75rem 1rem",
		marginTop: "-3rem",
		marginBottom: "3rem",
		borderBottom: `1px solid ${typeStyles[type].borderColor}`,
		background: typeStyles[type].background,
		color: typeStyles[type].color,
		position: "relative",
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		borderRadius: "0.375rem",
		cursor: link ? "pointer" : "default",
		transition: "all 0.2s ease",
		border: `.10rem solid ${typeStyles[type].borderColor}`,
		transform: isHovered && link ? "translateY(-2px)" : "translateY(0)",
		boxShadow: isHovered && link ? "0 4px 6px rgba(0, 0, 0, 0.1)" : "none",
	} as React.CSSProperties;

	const handleClose = (e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();

		const cookieConsent = localStorage.getItem("cookieConsent");
		if (cookieConsent === "accepted") {
			// Save dismissal to localStorage for duration
			localStorage.setItem(`banner-dismissed-${id}`, JSON.stringify({ timestamp: Date.now() }));
		}
		// Always hide for this visit
		setIsVisible(false);
		// If not accepted, show reminder
		if (cookieConsent !== "accepted") {
			showCookieConsentReminder();
		}
	};

	// Separate the close button from the rest of the content
	const bannerContent = (
		<div style={{ fontSize: "0.875rem", flex: "1" }}>
			{message}
			{closable && (
				<span style={{ marginLeft: 8, fontSize: "0.8em", color: "#888" }}>
					(Hidden for {hideDurationDays} days after closing)
				</span>
			)}
		</div>
	);

	// Create the close button component with proper coloring and positioning
	const closeButton = closable && (
		<button
			type="button"
			onClick={handleClose}
			style={{
				background: "none",
				border: "none",
				cursor: "pointer",
				display: "flex",
				padding: "0.25rem",
				marginLeft: "1rem",
				color: typeStyles[type].color, // Match the banner text color
				opacity: 0.8,
				transition: "all 0.2s ease",
				borderRadius: "50%",
				alignItems: "center",
				justifyContent: "center",
			}}
			aria-label="Close banner"
			onMouseEnter={(e) => {
				e.currentTarget.style.opacity = "1";
				e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.opacity = "0.8";
				e.currentTarget.style.backgroundColor = "transparent";
			}}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<line x1="18" y1="6" x2="6" y2="18" />
				<line x1="6" y1="6" x2="18" y2="18" />
			</svg>
		</button>
	);

	// If a link is provided, wrap the banner content in an anchor tag
	if (link) {
		return (
			<div style={{ position: "relative" }}>
				<a
					href={link}
					style={{ textDecoration: "none", display: "block" }}
					onMouseEnter={() => setIsHovered(true)}
					onMouseLeave={() => setIsHovered(false)}
				>
					<div style={bannerStyle} role="alert">
						<div
							style={{
								display: "flex",
								width: "100%",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							{bannerContent}
							{closeButton}
						</div>
					</div>
				</a>
			</div>
		);
	}

	return (
		<div
			style={bannerStyle}
			role="alert"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			{bannerContent}
			{closeButton}
		</div>
	);
};

export default Banner;
