import mdiIconsCollection from "@iconify-json/mdi/icons.json";
import { Icon as IconifyIcon } from "@iconify/react/dist/offline";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type IconCollection = {
	prefix: string;
	width?: number;
	height?: number;
	icons: Record<string, { body: string; width?: number; height?: number }>;
};

const MDI = mdiIconsCollection as IconCollection;

const resolveIcon = (name: string) => {
	const iconName = name.includes(":") ? name.split(":")[1] : name;
	const icon = MDI.icons[iconName ?? ""];
	if (!icon) {
		return {
			body: MDI.icons["help-circle"]?.body ?? "",
			width: MDI.width ?? 24,
			height: MDI.height ?? 24,
		};
	}
	return {
		body: icon.body,
		width: icon.width ?? MDI.width ?? 24,
		height: icon.height ?? MDI.height ?? 24,
	};
};

const LEFT_CLICK_ICON = resolveIcon("mdi:mouse-left-click-outline");
const RIGHT_CLICK_ICON = resolveIcon("mdi:mouse-right-click-outline");

type Social = {
	label: string;
	copyValue: string;
	href: string;
	icon: string;
	/** Short handle / domain shown on hover below the icon. */
	domain?: string;
};

const socials: Social[] = [
	{
		label: "@oyuh",
		copyValue: "https://github.com/oyuh/",
		href: "https://github.com/oyuh/",
		icon: "mdi:github",
		domain: "@oyuh",
	},
	{
		label: "@sumboutlaw",
		copyValue: "@sumboutlaw",
		href: "https://x.com/sumboutlaw/",
		icon: "mdi:twitter",
		domain: "@sumboutlaw",
	},
	{
		label: "@lawson-hart",
		copyValue: "https://www.linkedin.com/in/lawson-hart/",
		href: "https://www.linkedin.com/in/lawson-hart/",
		icon: "mdi:linkedin",
		domain: "@lawson-hart",
	},
	{
		label: "@lawsonwtf",
		copyValue: "@lawsonwtf",
		href: "https://www.instagram.com/lawsonwtf/",
		icon: "mdi:instagram",
		domain: "@lawsonwtf",
	},
	{
		label: "@wthlaw",
		copyValue: "@wthlaw",
		href: "https://discordapp.com/users/527167786200465418",
		icon: "mdi:discord",
		domain: "@wthlaw",
	},
	{
		label: "me@lawsonhart.me",
		copyValue: "me@lawsonhart.me",
		href: "mailto:me@lawsonhart.me",
		icon: "mdi:email",
		domain: "me@lawsonhart.me",
	},
];

