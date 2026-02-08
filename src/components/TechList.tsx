import type { TechnologyUsage } from "@/data/post";
import { getTechIconName } from "@/utils/techIcons";
import { Icon as IconifyIcon } from "@iconify/react";
import { useCallback, useEffect, useRef, useState } from "react";
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
	const PANEL_STATE_KEY = "tech:panelState:v1";
	const DEFAULT_PANEL_SIZE = { width: 520, height: 560 };
	const DEFAULT_PANEL_POS = { x: 24, y: 96 };

	const flat: FlatTech[] = categories.flatMap((c) =>
		c.items.map((i) => ({
			...i,
			icon: i.icon ?? getTechIconName(i.name, i.aliases),
			__cat: c.title,
		})),
	);

	// Hover tooltip state (simple, non-interactive)
	const [hoverIdx, setHoverIdx] = useState<number | null>(null);
	const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [supportsHover, setSupportsHover] = useState(false);
	const [lastPointerType, setLastPointerType] = useState<"mouse" | "touch" | "pen" | "unknown">(
		"unknown",
	);

	// Click modal state (accumulates tabs until closed)
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [openTabs, setOpenTabs] = useState<number[]>([]);
	const [activeTab, setActiveTab] = useState<number | null>(null);
	const modalRef = useRef<HTMLDialogElement>(null);
	const [panelPos, setPanelPos] = useState<{ x: number; y: number }>(DEFAULT_PANEL_POS);
	const [panelSize, setPanelSize] = useState<{ width: number; height: number }>(DEFAULT_PANEL_SIZE);
	const panelPosRef = useRef(panelPos);
	const panelSizeRef = useRef(panelSize);
	const persistTimerRef = useRef<number | null>(null);
	const dragRef = useRef<{
		active: boolean;
		pointerId: number;
		startX: number;
		startY: number;
		originX: number;
		originY: number;
	} | null>(null);

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

	useEffect(() => {
		if (typeof window === "undefined") return;
		const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
		const update = () => setSupportsHover(mq.matches);
		update();
		mq.addEventListener?.("change", update);
		return () => mq.removeEventListener?.("change", update);
	}, []);

	useEffect(() => {
		if (typeof document === "undefined") return;
		const handler = (e: PointerEvent) => {
			const pt = (e.pointerType as "mouse" | "touch" | "pen") ?? "unknown";
			setLastPointerType(pt);
			if (pt !== "mouse") setHoverIdx(null);
		};
		document.addEventListener("pointerdown", handler, { passive: true });
		return () => document.removeEventListener("pointerdown", handler);
	}, []);

	useEffect(() => {
		panelPosRef.current = panelPos;
	}, [panelPos]);

	useEffect(() => {
		panelSizeRef.current = panelSize;
	}, [panelSize]);

	const clampToViewport = useCallback((x: number, y: number, width?: number, height?: number) => {
		if (typeof window === "undefined") return { x, y };
		const margin = 16;
		const w = width ?? panelSizeRef.current.width ?? DEFAULT_PANEL_SIZE.width;
		const h = height ?? panelSizeRef.current.height ?? DEFAULT_PANEL_SIZE.height;
		const maxX = Math.max(margin, window.innerWidth - w - margin);
		const maxY = Math.max(margin, window.innerHeight - h - margin);
		return {
			x: Math.min(Math.max(margin, x), maxX),
			y: Math.min(Math.max(margin, y), maxY),
		};
	}, []);

	const persistPanelState = useCallback(
		(state?: { x: number; y: number; width: number; height: number }) => {
			if (typeof window === "undefined") return;
			try {
				const s =
					state ??
					(() => {
						const rect = modalRef.current?.getBoundingClientRect();
						const pos = panelPosRef.current;
						const size = panelSizeRef.current;
						return {
							x: pos.x,
							y: pos.y,
							width: rect?.width ?? size.width,
							height: rect?.height ?? size.height,
						};
					})();
				window.localStorage.setItem(PANEL_STATE_KEY, JSON.stringify(s));
			} catch {
				// ignore
			}
		},
		[],
	);

	const persistPanelStateDebounced = useCallback(() => {
		if (persistTimerRef.current !== null) window.clearTimeout(persistTimerRef.current);
		persistTimerRef.current = window.setTimeout(() => {
			persistTimerRef.current = null;
			persistPanelState();
		}, 250);
	}, [persistPanelState]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			const raw = window.localStorage.getItem(PANEL_STATE_KEY);
			if (!raw) return;
			const parsed = JSON.parse(raw) as unknown;
			if (!parsed || typeof parsed !== "object") return;
			const s = parsed as { x?: unknown; y?: unknown; width?: unknown; height?: unknown };
			const x = Number(s.x);
			const y = Number(s.y);
			const width = Number(s.width);
			const height = Number(s.height);
			if (!Number.isFinite(x) || !Number.isFinite(y)) return;
			if (!Number.isFinite(width) || !Number.isFinite(height)) return;
			if (width < 320 || height < 320) return;
			setPanelSize({ width, height });
			setPanelPos(() => clampToViewport(x, y, width, height));
		} catch {
			// ignore
		}
	}, [clampToViewport]);

	const beginDrag = useCallback((e: React.PointerEvent) => {
		if (e.button !== 0) return;
		const target = e.target as HTMLElement | null;
		// Don't start a drag when the user is trying to click a tab/button/link.
		if (target?.closest?.("button, a, input, textarea, select, option")) return;
		const el = modalRef.current;
		if (!el) return;
		try {
			el.setPointerCapture(e.pointerId);
		} catch {
			// ignore
		}
		dragRef.current = {
			active: true,
			pointerId: e.pointerId,
			startX: e.clientX,
			startY: e.clientY,
			originX: panelPosRef.current.x,
			originY: panelPosRef.current.y,
		};
	}, []);

	const onDragMove = useCallback(
		(e: React.PointerEvent) => {
			const d = dragRef.current;
			if (!d?.active) return;
			if (e.pointerId !== d.pointerId) return;
			const dx = e.clientX - d.startX;
			const dy = e.clientY - d.startY;
			setPanelPos(() => {
				const next = clampToViewport(d.originX + dx, d.originY + dy);
				return next;
			});
			persistPanelStateDebounced();
		},
		[clampToViewport, persistPanelStateDebounced],
	);

	const endDrag = useCallback(() => {
		const d = dragRef.current;
		if (!d) return;
		dragRef.current = null;
		persistPanelState();
	}, [persistPanelState]);

	const closeModal = useCallback(() => {
		persistPanelState();
		setIsModalOpen(false);
		setOpenTabs([]);
		setActiveTab(null);
	}, [persistPanelState]);

	const closeTab = useCallback((idx: number) => {
		setOpenTabs((prev) => {
			const next = prev.filter((t) => t !== idx);
			// If we closed the last tab, close the whole panel.
			if (next.length === 0) {
				setIsModalOpen(false);
				setActiveTab(null);
				return [];
			}
			// If we closed the active tab, move to a neighbor.
			setActiveTab((current) => {
				if (current !== idx) return current;
				const oldIndex = prev.indexOf(idx);
				const fallbackIndex = Math.max(0, oldIndex - 1);
				return next[fallbackIndex] ?? next[0] ?? null;
			});
			return next;
		});
	}, []);

	const getTooltipPosition = useCallback(() => {
		if (typeof window === "undefined") return { left: 0, top: 0 };
		const margin = 10;
		const tooltipWidth = 210;
		const tooltipHeight = 52;
		let left = mouse.x - tooltipWidth - 12;
		let top = mouse.y + 12;
		left = Math.min(Math.max(margin, left), window.innerWidth - tooltipWidth - margin);
		top = Math.min(Math.max(margin, top), window.innerHeight - tooltipHeight - margin);
		return { left, top };
	}, [mouse.x, mouse.y]);

	const openModalForTech = useCallback((idx: number) => {
		setIsModalOpen(true);
		setActiveTab(idx);
		setOpenTabs((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
	}, []);

	return (
		<div>
			<div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-10 gap-0.25 sm:gap-0 md:gap-0.25">
				{flat.map((item, idx) => {
					const usage = getUsageForItem(item);
					const projects = usage?.projects ?? [];
					const hasProjects = projects.length > 0;
					return (
						<div
							key={`${item.name}-${idx}`}
							className="lh-techlist-item group relative flex items-center justify-center p-1.5 md:p-1 bg-transparent"
							onMouseEnter={(e) => {
								setLastPointerType("mouse");
								setHoverIdx(idx);
								setMouse({ x: e.clientX, y: e.clientY });
							}}
							onMouseMove={(e) => {
								if (hoverIdx !== idx) return;
								setMouse({ x: e.clientX, y: e.clientY });
							}}
							onMouseLeave={() => {
								setHoverIdx(null);
							}}
							onPointerDown={(e) => {
								const pt = (e.pointerType as "mouse" | "touch" | "pen") ?? "unknown";
								setLastPointerType(pt);
							}}
						>
							<button
								type="button"
								onClick={() => openModalForTech(idx)}
								className={`inline-flex items-center justify-center transition-colors ${
									hasProjects ? "text-accent" : "text-[var(--c-text)] group-hover:text-accent"
								}`}
								aria-label={`Click to learn more about ${item.name}`}
							>
								<IconifyIcon icon={item.icon} className="w-10 h-10 sm:w-9 sm:h-9 md:w-10 md:h-10" />
								<span className="sr-only">{item.name}</span>
							</button>
						</div>
					);
				})}
			</div>

			{/* Hover tooltip (like header tooltips) */}
			{hoverIdx !== null &&
				supportsHover &&
				lastPointerType === "mouse" &&
				!isModalOpen &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						className="pointer-events-none fixed z-[9999] max-w-[85vw] rounded-xl bg-global-bg/70 px-4 py-3 text-xs text-global-text shadow-[0_10px_30px_-15px_rgba(0,0,0,0.55)] backdrop-blur-lg ring-1 ring-white/10"
						style={getTooltipPosition()}
					>
						<p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-global-text/60">
							Click to learn more
						</p>
					</div>,
					document.body,
				)}

			{/* Tabbed panel (comments-style: non-blocking, close with X) */}
			{isModalOpen &&
				activeTab !== null &&
				typeof document !== "undefined" &&
				createPortal(
					<div className="fixed inset-0 z-50 pointer-events-none">
						<dialog
							open
							ref={modalRef}
							aria-label="Tech details"
							className="pointer-events-auto absolute flex max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] min-w-[320px] min-h-[320px] flex-col overflow-hidden rounded-2xl bg-global-bg/95 backdrop-blur-sm ring-1 ring-global-text/10 shadow-[0_6px_16px_-10px_rgba(0,0,0,0.35)] p-0"
							onPointerMove={onDragMove}
							onPointerUp={() => {
								// Covers resize-end in browsers where ResizeObserver doesn't fire reliably for CSS resize.
								try {
									window.requestAnimationFrame(() => {
										const el = modalRef.current;
										if (!el) return;
										const rect = el.getBoundingClientRect();
										const width = Math.max(320, rect.width);
										const height = Math.max(320, rect.height);
										setPanelSize({ width, height });
										setPanelPos((pos) => clampToViewport(pos.x, pos.y, width, height));
										persistPanelStateDebounced();
									});
								} catch {
									// ignore
								}
								endDrag();
							}}
							style={{
								left: panelPos.x,
								top: panelPos.y,
								width: panelSize.width,
								height: panelSize.height,
								resize: "both",
							}}
						>
							{/* Tab strip + close (browser-ish) */}
							<div
								onPointerDown={beginDrag}
								onPointerUp={endDrag}
								className="flex items-center justify-between gap-3 border-b border-global-text/10 px-4 py-3 select-none cursor-move"
								style={{ touchAction: "none" }}
							>
								<div className="flex min-w-0 flex-1 gap-1 overflow-x-auto overflow-y-visible px-1 py-1">
									{openTabs.map((tabIdx) => {
										const tabItem = flat[tabIdx];
										if (!tabItem) return null;
										const isActive = tabIdx === activeTab;
										return (
											<div
												key={`${tabItem.name}-${tabIdx}`}
												role="tab"
												aria-selected={isActive}
												tabIndex={0}
												onPointerDown={(e) => e.stopPropagation()}
												onClick={() => setActiveTab(tabIdx)}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														setActiveTab(tabIdx);
													}
												}}
												className={`group inline-flex min-w-[120px] max-w-[220px] items-center gap-2 overflow-hidden rounded-xl ring-1 px-3 py-2 text-xs transition-colors ${
													isActive
														? "bg-global-bg/80 ring-2 ring-accent/40 text-global-text"
														: "bg-global-bg/55 ring-global-text/20 text-global-text/70 hover:bg-global-bg/70 hover:ring-global-text/30 hover:text-accent"
												}`}
												title={tabItem.name}
											>
												<IconifyIcon icon={tabItem.icon} className="h-4 w-4 shrink-0" />
												<span className="min-w-0 flex-1 truncate text-left">{tabItem.name}</span>
												<button
													type="button"
													aria-label={`Close ${tabItem.name}`}
													onPointerDown={(e) => e.stopPropagation()}
													onClick={(e) => {
														e.stopPropagation();
														closeTab(tabIdx);
													}}
													className="ml-1 inline-flex rounded-md p-1 text-global-text/50 opacity-80 transition-colors hover:bg-accent/10 hover:text-accent group-hover:opacity-100"
													title="Close tab"
												>
													<svg
														className="h-3.5 w-3.5"
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
											</div>
										);
									})}
								</div>
								<button
									type="button"
									onClick={closeModal}
									onPointerDown={(e) => e.stopPropagation()}
									className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1 text-global-text/70 hover:text-accent transition-colors"
									aria-label="Close tech panel"
									title="Close"
								>
									<IconifyIcon icon="mdi:close" className="h-4 w-4" />
								</button>
							</div>

							{(() => {
								const item = flat[activeTab];
								if (!item) return null;
								const usage = getUsageForItem(item);
								const projects = usage?.projects ?? [];
								const hasProjects = projects.length > 0;
								const categoryLabel = item.__cat;
								return (
									<div className="min-h-0 flex-1 overflow-auto p-4">
										<div className="flex items-center gap-2 mb-2">
											<IconifyIcon icon={item.icon} className="h-5 w-5" />
											<p className="text-sm font-semibold text-accent-2">{item.name}</p>
											<span className="text-[10px] text-global-text/40">· {categoryLabel}</span>
										</div>
										{item.description && (
											<p className="text-[12px] text-global-text/70 leading-relaxed">
												{item.description}
											</p>
										)}

										<div className="mt-4 border-t border-global-text/10 pt-4">
											<p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-global-text/60">
												Projects using this
											</p>
											{hasProjects ? (
												<div className="mt-2 max-h-64 overflow-y-auto divide-y divide-global-text/10 rounded-xl bg-global-bg/40 ring-1 ring-global-text/10">
													{projects.map((project) => (
														<a
															key={project.id}
															href={`/posts/${project.id}/`}
															className="group relative block overflow-hidden px-3 py-3 text-[11px] text-global-text/80 transition-colors hover:bg-global-bg/45 hover:text-global-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
															data-astro-prefetch
														>
															{project.coverImage?.src && (
																<span
																	className="pointer-events-none absolute inset-0 opacity-80 blur-3xl"
																	style={{
																		backgroundImage: `url(${project.coverImage.src})`,
																		backgroundSize: "cover",
																		backgroundPosition: "center",
																	}}
																/>
															)}
															<span className="pointer-events-none absolute inset-0 bg-global-bg/10" />
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
													I either haven't wrote about this project or I only use this in
													coursework.
												</p>
											)}
										</div>

										{item.link && (
											<div className="mt-4 text-[12px]">
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
								);
							})()}
						</dialog>
					</div>,
					document.body,
				)}
		</div>
	);
}
