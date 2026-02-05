import type { TechnologyUsage } from "@/data/post";
import { getTechIconName } from "@/utils/techIcons";
import { Icon as IconifyIcon } from "@iconify/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Tech = {
	name: string;
	/** Iconify icon name, prefer `simple-icons:*` for brand icons. */
	icon?: string;
	link?: string;
	description?: string;
	aliases?: string[];
};

type Category = {
	title: string;
	items: Tech[];
};

type FlatTech = Omit<Tech, "icon"> & { icon: string; __cat: string };

type TechListProps = {
	techUsage?: TechnologyUsage;
};

type AnchorRect = {
	left: number;
	top: number;
	right: number;
	bottom: number;
	width: number;
	height: number;
};

type TooltipPlacement = "right" | "left" | "bottom" | "top";

const normalizeTechName = (name: string) => name.toLowerCase().trim();

const categories: Category[] = [
	{
		title: "Web Development",
		items: [
			{
				name: "React",
				link: "https://reactjs.org/",
				description: "A popular JavaScript library for building user interfaces.",
			},
			{
				name: "Next.js",
				link: "https://nextjs.org/",
				description: "A React-based full-stack framework with server-side rendering.",
				aliases: ["nextjs"],
			},
			{
				name: "Express",
				link: "https://expressjs.com/",
				description: "A minimal and flexible Node.js web application framework.",
			},
			{
				name: "Vite",
				link: "https://vitejs.dev/",
				description: "A fast build tool and development server for modern web projects.",
			},
			{
				name: "Astro",
				link: "https://astro.build/",
				description: "A static site builder optimized for speed and partial hydration.",
			},
			{
				name: "Tailwind CSS",
				link: "https://tailwindcss.com/",
				description: "A utility-first CSS framework for rapidly building UIs.",
				aliases: ["tailwind"],
			},
			{
				name: "HeroUI",
				link: "https://www.heroui.com/",
				description: "A UI component library built on Tailwind CSS and Radix. (Previously NextUI)",
			},
			{
				name: "ShadCN UI",
				link: "https://ui.shadcn.com/",
				description: "A beautifully styled component system for modern apps.",
			},
		],
	},
	{
		title: "Databases & Storage",
		items: [
			// {
			// 	name: "Firebase",
			// 	icon: SiFirebase,
			// 	link: "https://firebase.google.com/",
			// 	description: "A platform for building mobile/web apps with real-time data.",
			// },
			{
				name: "PostgreSQL",
				link: "https://www.postgresql.org/",
				description: "I use the serverless Postgres, powered by Neon, integrated into Vercel.",
			},
			{
				name: "Redis",
				link: "https://redis.io/",
				description: "An in-memory data structure store for caching and queues.",
			},
			{
				name: "MongoDB",
				link: "https://www.mongodb.com/",
				description: "A NoSQL database known for flexibility and scalability.",
			},
			// {
			// 	name: "Sqlite",
			// 	icon: SiSqlite,
			// 	link: "https://www.sqlite.org/index.html",
			// 	description: "A self-contained, serverless SQL database engine.",
			// },
			//sql
			// {
			// 	name: "MySQL",
			// 	icon: SiMysql,
			// 	link: "https://www.mysql.com/",
			// 	description: "A widely used open-source relational database management system.",
			// },
		],
	},
	{
		title: "Programming Languages & Tools",
		items: [
			// {
			// 	name: "JavaScript",
			// 	icon: SiJavascript,
			// 	link: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
			// 	description: "The core language of the web and interactive applications.",
			// },
			{
				name: "TypeScript",
				link: "https://www.typescriptlang.org/",
				description: "JavaScript with type safety — modern dev standard.",
				aliases: ["ts"],
			},
			{
				name: "Python",
				link: "https://www.python.org/",
				description: "A general-purpose language known for readability.",
			},
			// {
			// 	name: "Lua",
			// 	icon: SiLua,
			// 	link: "https://www.lua.org/",
			// 	description: "A lightweight scripting language often used in game development.",
			// },
			// {
			// 	name: "Rust",
			// 	icon: SiRust,
			// 	link: "https://www.rust-lang.org/",
			// 	description: "A modern systems language focused on safety and speed.",
			// },
			{
				name: "Java",
				link: "https://www.oracle.com/java/",
				description: "A versatile language used in enterprise and Android dev.",
			},
			{
				name: "C++",
				link: "https://isocpp.org/",
				description: "A powerful systems programming language with performance focus.",
				aliases: ["cpp"],
			},
			//nodejs
			// {
			// 	name: "Node.js",
			// 	icon: FaNode,
			// 	link: "https://nodejs.org/",
			// 	description: "JavaScript runtime built on Chrome's V8 engine.",
			// },
			{
				name: "Git",
				link: "https://git-scm.com/",
				description: "Version control system for tracking changes in code.",
			},
			// {
			// 	name: "NPM",
			// 	icon: FaNpm,
			// 	link: "https://www.npmjs.com/",
			// 	description: "Package manager for JavaScript and Node.js.",
			// },
			// {
			// 	name: "Yarn",
			// 	icon: FaYarn,
			// 	link: "https://yarnpkg.com/",
			// 	description: "Fast, reliable, and secure dependency management.",
			// },
			{
				name: "pnpm",
				link: "https://pnpm.io/",
				description: "Fast, disk space efficient package manager.",
			},
			{
				name: "Electron",
				link: "https://www.electronjs.org/",
				description: "Build cross-platform desktop apps with web technologies.",
				aliases: ["electron.js", "electronjs"],
			},
			{
				name: "Kotlin",
				link: "https://kotlinlang.org/",
				description: "A modern programming language for JVM and Android.",
			},
			//vercel
		],
	},
	{
		title: "Infrastructure & Deployment",
		items: [
			{
				name: "Vercel",
				link: "https://vercel.com/",
				description: "A platform for frontend frameworks and static sites.",
			},
			{
				name: "Cloudflare",
				link: "https://www.cloudflare.com/",
				description: "A web infrastructure and website security company.",
			},
		],
	},
	{
		title: "Operating Systems",
		items: [
			{
				name: "Ubuntu",
				link: "https://ubuntu.com/",
				description: "A popular Linux distribution for developers and servers.",
			},
			{
				name: "Windows",
				link: "https://www.microsoft.com/windows/",
				description: "Mainstream OS with vast software support.",
			},
			{
				name: "MacOS",
				link: "https://www.apple.com/macos/",
				description: "Apple's polished desktop operating system.",
			},
		],
	},
	// {
	// 	title: "Visual Implementation",
	// 	items: [
	// 		{
	// 			name: "Photoshop",
	// 			icon: SiAdobephotoshop,
	// 			link: "https://www.adobe.com/products/photoshop.html",
	// 			description: "Industry-standard image editor for digital graphics.",
	// 		},
	// 		{
	// 			name: "Illustrator",
	// 			icon: SiAdobeillustrator,
	// 			link: "https://www.adobe.com/products/illustrator.html",
	// 			description: "Vector-based design tool for logos, icons, and branding.",
	// 		},
	// 		{
	// 			name: "Figma",
	// 			icon: SiFigma,
	// 			link: "https://www.figma.com/",
	// 			description: "A collaborative interface design tool.",
	// 		},
	// 	],
	// },
];

