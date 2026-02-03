import type { TechnologyUsage } from "@/data/post";
import { Icon as IconifyIcon } from "@iconify/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { IconType } from "react-icons";
import { FaApple, FaGit, FaJava, FaUbuntu, FaWindows } from "react-icons/fa";
import {
	SiAstro,
	SiCloudflare,
	SiCplusplus,
	SiExpress,
	SiKotlin,
	SiMongodb,
	SiNextdotjs,
	SiPnpm,
	SiPostgresql,
	SiPython,
	SiReact,
	SiRedis,
	SiTailwindcss,
	SiTypescript,
	SiVercel,
	SiVite,
} from "react-icons/si";

type Tech = {
	name: string;
	icon: IconType;
	link?: string;
	description?: string;
	aliases?: string[];
};

type Category = {
	title: string;
	items: Tech[];
};

type FlatTech = Tech & { __cat: string };

type TechListProps = {
	techUsage?: TechnologyUsage;
};

const normalizeTechName = (name: string) => name.toLowerCase().trim();

// Iconify-based Shadcn UI icon wrapped to match react-icons' IconType
const ShadcnIcon: IconType = ((props: { className?: string }) => (
	<IconifyIcon icon="simple-icons:shadcnui" className={props.className} />
)) as unknown as IconType;

// Iconify-based HeroUI icon (uses NextUI brand mark) wrapped to match react-icons' IconType
const HeroUIIcon: IconType = ((props: { className?: string }) => (
	<IconifyIcon icon="simple-icons:nextui" className={props.className} />
)) as unknown as IconType;

