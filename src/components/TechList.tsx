import { Icon as IconifyIcon } from "@iconify/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { IconType } from "react-icons";
import {
	FaApple,
	FaDatabase,
	FaDesktop,
	FaExternalLinkAlt,
	FaGit,
	FaGlobe,
	FaJava,
	FaServer,
	FaTools,
	FaUbuntu,
	FaWindows,
} from "react-icons/fa";
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
};

type Category = {
	title: string;
	items: Tech[];
};

type FlatTech = Tech & { __cat: string };

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

export default function TechList() {
	// Flatten into one grid and prepare cursor-following tooltips
	const flat: FlatTech[] = categories.flatMap((c) =>
		c.items.map((i) => ({ ...i, __cat: c.title })),
	);

	const [hoverIdx, setHoverIdx] = useState<number | null>(null);
	const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
	const [lastPointerType, setLastPointerType] = useState<"mouse" | "touch" | "pen" | "unknown">(
		"unknown",
	);

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

	const catBadge: Record<string, { icon: IconType; title: string }> = {
		"Web Development": { icon: FaGlobe, title: "Web Dev" },
		"Databases & Storage": { icon: FaDatabase, title: "Database" },
		"Programming Languages & Tools": { icon: FaTools, title: "Programming" },
		"Infrastructure & Deployment": { icon: FaServer, title: "Infrastructure" },
		"Operating Systems": { icon: FaDesktop, title: "OS" },
	};

	return (
		<div>
			<div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-10 gap-3 sm:gap-2 md:gap-2.5">
				{flat.map((item, idx) => {
					const badge = catBadge[item.__cat as keyof typeof catBadge];
					return (
						<div
							key={`${item.name}-${idx}`}
							className="lh-techlist-item group relative flex items-center justify-center p-3 md:p-2 bg-transparent"
							onMouseEnter={(e) => {
								setHoverIdx(idx);
								setMouse({ x: e.clientX, y: e.clientY });
							}}
							onMouseLeave={() => setHoverIdx(null)}
							onMouseMove={(e) => setMouse({ x: e.clientX, y: e.clientY })}
							onPointerDown={(e) => {
								// Ensure pointer type is captured for click handling below
								const pt = (e.pointerType as "mouse" | "touch" | "pen") ?? "unknown";
								setLastPointerType(pt);
								// Prevent outside click handler from firing immediately
								e.stopPropagation();
							}}
						>
							{/* Category badge */}
							{badge && (
								<span className="absolute right-1.5 top-1.5 sm:right-0.5 sm:top-0.5 z-10">
									<badge.icon
										className="h-5 w-5 sm:h-4 sm:w-4"
										style={{ color: "var(--color-accent-dark)" }}
									/>
								</span>
							)}

							{item.link ? (
								<a
									href={item.link}
									target="_blank"
									rel="noopener noreferrer"
									onClick={(e) => {
										// On touch, open the mobile tooltip instead of navigating
										if (lastPointerType === "touch") {
											e.preventDefault();
											setSelectedIdx((prev) => (prev === idx ? null : idx));
										}
									}}
									className="inline-flex items-center justify-center text-[var(--c-text)] group-hover:text-accent transition-colors"
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
									className="inline-flex items-center justify-center text-[var(--c-text)] group-hover:text-accent transition-colors"
								>
									<item.icon className="w-10 h-10 sm:w-9 sm:h-9 md:w-10 md:h-10" />
									<span className="sr-only">{item.name}</span>
								</button>
							)}

							{/* Cursor-following tooltip (page overlay) */}
							{lastPointerType !== "touch" &&
								hoverIdx === idx &&
								typeof window !== "undefined" &&
								typeof document !== "undefined" &&
								createPortal(
									<div
										className="pointer-events-none fixed z-[9999]"
										style={{ left: mouse.x + 12, top: mouse.y + 12 }}
									>
										<div className="w-60 rounded-xl bg-global-bg/70 p-4 text-xs text-global-text shadow-[0_10px_30px_-15px_rgba(0,0,0,0.55)] backdrop-blur-lg ring-1 ring-white/10">
											<div className="flex items-center gap-2 mb-2">
												<item.icon className="h-4 w-4" />
												<p className="text-xs font-semibold text-accent-2">{item.name}</p>
												<div className="ml-auto flex items-center gap-2">
													{badge && (
														<span
															className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]"
															style={{
																borderColor: "var(--color-accent-dark)",
																backgroundColor:
																	"color-mix(in oklab, var(--color-accent-dark) 12%, transparent)",
																color: "var(--color-accent-dark)",
															}}
														>
															<badge.icon className="h-3 w-3" /> {badge.title}
														</span>
													)}
													{item.link && (
														<FaExternalLinkAlt className="h-3 w-3 text-global-text/50" />
													)}
												</div>
											</div>
											{item.description && (
												<p className="text-[11px] text-global-text/70 leading-relaxed">
													{item.description}
												</p>
											)}
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
													{badge && (
														<span
															className="ml-auto inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px]"
															style={{
																borderColor: "var(--color-accent-dark)",
																backgroundColor:
																	"color-mix(in oklab, var(--color-accent-dark) 12%, transparent)",
																color: "var(--color-accent-dark)",
															}}
														>
															<badge.icon className="h-3.5 w-3.5" /> {badge.title}
														</span>
													)}
												</div>
												{item.description && (
													<p className="text-[13px] text-[var(--c-text-dimmed)] leading-relaxed">
														{item.description}
													</p>
												)}
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