export default function HeroSocialLinks() {
	const [hoverIdx, setHoverIdx] = useState<number | null>(null);
	const [mouse, setMouse] = useState({ x: 0, y: 0 });
	const [supportsHover, setSupportsHover] = useState(false);
	const [lastPointerType, setLastPointerType] = useState<"mouse" | "touch" | "pen" | "unknown">(
		"unknown",
	);
	const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

	useEffect(() => {
		const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
		const update = () => setSupportsHover(mq.matches);
		update();
		mq.addEventListener?.("change", update);
		return () => mq.removeEventListener?.("change", update);
	}, []);

	useEffect(() => {
		const onPointerDown = (e: PointerEvent) => {
			const pt = (e.pointerType as "mouse" | "touch" | "pen") ?? "unknown";
			setLastPointerType(pt);
			if (pt !== "mouse") setHoverIdx(null);
		};
		// A single mousemove is enough to confirm mouse user
		const onMouseMove = () => setLastPointerType("mouse");
		document.addEventListener("pointerdown", onPointerDown, { passive: true });
		document.addEventListener("mousemove", onMouseMove, { passive: true, once: true });
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("mousemove", onMouseMove);
		};
	}, []);

	useEffect(() => {
		const clearHover = () => setHoverIdx(null);
		window.addEventListener("scroll", clearHover, { passive: true, capture: true });
		window.addEventListener("resize", clearHover, { passive: true });
		window.addEventListener("blur", clearHover);
		return () => {
			window.removeEventListener("scroll", clearHover, true);
			window.removeEventListener("resize", clearHover);
			window.removeEventListener("blur", clearHover);
		};
	}, []);

	const getTooltipPosition = useCallback(() => {
		const margin = 10;
		const tooltipWidth = 200;
		const tooltipHeight = 100;
		let left = mouse.x - tooltipWidth / 2;
		let top = mouse.y + 16;
		left = Math.min(Math.max(margin, left), window.innerWidth - tooltipWidth - margin);
		top = Math.min(Math.max(margin, top), window.innerHeight - tooltipHeight - margin);
		return { left, top };
	}, [mouse.x, mouse.y]);

	const hoveredSocial = hoverIdx !== null ? socials[hoverIdx] : null;
	const showTooltip = supportsHover && lastPointerType === "mouse" && hoveredSocial !== null;

	return (
		<div className="flex flex-wrap items-center gap-1 pb-5">
			{socials.map((social, idx) => {
				const iconData = resolveIcon(social.icon);
				return (
					<div key={social.label} className="group relative flex flex-col items-center">
						<a
							href={social.href}
							target={social.href.startsWith("mailto:") ? undefined : "_blank"}
							rel={social.href.startsWith("mailto:") ? undefined : "noreferrer"}
							aria-label={`Open ${social.label}`}
							onMouseEnter={(e) => {
								setLastPointerType("mouse");
								setHoverIdx(idx);
								setMouse({ x: e.clientX, y: e.clientY });
							}}
							onMouseMove={(e) => {
								if (hoverIdx !== idx) return;
								setMouse({ x: e.clientX, y: e.clientY });
							}}
							onMouseLeave={() => setHoverIdx(null)}
							onContextMenu={(e) => {
								e.preventDefault();
								navigator.clipboard.writeText(social.copyValue).then(() => {
									setCopiedIdx(idx);
									setTimeout(() => setCopiedIdx(null), 2000);
								});
							}}
							className={`inline-flex items-center justify-center rounded-lg p-1.5 transition-colors duration-200 ease-out hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
								copiedIdx === idx ? "text-accent" : "text-global-text hover:text-accent"
							}`}
						>
							<IconifyIcon icon={iconData} className="w-8 h-8" />
							<span className="sr-only">{social.label}</span>
						</a>
						{social.domain && (
							<span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-global-bg/80 px-1.5 py-0.5 text-[10px] font-medium text-accent-2 ring-1 ring-white/10 backdrop-blur-sm opacity-0 translate-y-1 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:translate-y-0">
								{social.domain}
							</span>
						)}
					</div>
				);
			})}

			{showTooltip &&
				hoveredSocial &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						className="pointer-events-none fixed z-[9999] w-52 max-w-[85vw] rounded-xl bg-global-bg/70 p-4 text-xs text-global-text shadow-[0_10px_30px_-15px_rgba(0,0,0,0.55)] backdrop-blur-lg ring-1 ring-white/10"
						style={getTooltipPosition()}
					>
						<div className="space-y-2">
							<p className="text-sm font-semibold text-accent-2">
								{hoveredSocial.domain ?? hoveredSocial.label}
							</p>
							<div className="space-y-1 border-t border-white/10 pt-2">
								<div className="flex items-center gap-1.5 text-[10px] text-global-text/60">
									<IconifyIcon icon={LEFT_CLICK_ICON} className="h-3.5 w-3.5 shrink-0" />
									<span>go to</span>
								</div>
								<div className="flex items-center gap-1.5 text-[10px] text-global-text/60">
									<IconifyIcon icon={RIGHT_CLICK_ICON} className="h-3.5 w-3.5 shrink-0" />
									<span>copy</span>
								</div>
							</div>
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
}