export default function TechList({ techUsage = {} }: TechListProps) {
	// Flatten into one grid and prepare cursor-following tooltips
	const flat: FlatTech[] = categories.flatMap((c) =>
		c.items.map((i) => ({
			...i,
			icon: i.icon ?? getTechIconName(i.name, i.aliases),
			__cat: c.title,
		})),
	);

	const [hoverIdx, setHoverIdx] = useState<number | null>(null);
	const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
	const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
	const [tooltipSize, setTooltipSize] = useState<{ width: number; height: number }>({
		width: 340,
		height: 360,
	});
	const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
	const [lastPointerType, setLastPointerType] = useState<"mouse" | "touch" | "pen" | "unknown">(
		"unknown",
	);
	const [hoveredTechKey, setHoveredTechKey] = useState<string | null>(null);
	const [isTooltipHovered, setIsTooltipHovered] = useState(false);
	const closeTimeoutRef = useRef<number | null>(null);
	const tooltipRef = useRef<HTMLDivElement | null>(null);
	const tooltipResizeObserverRef = useRef<ResizeObserver | null>(null);
	const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
	const SAFE_CLOSE_DELAY_MS = 260;
	const SAFE_ZONE_PADDING_PX = 10;

	const clearCloseTimeout = useCallback(() => {
		if (closeTimeoutRef.current !== null) {
			window.clearTimeout(closeTimeoutRef.current);
			closeTimeoutRef.current = null;
		}
	}, []);

	const closeTooltip = useCallback(() => {
		setHoverIdx(null);
		setHoveredTechKey(null);
		setAnchorRect(null);
		setPointerPos(null);
		setIsTooltipHovered(false);
		closeTimeoutRef.current = null;
	}, []);

	const scheduleClose = useCallback(
		(delay = SAFE_CLOSE_DELAY_MS) => {
			clearCloseTimeout();
			closeTimeoutRef.current = window.setTimeout(() => {
				closeTooltip();
			}, delay);
		},
		[clearCloseTimeout, closeTooltip],
	);

	const tooltipNodeRef = useCallback((node: HTMLDivElement | null) => {
		tooltipRef.current = node;
		if (tooltipResizeObserverRef.current) {
			tooltipResizeObserverRef.current.disconnect();
			tooltipResizeObserverRef.current = null;
		}
		if (!node) return;
		const measure = () => {
			const rect = node.getBoundingClientRect();
			if (!rect.width || !rect.height) return;
			setTooltipSize({ width: rect.width, height: rect.height });
		};
		measure();
		if (typeof ResizeObserver !== "undefined") {
			const ro = new ResizeObserver(() => measure());
			ro.observe(node);
			tooltipResizeObserverRef.current = ro;
		}
	}, []);

	const getUsageForItem = useCallback(
		(item: Tech) => {
			const keys = [normalizeTechName(item.name), ...(item.aliases ?? []).map(normalizeTechName)];
			for (const key of keys) {
				const usage = techUsage[key];
				if (usage) return usage;
			}
			return null;
		},
		[techUsage],
	);

	const getUsageKeyForItem = useCallback(
		(item: Tech) => {
			const keys = [normalizeTechName(item.name), ...(item.aliases ?? []).map(normalizeTechName)];
			for (const key of keys) {
				if (techUsage[key]) return key;
			}
			return null;
		},
		[techUsage],
	);

	const getCurrentAnchorRect = useCallback((idx: number | null): AnchorRect | null => {
		if (idx === null) return null;
		const el = itemRefs.current[idx];
		if (!el) return null;
		const rect = el.getBoundingClientRect();
		return {
			left: rect.left,
			top: rect.top,
			right: rect.right,
			bottom: rect.bottom,
			width: rect.width,
			height: rect.height,
		};
	}, []);

	const computeTooltipPosition = useCallback((): {
		left: number;
		top: number;
		placement: TooltipPlacement;
	} => {
		if (typeof window === "undefined") return { left: 0, top: 0, placement: "right" };
		if (!anchorRect) return { left: 0, top: 0, placement: "right" };
		const { width: tooltipWidth, height: tooltipHeight } = tooltipSize;
		const margin = 10;
		const gap = 12;
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const fallbackX = anchorRect.left + anchorRect.width / 2;
		const fallbackY = anchorRect.top + anchorRect.height / 2;
		const rawX = pointerPos?.x ?? fallbackX;
		const rawY = pointerPos?.y ?? fallbackY;
		// Only let the pointer influence position while it's still "on" the icon.
		const px = Math.min(Math.max(anchorRect.left, rawX), anchorRect.right);
		const py = Math.min(Math.max(anchorRect.top, rawY), anchorRect.bottom);

		const spaceRight = vw - anchorRect.right;
		const spaceLeft = anchorRect.left;
		const spaceBottom = vh - anchorRect.bottom;
		const spaceTop = anchorRect.top;

		let placement: TooltipPlacement = "right";
		if (spaceRight >= tooltipWidth + gap + margin) placement = "right";
		else if (spaceLeft >= tooltipWidth + gap + margin) placement = "left";
		else if (spaceBottom >= tooltipHeight + gap + margin) placement = "bottom";
		else if (spaceTop >= tooltipHeight + gap + margin) placement = "top";
		else placement = spaceBottom >= spaceTop ? "bottom" : "top";

		let left = 0;
		let top = 0;
		if (placement === "right") {
			left = anchorRect.right + gap;
			top = py - tooltipHeight / 2;
		} else if (placement === "left") {
			left = anchorRect.left - tooltipWidth - gap;
			top = py - tooltipHeight / 2;
		} else if (placement === "bottom") {
			left = px - tooltipWidth / 2;
			top = anchorRect.bottom + gap;
		} else {
			left = px - tooltipWidth / 2;
			top = anchorRect.top - tooltipHeight - gap;
		}

		left = Math.min(Math.max(margin, left), vw - tooltipWidth - margin);
		top = Math.min(Math.max(margin, top), vh - tooltipHeight - margin);

		return { left, top, placement };
	}, [anchorRect, pointerPos, tooltipSize]);

	const tooltipPosition = useMemo(() => computeTooltipPosition(), [computeTooltipPosition]);

	const tooltipRect = useMemo(() => {
		return {
			left: tooltipPosition.left,
			top: tooltipPosition.top,
			right: tooltipPosition.left + tooltipSize.width,
			bottom: tooltipPosition.top + tooltipSize.height,
			width: tooltipSize.width,
			height: tooltipSize.height,
		};
	}, [tooltipPosition.left, tooltipPosition.top, tooltipSize.height, tooltipSize.width]);

	const isPointerInSafeZone = useCallback(
		(x: number, y: number) => {
			if (!anchorRect) return false;
			const inRect = (rect: { left: number; top: number; right: number; bottom: number }) =>
				x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

			const paddedAnchor = {
				left: anchorRect.left - SAFE_ZONE_PADDING_PX,
				top: anchorRect.top - SAFE_ZONE_PADDING_PX,
				right: anchorRect.right + SAFE_ZONE_PADDING_PX,
				bottom: anchorRect.bottom + SAFE_ZONE_PADDING_PX,
			};
			const paddedTooltip = {
				left: tooltipRect.left - SAFE_ZONE_PADDING_PX,
				top: tooltipRect.top - SAFE_ZONE_PADDING_PX,
				right: tooltipRect.right + SAFE_ZONE_PADDING_PX,
				bottom: tooltipRect.bottom + SAFE_ZONE_PADDING_PX,
			};

			// Inside either element => safe
			if (inRect(paddedAnchor) || inRect(paddedTooltip)) return true;

			// Corridor between anchor and tooltip based on placement
			const top = Math.min(paddedAnchor.top, paddedTooltip.top);
			const bottom = Math.max(paddedAnchor.bottom, paddedTooltip.bottom);
			if (tooltipPosition.placement === "right") {
				const corridor = {
					left: paddedAnchor.right,
					right: paddedTooltip.left,
					top,
					bottom,
				};
				return inRect(corridor);
			}
			if (tooltipPosition.placement === "left") {
				const corridor = {
					left: paddedTooltip.right,
					right: paddedAnchor.left,
					top,
					bottom,
				};
				return inRect(corridor);
			}
			if (tooltipPosition.placement === "bottom") {
				const corridor = {
					left: Math.min(paddedAnchor.left, paddedTooltip.left),
					right: Math.max(paddedAnchor.right, paddedTooltip.right),
					top: paddedAnchor.bottom,
					bottom: paddedTooltip.top,
				};
				return inRect(corridor);
			}
			// top
			const corridor = {
				left: Math.min(paddedAnchor.left, paddedTooltip.left),
				right: Math.max(paddedAnchor.right, paddedTooltip.right),
				top: paddedTooltip.bottom,
				bottom: paddedAnchor.top,
			};
			return inRect(corridor);
		},
		[anchorRect, tooltipRect, tooltipPosition.placement],
	);

	// While a tooltip is open, keep close behavior forgiving:
	// - entering the safe corridor cancels a pending close
	// - leaving the safe corridor schedules a close
	// NOTE: this does NOT update tooltip positioning (so it won't chase the cursor).
	useEffect(() => {
		if (hoverIdx === null) return;
		if (lastPointerType === "touch") return;
		const onMove = (e: MouseEvent) => {
			const inSafe = isPointerInSafeZone(e.clientX, e.clientY);
			if (inSafe) {
				clearCloseTimeout();
				return;
			}
			if (closeTimeoutRef.current === null) scheduleClose(180);
		};
		window.addEventListener("mousemove", onMove, { passive: true });
		return () => window.removeEventListener("mousemove", onMove);
	}, [hoverIdx, lastPointerType, clearCloseTimeout, isPointerInSafeZone, scheduleClose]);

	useEffect(() => {
		if (hoverIdx === null) return;
		const update = () => {
			const next = getCurrentAnchorRect(hoverIdx);
			if (next) setAnchorRect(next);
		};
		update();
		window.addEventListener("resize", update);
		window.addEventListener("scroll", update, true);
		return () => {
			window.removeEventListener("resize", update);
			window.removeEventListener("scroll", update, true);
		};
	}, [hoverIdx, getCurrentAnchorRect]);

	// Track the last pointer type (mouse/touch/pen) to decide interaction mode per event
	useEffect(() => {
		const handler = (e: PointerEvent) => {
			const pt = (e.pointerType as "mouse" | "touch" | "pen") ?? "unknown";
			setLastPointerType(pt);
		};
		document.addEventListener("pointerdown", handler);
		return () => document.removeEventListener("pointerdown", handler);
	}, []);

	// Close mobile tooltip when tapping outside (ignore taps on item button or tooltip content)
	useEffect(() => {
		const handler = (e: PointerEvent) => {
			if (selectedIdx === null) return;
			const el = e.target as HTMLElement | null;
			if (el?.closest?.(".lh-techlist-tooltip") || el?.closest?.(".lh-techlist-item")) return;
			setSelectedIdx(null);
		};
		document.addEventListener("pointerdown", handler, { passive: true });
		return () => document.removeEventListener("pointerdown", handler);
	}, [selectedIdx]);

	// Allow closing with Escape key
	useEffect(() => {
		if (selectedIdx === null) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setSelectedIdx(null);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [selectedIdx]);

	return (
		<div>
			<div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-10 gap-0.25 sm:gap-0 md:gap-0.25">
				{flat.map((item, idx) => {
					const usage = getUsageForItem(item);
					const projects = usage?.projects ?? [];
					const usageKey = getUsageKeyForItem(item) ?? normalizeTechName(item.name);
					const projectHref = projects[0] ? `/posts/${projects[0].id}/` : undefined;
					const hasProjects = projects.length > 0;
					return (
						<div
							key={`${item.name}-${idx}`}
							ref={(el) => {
								itemRefs.current[idx] = el;
							}}
							className="lh-techlist-item group relative flex items-center justify-center p-1.5 md:p-1 bg-transparent"
							onMouseEnter={(e) => {
								// If a tooltip is already open, don't let neighboring icons steal hover while
								// the cursor is in the current tooltip's safe corridor (common when tooltip is
								// placed to the right/left and you move quickly into it).
								if (hoverIdx !== null && hoverIdx !== idx) {
									if (isTooltipHovered) return;
									if (isPointerInSafeZone(e.clientX, e.clientY)) return;
								}

								clearCloseTimeout();
								const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
								setAnchorRect({
									left: rect.left,
									top: rect.top,
									right: rect.right,
									bottom: rect.bottom,
									width: rect.width,
									height: rect.height,
								});
								setPointerPos({ x: e.clientX, y: e.clientY });
								setHoverIdx(idx);
								setHoveredTechKey(usageKey);
								setIsTooltipHovered(false);
							}}
							onMouseMove={(e) => {
								if (hoverIdx !== idx) return;
								setPointerPos({ x: e.clientX, y: e.clientY });
							}}
							onMouseLeave={(e) => {
								const next = e.relatedTarget as HTMLElement | null;
								if (next?.closest?.(".lh-tech-tooltip")) return;
								// Always schedule close on leave; safe corridor cancels it via global mousemove.
								if (isTooltipHovered) return;
								scheduleClose();
							}}
							onPointerDown={(e) => {
								// Ensure pointer type is captured for click handling below
								const pt = (e.pointerType as "mouse" | "touch" | "pen") ?? "unknown";
								setLastPointerType(pt);
								// Prevent outside click handler from firing immediately
								e.stopPropagation();
							}}
						>
							{projectHref ? (
								<a
									href={projectHref}
									onClick={(e) => {
										// On touch, open the mobile tooltip instead of navigating
										if (lastPointerType === "touch") {
											e.preventDefault();
											setSelectedIdx((prev) => (prev === idx ? null : idx));
										}
									}}
									className={`inline-flex items-center justify-center transition-colors ${
										hasProjects ? "text-accent" : "text-[var(--c-text)] group-hover:text-accent"
									}`}
								>
									<IconifyIcon
										icon={item.icon}
										className="w-10 h-10 sm:w-9 sm:h-9 md:w-10 md:h-10"
									/>
									<span className="sr-only">{item.name}</span>
								</a>
							) : (
								<button
									type="button"
									onClick={() => {
										if (lastPointerType === "touch") {
											setSelectedIdx((prev) => (prev === idx ? null : idx));
										}
									}}
									className={`inline-flex items-center justify-center transition-colors ${
										hasProjects ? "text-accent" : "text-[var(--c-text)] group-hover:text-accent"
									}`}
								>
									<IconifyIcon
										icon={item.icon}
										className="w-10 h-10 sm:w-9 sm:h-9 md:w-10 md:h-10"
									/>
									<span className="sr-only">{item.name}</span>
								</button>
							)}

							{/* Mobile: tap-to-open fixed tooltip at bottom */}
							{/* Mobile: tap-to-open fixed tooltip at bottom */}
							{lastPointerType === "touch" &&
								selectedIdx === idx &&
								typeof window !== "undefined" &&
								typeof document !== "undefined" &&
								createPortal(
									<div className="lh-techlist-tooltip fixed inset-0 z-[9999] flex items-center justify-center px-4 pointer-events-auto">
										{/* Dim backdrop (tap or keyboard to close) */}
										<button
											type="button"
											aria-label="Close overlay"
											onClick={() => setSelectedIdx(null)}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") setSelectedIdx(null);
											}}
											className="absolute inset-0 bg-black/40"
										/>
										{/* Content card */}
										<dialog
											open
											className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-lg border border-accent/20 bg-global-bg shadow-xl overflow-hidden p-0"
										>
											<div className="bg-accent/5 p-4 relative">
												<button
													type="button"
													aria-label="Close"
													onClick={() => setSelectedIdx(null)}
													className="absolute right-2 top-2 rounded p-1 text-global-text/60 hover:text-global-text hover:bg-accent/10 transition-colors"
												>
													<svg
														className="h-4 w-4"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M6 18L18 6M6 6l12 12"
														/>
													</svg>
												</button>
												<div className="flex items-center gap-2 mb-2 pr-6">
													<IconifyIcon icon={item.icon} className="h-5 w-5" />
													<p className="text-sm font-semibold text-accent-2">{item.name}</p>
												</div>
												{item.description && (
													<p className="text-[13px] text-[var(--c-text-dimmed)] leading-relaxed">
														{item.description}
													</p>
												)}
												<div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
													<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-global-text/60">
														Projects using this
													</p>
													{projects.length > 0 ? (
														<div className="mt-2 max-h-40 overflow-y-auto space-y-2 pr-1">
															{projects.map((project) => (
																<a
																	key={project.id}
																	href={`/posts/${project.id}/`}
																	className="block rounded-md border border-white/5 bg-global-bg/70 px-3 py-2 text-[12px] text-global-text/80 hover:border-accent/40"
																	data-astro-prefetch
																>
																	<p className="text-[12px] font-semibold text-accent-2">
																		{project.title}
																	</p>
																	{project.description && (
																		<p className="mt-1 text-[11px] text-global-text/65 leading-relaxed">
																			{project.description}
																		</p>
																	)}
																</a>
															))}
														</div>
													) : (
														<p className="mt-2 text-[12px] text-global-text/60">
															No projects tagged yet.
														</p>
													)}
												</div>
												{item.link && (
													<div className="mt-3 text-[12px]">
														<a
															href={item.link}
															target="_blank"
															rel="noopener noreferrer"
															className="lawson-link inline-flex items-center gap-1"
														>
															Open resource ↗
														</a>
													</div>
												)}
											</div>
										</dialog>
									</div>,
									document.body,
								)}
						</div>
					);
				})}
			</div>

			{/* Desktop hover tooltip (single portal) */}
			{hoverIdx !== null &&
				lastPointerType !== "touch" &&
				hoveredTechKey &&
				typeof window !== "undefined" &&
				typeof document !== "undefined" &&
				(() => {
					const item = flat[hoverIdx];
					if (!item) return null;
					const usage = getUsageForItem(item);
					const projects = usage?.projects ?? [];
					const hasProjects = projects.length > 0;
					const categoryLabel = item.__cat;
					return createPortal(
						<div
							ref={tooltipNodeRef}
							className="lh-tech-tooltip pointer-events-auto fixed z-[9999]"
							style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
							data-placement={tooltipPosition.placement}
							onMouseEnter={() => {
								clearCloseTimeout();
								setIsTooltipHovered(true);
							}}
							onMouseLeave={(e) => {
								const next = e.relatedTarget as HTMLElement | null;
								if (next?.closest?.(".lh-techlist-item")) return;
								// Always schedule close on leave; safe corridor cancels it via global mousemove.
								scheduleClose();
							}}
						>
							<div
								className={`max-w-[88vw] rounded-xl bg-global-bg/70 p-4 text-xs text-global-text shadow-[0_10px_30px_-15px_rgba(0,0,0,0.55)] backdrop-blur-lg ring-1 ring-white/10 ${
									hasProjects ? "w-[340px]" : "w-[320px]"
								}`}
							>
								<div className="flex items-center gap-2 mb-2">
									<IconifyIcon icon={item.icon} className="h-4 w-4" />
									<p className="text-xs font-semibold text-accent-2">{item.name}</p>
									<span className="text-[10px] text-global-text/40">· {categoryLabel}</span>
								</div>
								{item.description && (
									<p className="text-[11px] text-global-text/70 leading-relaxed">
										{item.description}
									</p>
								)}
								<div className="mt-3 border-t border-white/10 pt-3">
									<p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-global-text/50">
										Projects using this
									</p>
									{hasProjects ? (
										<div className="mt-2 max-h-44 space-y-2 overflow-y-auto pr-1">
											{projects.map((project) => (
												<a
													key={project.id}
													href={`/posts/${project.id}/`}
													className="group relative block overflow-hidden rounded-lg border border-white/5 bg-white/5 px-3 py-3 text-[11px] text-global-text/80 transition-colors hover:border-accent/40 hover:text-global-text"
													data-astro-prefetch
												>
													{project.coverImage?.src && (
														<span
															className="pointer-events-none absolute inset-0 opacity-90 blur-3xl"
															style={{
																backgroundImage: `url(${project.coverImage.src})`,
																backgroundSize: "cover",
																backgroundPosition: "center",
															}}
														/>
													)}
													<span className="pointer-events-none absolute inset-0 bg-global-bg/5" />
													<p className="relative text-[11px] font-semibold text-accent-2">
														{project.title}
													</p>
													{project.description && (
														<p className="relative mt-1 text-[10px] text-global-text/65 leading-relaxed">
															{project.description}
														</p>
													)}
												</a>
											))}
										</div>
									) : (
										<p className="mt-2 text-[11px] text-global-text/70 leading-relaxed">
											I either haven't wrote about this project or I only use this in coursework.
										</p>
									)}
								</div>
								{item.link && (
									<div className="mt-3 text-[12px]">
										<a
											href={item.link}
											target="_blank"
											rel="noopener noreferrer"
											className="lawson-link inline-flex items-center gap-1"
										>
											Open resource ↗
										</a>
									</div>
								)}
							</div>
						</div>,
						document.body,
					);
				})()}
		</div>
	);
}