const categories: Category[] = [
	{
		title: "Web Development",
		items: [
			{
				name: "React",
				icon: SiReact,
				link: "https://reactjs.org/",
				description: "A popular JavaScript library for building user interfaces.",
			},
			{
				name: "Next.js",
				icon: SiNextdotjs,
				link: "https://nextjs.org/",
				description: "A React-based full-stack framework with server-side rendering.",
				aliases: ["nextjs"],
			},
			{
				name: "Express",
				icon: SiExpress,
				link: "https://expressjs.com/",
				description: "A minimal and flexible Node.js web application framework.",
			},
			{
				name: "Vite",
				icon: SiVite,
				link: "https://vitejs.dev/",
				description: "A fast build tool and development server for modern web projects.",
			},
			{
				name: "Astro",
				icon: SiAstro,
				link: "https://astro.build/",
				description: "A static site builder optimized for speed and partial hydration.",
			},
			{
				name: "Tailwind CSS",
				icon: SiTailwindcss,
				link: "https://tailwindcss.com/",
				description: "A utility-first CSS framework for rapidly building UIs.",
				aliases: ["tailwind"],
			},
			{
				name: "HeroUI",
				icon: HeroUIIcon,
				link: "https://www.heroui.com/",
				description: "A UI component library built on Tailwind CSS and Radix. (Previously NextUI)",
			},
			{
				name: "ShadCN UI",
				icon: ShadcnIcon,
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
				icon: SiPostgresql,
				link: "https://www.postgresql.org/",
				description: "I use the serverless Postgres, powered by Neon, integrated into Vercel.",
			},
			{
				name: "Redis",
				icon: SiRedis,
				link: "https://redis.io/",
				description: "An in-memory data structure store for caching and queues.",
			},
			{
				name: "MongoDB",
				icon: SiMongodb,
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
				icon: SiTypescript,
				link: "https://www.typescriptlang.org/",
				description: "JavaScript with type safety — modern dev standard.",
				aliases: ["ts"],
			},
			{
				name: "Python",
				icon: SiPython,
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
				icon: FaJava,
				link: "https://www.oracle.com/java/",
				description: "A versatile language used in enterprise and Android dev.",
			},
			{
				name: "C++",
				icon: SiCplusplus,
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
				icon: FaGit,
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
				icon: SiPnpm,
				link: "https://pnpm.io/",
				description: "Fast, disk space efficient package manager.",
			},
			{
				name: "Kotlin",
				icon: SiKotlin,
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
				icon: SiVercel,
				link: "https://vercel.com/",
				description: "A platform for frontend frameworks and static sites.",
			},
			{
				name: "Cloudflare",
				icon: SiCloudflare,
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
				icon: FaUbuntu,
				link: "https://ubuntu.com/",
				description: "A popular Linux distribution for developers and servers.",
			},
			{
				name: "Windows",
				icon: FaWindows,
				link: "https://www.microsoft.com/windows/",
				description: "Mainstream OS with vast software support.",
			},
			{
				name: "MacOS",
				icon: FaApple,
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
		c.items.map((i) => ({ ...i, __cat: c.title })),
	);

	const [hoverIdx, setHoverIdx] = useState<number | null>(null);
	const [tooltipAnchor, setTooltipAnchor] = useState<{ left: number; top: number } | null>(null);
	const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
	const [lastPointerType, setLastPointerType] = useState<"mouse" | "touch" | "pen" | "unknown">(
		"unknown",
	);
	const [hoveredTechKey, setHoveredTechKey] = useState<string | null>(null);
	const [isTooltipHovered, setIsTooltipHovered] = useState(false);
	const closeTimeoutRef = useRef<number | null>(null);

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

	const getClampedTooltipPosition = useCallback(() => {
		if (typeof window === "undefined" || !tooltipAnchor) return { left: 0, top: 0 };
		const margin = 10;
		const tooltipWidth = 340;
		const tooltipHeight = 360;
		let left = tooltipAnchor.left;
		let top = tooltipAnchor.top;
		left = Math.min(Math.max(margin, left), window.innerWidth - tooltipWidth - margin);
		top = Math.min(Math.max(margin, top), window.innerHeight - tooltipHeight - margin);
		return { left, top };
	}, [tooltipAnchor]);

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
					const categoryLabel = item.__cat;
					const hasProjects = projects.length > 0;
					return (
						<div
							key={`${item.name}-${idx}`}
							className="lh-techlist-item group relative flex items-center justify-center p-1.5 md:p-1 bg-transparent"
							onMouseEnter={(e) => {
								if (closeTimeoutRef.current !== null) {
									window.clearTimeout(closeTimeoutRef.current);
									closeTimeoutRef.current = null;
								}
								const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
								const tooltipWidth = 340;
								const margin = 10;
								const spaceRight =
									typeof window !== "undefined" ? window.innerWidth - rect.right : tooltipWidth;
								const left =
									spaceRight < tooltipWidth + margin
										? rect.left - tooltipWidth - 12
										: rect.right + 12;
								setHoverIdx(idx);
								setTooltipAnchor({ left, top: rect.top });
								setHoveredTechKey(usageKey);
								setIsTooltipHovered(false);
							}}
							onMouseLeave={(e) => {
								const next = e.relatedTarget as HTMLElement | null;
								if (next?.closest?.(".lh-tech-tooltip")) return;
								if (isTooltipHovered) return;
								closeTimeoutRef.current = window.setTimeout(() => {
									setHoverIdx(null);
									setHoveredTechKey(null);
									setIsTooltipHovered(false);
									closeTimeoutRef.current = null;
								}, 140);
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
									<item.icon className="w-10 h-10 sm:w-9 sm:h-9 md:w-10 md:h-10" />
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
									<item.icon className="w-10 h-10 sm:w-9 sm:h-9 md:w-10 md:h-10" />
									<span className="sr-only">{item.name}</span>
								</button>
							)}

							{/* Cursor-following tooltip (page overlay) */}
							{hasProjects &&
								lastPointerType !== "touch" &&
								hoverIdx === idx &&
								hoveredTechKey === usageKey &&
								typeof window !== "undefined" &&
								typeof document !== "undefined" &&
								createPortal(
									<div
										className="lh-tech-tooltip pointer-events-auto fixed z-[9999]"
										style={getClampedTooltipPosition()}
										onMouseEnter={() => {
											if (closeTimeoutRef.current !== null) {
												window.clearTimeout(closeTimeoutRef.current);
												closeTimeoutRef.current = null;
											}
											setIsTooltipHovered(true);
										}}
										onMouseLeave={(e) => {
											const next = e.relatedTarget as HTMLElement | null;
											if (next?.closest?.(".lh-techlist-item")) return;
											closeTimeoutRef.current = window.setTimeout(() => {
												setHoverIdx(null);
												setHoveredTechKey(null);
												setIsTooltipHovered(false);
												closeTimeoutRef.current = null;
											}, 140);
										}}
									>
										<div className="w-[340px] max-w-[88vw] rounded-xl bg-global-bg/70 p-4 text-xs text-global-text shadow-[0_10px_30px_-15px_rgba(0,0,0,0.55)] backdrop-blur-lg ring-1 ring-white/10">
											<div className="flex items-center gap-2 mb-2">
												<item.icon className="h-4 w-4" />
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
												{projects.length > 0 ? (
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
													<p className="mt-2 text-[11px] text-global-text/60">
														No projects tagged yet.
													</p>
												)}
											</div>
										</div>
									</div>,
									document.body,
								)}

							{!hasProjects &&
								lastPointerType !== "touch" &&
								hoverIdx === idx &&
								hoveredTechKey === usageKey &&
								typeof window !== "undefined" &&
								typeof document !== "undefined" &&
								createPortal(
									<div
										className="lh-tech-tooltip pointer-events-auto fixed z-[9999]"
										style={getClampedTooltipPosition()}
										onMouseEnter={() => {
											if (closeTimeoutRef.current !== null) {
												window.clearTimeout(closeTimeoutRef.current);
												closeTimeoutRef.current = null;
											}
											setIsTooltipHovered(true);
										}}
										onMouseLeave={(e) => {
											const next = e.relatedTarget as HTMLElement | null;
											if (next?.closest?.(".lh-techlist-item")) return;
											closeTimeoutRef.current = window.setTimeout(() => {
												setHoverIdx(null);
												setHoveredTechKey(null);
												setIsTooltipHovered(false);
												closeTimeoutRef.current = null;
											}, 140);
										}}
									>
										<div className="w-[320px] max-w-[88vw] rounded-xl bg-global-bg/70 p-4 text-xs text-global-text shadow-[0_10px_30px_-15px_rgba(0,0,0,0.55)] backdrop-blur-lg ring-1 ring-white/10">
											<div className="flex items-center gap-2 mb-2">
												<item.icon className="h-4 w-4" />
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
												<p className="mt-2 text-[11px] text-global-text/70 leading-relaxed">
													I either haven't wrote about this project or I only use this in
													coursework.
												</p>
											</div>
										</div>
									</div>,
									document.body,
								)}

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
													<item.icon className="h-5 w-5" />
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
		</div>
	);
}
