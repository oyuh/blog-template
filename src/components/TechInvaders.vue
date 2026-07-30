<script setup lang="ts">
/**
 * Space Invaders played against the About page's tech collage: every icon in the
 * list becomes an invader and you shoot it down. Launched from the collage hint
 * line (see TechList.astro). The fleet icons, colors and post titles, is
 * cloned straight out of the rendered collage DOM, so there is nothing to pass in.
 *
 * The overlay deliberately starts *below* the site header, which stays visible
 * and swaps its Home icon for the exit control (see layout/Header.astro).
 */
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";

/* ---------- geometry, in px. Deliberately chunky: the fleet fills the page. ---------- */
/** Board tuning per form factor. Everything else scales off the measured field,
 *  so these are ceilings rather than fixed sizes. */
const DESKTOP = { icon: 44, cellH: 62, cellW: 76, cols: 8, pw: 42, ph: 32 };
const MOBILE = { icon: 30, cellH: 46, cellW: 50, cols: 6, pw: 32, ph: 26 };
/** Share of the field the fleet may occupy at the start, so short windows
 *  squeeze the rows instead of opening on top of the player. */
const FLEET_H_RATIO = 0.5;
const FEED_MAX = 14;
const LIVES = 3;
/** Touch play: the ship fires itself, so a thumb only has to steer. */
const AUTO_FIRE = 0.42;
/** Outer share of the field on each side that steers; the middle band fires. */
const MOVE_ZONE = 0.34;
/** How fast the fleet creeps down at the start of a level, in px/s. The drop per
 *  edge-bounce is derived from this so every screen width descends alike. */
const DESCENT_PER_SEC = 3.2;

type Cell = { c: number; r: number };
type Invader = {
	id: number;
	bx: number;
	by: number;
	x: number;
	y: number;
	name: string;
	posts: string[];
	svg: string;
	hp: number;
	blue: boolean;
	alive: boolean;
};
type Shot = { id: number; x: number; y: number; vy: number };
type Pop = { id: number; x: number; y: number; name: string; post: string; tilt: number };

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/* ---------------------------------- formations ---------------------------------- */
/** Lay n icons into rows of the given widths. Each row is centred on the widest,
 *  including a short final row, so every shape reads as intended. */
function rows(widths: number[], n: number) {
	const cols = Math.max(...widths);
	const cells: Cell[] = [];
	let i = 0;
	for (let r = 0; r < widths.length && i < n; r++) {
		const take = Math.min(widths[r] ?? 0, n - i);
		const start = (cols - take) / 2;
		for (let k = 0; k < take; k++, i++) cells.push({ c: start + k, r });
	}
	// Whatever the shape couldn't hold goes on full rows underneath, so an icon
	// is never left stranded at the origin.
	for (let r = widths.length; i < n; r++) {
		const take = Math.min(cols, n - i);
		const start = (cols - take) / 2;
		for (let k = 0; k < take; k++, i++) cells.push({ c: start + k, r });
	}
	return { cols, cells };
}

/** Row widths growing by `step` until they can hold n icons: 1,2,3… or 1,3,5… */
function ramp(n: number, step: number) {
	const widths: number[] = [];
	for (let width = 1, total = 0; total < n; width += step) {
		widths.push(width);
		total += width;
	}
	return widths;
}

const grid = (n: number) => Array(Math.ceil(n / blockCols)).fill(blockCols);

const FORMATIONS: { name: string; build: (n: number) => { cols: number; cells: Cell[] } }[] = [
	{ name: "block", build: (n) => rows(grid(n), n) },
	{ name: "pyramid", build: (n) => rows(ramp(n, 1), n) },
	{
		name: "stagger",
		build: (n) => {
			const laid = rows(grid(n), n);
			for (const cell of laid.cells) if (cell.r % 2) cell.c += 0.5;
			return { cols: laid.cols + 0.5, cells: laid.cells };
		},
	},
	{
		name: "diamond",
		build: (n) => {
			// Grow 1,3,5… and mirror it each time: `ramp` alone only sizes the top
			// half, which leaves the mirrored shape too small to hold every icon.
			const up: number[] = [];
			let widths: number[] = [];
			for (let w = 1; widths.reduce((a, b) => a + b, 0) < n; w += 2) {
				up.push(w);
				widths = [...up, ...up.slice(0, -1).reverse()];
			}
			return rows(widths, n);
		},
	},
	{ name: "arrow", build: (n) => rows([...ramp(n, 1)].reverse(), n) },
];

/* ------------------------------------ state ------------------------------------ */
const open = ref(false);
const over = ref(false);
const cleared = ref(false);
const reason = ref("");

const invaders = ref<Invader[]>([]);
const shots = ref<Shot[]>([]);
const bombs = ref<Shot[]>([]);
const pops = ref<Pop[]>([]);
const feed = ref<string[]>([]);

const level = ref(1);
const score = ref(0);
const lives = ref(LIVES);
const killed = ref(0);
const playerX = ref(0);
const playerTop = ref(0);
const announcement = ref("");
/** Drives both the board size and the control scheme. */
const isMobile = ref(false);
const playerW = ref(DESKTOP.pw);
const playerH = ref(DESKTOP.ph);

const rootEl = ref<HTMLElement | null>(null);
const fieldEl = ref<HTMLElement | null>(null);
const primaryBtn = ref<HTMLButtonElement | null>(null);

let fx = 0;
let fy = 0;
let dir = 1;
let drop = 22;
let icon = DESKTOP.icon;
let blockCols = DESKTOP.cols;
let autoFireTimer = 0;
/** Sideways room the fleet has, relative to a roomy desktop. Scales the march. */
let travelScale = 1;
let fieldW = 0;
let fieldH = 0;
let bombTimer = 0;
let raf = 0;
let prev = 0;
let running = false;
let uid = 0;
let restore: HTMLElement | null = null;
let scrollY = 0;
let launchBtn: HTMLElement | null = null;
let headerExit: HTMLElement | null = null;
const keys = { left: false, right: false };
/** One shot per press: held keys and held mouse buttons must not auto-fire. */
let fireHeld = false;

const formation = () => FORMATIONS[(level.value - 1) % FORMATIONS.length]!;
// NOTE: scoreText/nextLevel/onMove are referenced only from the template. Don't
// let an unused-vars autofix rename them to `_foo` — it can't see template usage
// and the render throws at runtime.
const scoreText = () => String(score.value).padStart(6, "0");
/** The mobile ticker, with every field padded to a fixed character count. The
 *  HUD is monospace, so a constant character count is a constant pixel width —
 *  which is what stops the scroll jumping whenever the score or a kill changes.
 *  Rendered with `white-space: pre` so the padding actually survives. */
const marqueeText = () =>
	[
		`LVL ${String(level.value).padStart(2, " ")}`,
		formation().name.toUpperCase().padEnd(7, " "),
		scoreText(),
		`${String(killed.value).padStart(2, " ")}/${invaders.value.length}`,
		(feed.value[0] ?? "—").padEnd(18, " ").slice(0, 18),
	].join("  ·  ");
const playerY = () => fieldH - playerH.value - 12;
const announce = (msg: string) => {
	announcement.value = msg;
};

/* ------------------------------------ setup ------------------------------------ */
/** The header stays visible above the game, so the overlay starts under it. */
function measure() {
	const header = document.getElementById("site-header");
	if (rootEl.value) {
		rootEl.value.style.top = `${Math.max(0, header?.getBoundingClientRect().bottom ?? 0)}px`;
	}
	fieldW = fieldEl.value?.clientWidth ?? 0;
	fieldH = fieldEl.value?.clientHeight ?? 0;
}

/** Everything about the fleet icon, colour, post titles comes from the
 *  already-rendered collage, so the tech list is never duplicated here. */
function readCollage() {
	return [...document.querySelectorAll<HTMLElement>("[data-tech-collage] .tech-collage__item")].map(
		(src) => {
			let posts: string[] = [];
			try {
				posts = JSON.parse(src.dataset.techPosts ?? "[]");
			} catch {
				posts = [];
			}
			const svg = src.querySelector("svg")?.cloneNode(true) as SVGElement | undefined;
			svg?.removeAttribute("class");
			return {
				name: src.getAttribute("aria-label") ?? "",
				blue: src.classList.contains("is-project"),
				svg: svg?.outerHTML ?? "",
				posts,
			};
		},
	);
}

/** Build the fleet for the current level. Score, lives and the kill feed carry
 *  over between levels; `reset` starts a fresh run. */
function startLevel(reset = false) {
	const source = readCollage();
	if (!source.length) return false;

	if (reset) {
		level.value = 1;
		score.value = 0;
		lives.value = LIVES;
		feed.value = [];
	}
	killed.value = 0;
	dir = 1;
	bombTimer = 1.2;
	shots.value = [];
	bombs.value = [];
	pops.value = [];
	over.value = false;
	cleared.value = false;
	autoFireTimer = 0;
	// Pick the board for the current form factor before anything is measured.
	const m = isMobile.value ? MOBILE : DESKTOP;
	blockCols = m.cols;
	playerW.value = m.pw;
	playerH.value = m.ph;
	measure();

	const { cols, cells } = formation().build(source.length);
	const gutter = isMobile.value ? 12 : 32;
	const cellW = Math.min(m.cellW, (fieldW - gutter) / cols);
	const rowCount = Math.max(...cells.map((c) => c.r)) + 1;
	const cellH = Math.min(m.cellH, (fieldH * FLEET_H_RATIO) / rowCount);
	// How far the fleet can slide before it hits an edge. A phone gives it very
	// little room, so at a fixed speed it ping-pongs — and therefore drops — many
	// times a second, which is what made narrow screens brutal.
	//
	// So: scale the sideways speed by the room available (capped at 1, so a wide
	// desktop never speeds *up*), then derive the drop from a target descent rate
	// rather than from the cell size. Descent then works out the same on a 375px
	// phone as on a 1440px desktop instead of being ~4x harsher.
	const travel = Math.max(30, fieldW - cols * cellW);
	travelScale = clamp(travel / 380, 0.2, 1);
	const openingSpeed = Math.max(18, (55 + (level.value - 1) * 20) * travelScale);
	drop = clamp((DESCENT_PER_SEC * travel) / openingSpeed, 3, cellH * 0.6);
	// Shrink the invaders alongside the rows so they never overlap.
	icon = clamp(cellH - 10, 14, Math.min(m.icon, cellW - 6));

	fx = Math.max(0, (fieldW - cols * cellW) / 2);
	fy = 10;
	invaders.value = source.map((tech, i) => {
		const cell = cells[i] ?? { c: 0, r: 0 };
		const bx = cell.c * cellW + (cellW - icon) / 2;
		const by = cell.r * cellH;
		return {
			id: uid++,
			bx,
			by,
			x: fx + bx,
			y: fy + by,
			name: tech.name,
			posts: tech.posts,
			svg: tech.svg,
			// Blue (has posts) invaders take two hits; the first knocks them white.
			hp: tech.blue ? 2 : 1,
			blue: tech.blue,
			alive: true,
		};
	});

	playerX.value = (fieldW - playerW.value) / 2;
	playerTop.value = playerY();
	running = true;
	prev = performance.now();
	cancelAnimationFrame(raf);
	raf = requestAnimationFrame(loop);
	announce(`Level ${level.value}, ${formation().name}. Arrow keys to move, space to fire.`);
	return true;
}

/* ------------------------------------- loop ------------------------------------- */
/** Live fleet extents, so the march reverses on the outermost survivors. */
function bounds() {
	let left = Infinity;
	let right = -Infinity;
	let bottom = -Infinity;
	for (const inv of invaders.value) {
		if (!inv.alive) continue;
		if (inv.bx < left) left = inv.bx;
		if (inv.bx + icon > right) right = inv.bx + icon;
		if (inv.by + icon > bottom) bottom = inv.by + icon;
	}
	return { left, right, bottom };
}

function shoot() {
	if (!running) return;
	shots.value.push({
		id: uid++,
		x: playerX.value + playerW.value / 2 - 1.5,
		y: playerY() - 16,
		vy: -820,
	});
}

/** Keyboard/mouse: one shot per press, so holding can't autofire. */
function fire() {
	if (fireHeld) return;
	fireHeld = true;
	shoot();
}

function popKill(inv: Invader) {
	const pop: Pop = {
		id: uid++,
		x: clamp(inv.x + icon / 2 - 110, 4, Math.max(4, fieldW - 224)),
		y: inv.y,
		name: inv.name,
		post: inv.posts[Math.floor(Math.random() * inv.posts.length)] ?? "",
		// Fresh tilt per kill, so no two markers sit at the same angle.
		tilt: (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 9),
	};
	pops.value.push(pop);
	setTimeout(() => {
		pops.value = pops.value.filter((p) => p.id !== pop.id);
	}, 900);
}

function hit(inv: Invader) {
	inv.hp -= 1;
	if (inv.hp > 0) {
		inv.blue = false;
		score.value += 5;
		return;
	}
	inv.alive = false;
	killed.value += 1;
	score.value += inv.posts.length ? 20 : 10;
	feed.value = [inv.name, ...feed.value].slice(0, FEED_MAX);
	announce(`${inv.name} destroyed. Score ${score.value}.`);
	popKill(inv);
	if (killed.value === invaders.value.length) end(true);
}

function hitPlayer() {
	lives.value -= 1;
	// The bomb that landed is already gone; the rest keep falling.
	if (lives.value <= 0) end(false, "a bomb got you");
	else announce(`Hit. ${lives.value} lives left.`);
}

function end(won: boolean, why = "") {
	running = false;
	cancelAnimationFrame(raf);
	over.value = true;
	cleared.value = won;
	reason.value = won ? `${formation().name} formation wiped out` : why;
	announce(
		won
			? `Level ${level.value} cleared. Score ${score.value}.`
			: `Game over, ${why}. Score ${score.value}.`,
	);
	nextTick(() => primaryBtn.value?.focus());
}

function nextLevel() {
	level.value += 1;
	startLevel();
}

function step(dt: number) {
	const progress = killed.value / Math.max(1, invaders.value.length);
	const lvl = level.value - 1;

	const speed = isMobile.value ? 420 : 520;
	if (keys.left) playerX.value -= speed * dt;
	if (keys.right) playerX.value += speed * dt;
	playerX.value = clamp(playerX.value, 0, fieldW - playerW.value);

	// Touch play has no fire button: the ship keeps shooting on its own.
	if (isMobile.value) {
		autoFireTimer -= dt;
		if (autoFireTimer <= 0) {
			autoFireTimer = AUTO_FIRE;
			shoot();
		}
	}

	// Fleet march: slide until an outermost survivor touches an edge, then reverse
	// and drop. Every kill winds it up, and every level starts it wound tighter.
	const march = 55 + lvl * 20 + progress * progress * 520 + progress * 120;
	fx += dir * Math.max(18, march * travelScale) * dt;
	const b = bounds();
	if (fx + b.right > fieldW) {
		fx = fieldW - b.right;
		dir = -1;
		fy += drop;
	} else if (fx + b.left < 0) {
		fx = -b.left;
		dir = 1;
		fy += drop;
	}
	for (const inv of invaders.value) {
		if (!inv.alive) continue;
		inv.x = fx + inv.bx;
		inv.y = fy + inv.by;
	}
	if (fy + b.bottom >= playerY()) {
		end(false, "they reached the bottom");
		return;
	}

	bombTimer -= dt;
	if (bombTimer <= 0) {
		bombTimer = Math.max(0.22, 1.05 - lvl * 0.09 - progress * 0.85);
		const alive = invaders.value.filter((inv) => inv.alive);
		const from = alive[Math.floor(Math.random() * alive.length)];
		if (from) {
			bombs.value.push({
				id: uid++,
				x: from.x + icon / 2,
				y: from.y + icon,
				vy: 240 + lvl * 14 + progress * 160,
			});
		}
	}

	for (let i = shots.value.length - 1; i >= 0; i--) {
		const s = shots.value[i]!;
		s.y += s.vy * dt;
		if (s.y < -20) {
			shots.value.splice(i, 1);
			continue;
		}
		const target = invaders.value.find(
			(inv) =>
				inv.alive && s.x >= inv.x && s.x <= inv.x + icon && s.y >= inv.y && s.y <= inv.y + icon,
		);
		if (target) {
			shots.value.splice(i, 1);
			hit(target);
		}
	}

	for (let i = bombs.value.length - 1; i >= 0; i--) {
		const s = bombs.value[i]!;
		s.y += s.vy * dt;
		if (s.y > fieldH) {
			bombs.value.splice(i, 1);
			continue;
		}
		if (
			s.x >= playerX.value &&
			s.x <= playerX.value + playerW.value &&
			s.y >= playerY() &&
			s.y <= playerY() + playerH.value
		) {
			bombs.value.splice(i, 1);
			hitPlayer();
		}
	}
}

function loop(now: number) {
	if (!running) return;
	const dt = Math.min(0.05, (now - prev) / 1000);
	prev = now;
	step(dt);
	if (running) raf = requestAnimationFrame(loop);
}

/* ------------------------------------ input ------------------------------------ */
function onKeyDown(e: KeyboardEvent) {
	if (e.key === "Escape") return close();
	if (e.key === "Tab") {
		// Keep tabbing inside the game including the exit up in the header.
		const focusable = [
			...(headerExit ? [headerExit] : []),
			...(rootEl.value?.querySelectorAll<HTMLElement>("button") ?? []),
		].filter((el) => el.offsetParent !== null);
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (!first || !last) return;
		const cur = document.activeElement;
		if (e.shiftKey && (cur === first || cur === rootEl.value)) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && cur === last) {
			e.preventDefault();
			first.focus();
		}
		return;
	}
	// Between levels the arrows drive the menu instead of the ship.
	if (over.value) {
		if (e.key.startsWith("Arrow")) {
			e.preventDefault();
			moveMenu(e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1);
		} else if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
			// Activate explicitly (and suppress the native click, so it only fires
			// once) - space isn't a button key, and this keeps the menu behaving the
			// same however the selection got there.
			e.preventDefault();
			const focused = (document.activeElement as HTMLElement | null)?.closest<HTMLButtonElement>(
				".ti__panel-actions button",
			);
			(focused ?? primaryBtn.value)?.click();
		}
		return;
	}
	if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
	else if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
	else if (e.key === " " || e.key === "Spacebar") fire();
	else return;
	e.preventDefault();
}

/** Walk focus around the end-screen buttons; real focus, so Enter still works. */
function moveMenu(delta: number) {
	const btns = [
		...(rootEl.value?.querySelectorAll<HTMLButtonElement>(".ti__panel-actions button") ?? []),
	];
	if (!btns.length) return;
	const i = btns.indexOf(document.activeElement);
	btns[(i + delta + btns.length) % btns.length]?.focus();
}

function onKeyUp(e: KeyboardEvent) {
	if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
	else if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
	else if (e.key === " " || e.key === "Spacebar") fireHeld = false;
}

// Mouse is an alternative to the keyboard, not a replacement for it: only take
// aim from a cursor that actually moved, so a resting pointer over the field
// can't yank the ship away from someone playing on the keyboard.
let mouseX = Number.NaN;
let mouseY = Number.NaN;
function onMove(e: MouseEvent) {
	if (isMobile.value) return;
	if (!running || (e.clientX === mouseX && e.clientY === mouseY)) return;
	mouseX = e.clientX;
	mouseY = e.clientY;
	const left = fieldEl.value?.getBoundingClientRect().left ?? 0;
	playerX.value = clamp(e.clientX - left - playerW.value / 2, 0, fieldW - playerW.value);
}

/* ---- touch: hold a side to steer, tap the middle for an extra shot ---- */
/** Which third of the field a touch is in. */
function zoneOf(clientX: number) {
	const box = fieldEl.value?.getBoundingClientRect();
	if (!box) return "fire";
	const frac = (clientX - box.left) / box.width;
	if (frac < MOVE_ZONE) return "left";
	if (frac > 1 - MOVE_ZONE) return "right";
	return "fire";
}

function applyTouches(e: TouchEvent) {
	keys.left = false;
	keys.right = false;
	for (const t of e.touches) {
		const z = zoneOf(t.clientX);
		if (z === "left") keys.left = true;
		else if (z === "right") keys.right = true;
	}
}

function onTouchStart(e: TouchEvent) {
	// The field owns the gesture: no scrolling, no double-tap zoom mid-game.
	e.preventDefault();
	for (const t of e.changedTouches) if (zoneOf(t.clientX) === "fire") shoot();
	applyTouches(e);
}

function onTouchMove(e: TouchEvent) {
	e.preventDefault();
	applyTouches(e);
}

function onTouchEnd(e: TouchEvent) {
	applyTouches(e);
}

function onResize() {
	measure();
	playerX.value = clamp(playerX.value, 0, fieldW - playerW.value);
	playerTop.value = playerY();
}

/* --------------------------------- open / close --------------------------------- */
async function openGame() {
	if (open.value) return;
	restore = document.activeElement as HTMLElement | null;
	scrollY = window.scrollY;
	// The header has to be on screen: it holds the exit control.
	window.scrollTo(0, 0);
	open.value = true;
	document.documentElement.classList.add("ti-playing");
	document.documentElement.style.overflow = "hidden";
	if (headerExit) headerExit.hidden = false;
	window.addEventListener("keydown", onKeyDown);
	window.addEventListener("keyup", onKeyUp);
	window.addEventListener("resize", onResize);
	window.addEventListener("mouseup", releaseFire);
	await nextTick();
	rootEl.value?.focus();
	if (!startLevel(true)) close();
}

function close() {
	running = false;
	cancelAnimationFrame(raf);
	open.value = false;
	document.documentElement.classList.remove("ti-playing");
	document.documentElement.style.overflow = "";
	if (headerExit) headerExit.hidden = true;
	window.removeEventListener("keydown", onKeyDown);
	window.removeEventListener("keyup", onKeyUp);
	window.removeEventListener("resize", onResize);
	window.removeEventListener("mouseup", releaseFire);
	keys.left = keys.right = fireHeld = false;
	window.scrollTo(0, scrollY);
	restore?.focus();
}

function releaseFire() {
	fireHeld = false;
}

// Same breakpoint the launch button uses, so the board and the controls always
// agree about which version you're playing.
const mobileQuery = typeof matchMedia === "function" ? matchMedia("(max-width: 767px)") : null;
const syncIsMobile = () => {
	isMobile.value = mobileQuery?.matches ?? false;
};

onMounted(() => {
	syncIsMobile();
	mobileQuery?.addEventListener("change", syncIsMobile);
	launchBtn = document.querySelector<HTMLElement>("[data-ti-launch]");
	headerExit = document.querySelector<HTMLElement>("[data-ti-exit]");
	launchBtn?.addEventListener("click", openGame);
	headerExit?.addEventListener("click", close);
});

onBeforeUnmount(() => {
	mobileQuery?.removeEventListener("change", syncIsMobile);
	launchBtn?.removeEventListener("click", openGame);
	headerExit?.removeEventListener("click", close);
	if (open.value) close();
});
</script>

<template>
	<Transition name="ti">
		<div
			v-if="open"
			ref="rootEl"
			class="ti"
			role="dialog"
			aria-modal="true"
			aria-label="Tech Invaders"
			tabindex="-1"
		>
			<div
				ref="fieldEl"
				class="ti__field"
				:class="{ 'is-over': over }"
				@mousemove="onMove"
				@mousedown="fire"
				@touchstart.prevent="onTouchStart"
				@touchmove.prevent="onTouchMove"
				@touchend="onTouchEnd"
				@touchcancel="onTouchEnd"
			>
				<div
					v-for="inv in invaders"
					:key="inv.id"
					class="ti__invader"
					:class="{ 'is-project': inv.blue, 'is-hit': !inv.alive }"
					:style="{
						width: `${icon}px`,
						height: `${icon}px`,
						transform: `translate(${inv.x}px, ${inv.y}px)`,
					}"
					v-html="inv.svg"
				/>

				<div
					v-for="s in shots"
					:key="s.id"
					class="ti__shot"
					:style="{ transform: `translate(${s.x}px, ${s.y}px)` }"
				/>
				<div
					v-for="s in bombs"
					:key="s.id"
					class="ti__shot is-bomb"
					:style="{ transform: `translate(${s.x}px, ${s.y}px)` }"
				/>

				<span
					v-for="p in pops"
					:key="p.id"
					class="ti__pop"
					:style="{ transform: `translate(${p.x}px, ${p.y}px)`, rotate: `${p.tilt}deg` }"
				>
					<b>{{ p.name }}</b>
					<i v-if="p.post">{{ p.post }}</i>
				</span>

				<div class="ti__player" :style="{ transform: `translate(${playerX}px, ${playerTop}px)` }">
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1 22 22 12 16.5 2 22Z" /></svg>
				</div>

				<div v-if="over" class="ti__panel">
					<p class="ti__panel-reason">{{ reason }}</p>
					<h2 class="ti__panel-title">
						{{ cleared ? `Level ${level} cleared` : "Game over" }}
					</h2>
					<p class="ti__panel-score">
						<span class="ti__panel-num">{{ scoreText() }}</span>
						<span class="ti__panel-cap">score</span>
					</p>
					<p class="ti__panel-meta">
						<span
							><b>{{ killed }}/{{ invaders.length }}</b> destroyed</span
						>
						<span class="ti__sep">·</span>
						<span
							>level <b>{{ level }}</b></span
						>
					</p>
					<div class="ti__panel-actions">
						<button
							ref="primaryBtn"
							type="button"
							class="ti__btn"
							@click="cleared ? nextLevel() : startLevel(true)"
						>
							{{ cleared ? `start level ${level + 1}` : "play again" }}
						</button>
						<button type="button" class="ti__btn" @click="close">back to the list</button>
					</div>
				</div>
			</div>

			<!-- Touch build: lives on their own line, everything else scrolling
			     underneath, all centred. No control hints — the screen is the pad. -->
			<div v-if="isMobile" class="ti__hud ti__hud--mobile">
				<span class="ti__lives">
					<i v-for="n in LIVES" :key="n" class="ti__pip" :class="{ 'is-lost': n > lives }" />
				</span>
				<div class="ti__marquee">
					<div class="ti__marquee-track">
						<span v-for="copy in 2" :key="copy" class="ti__marquee-set" :aria-hidden="copy === 2">{{
							marqueeText()
						}}</span>
					</div>
				</div>
			</div>

			<div v-else class="ti__hud">
				<div class="ti__readouts">
					<div class="ti__row">
						<svg class="ti__icon" viewBox="0 0 24 24" aria-hidden="true">
							<path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" />
							<path d="m3 12 9 4.5L21 12" />
							<path d="m3 16.5 9 4.5 9-4.5" />
						</svg>
						<span class="ti__level">{{ level }}</span>
						<span class="ti__formation">{{ formation().name }}</span>
					</div>
					<div class="ti__row">
						<svg class="ti__icon is-accent" viewBox="0 0 24 24" aria-hidden="true">
							<path
								d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z"
							/>
						</svg>
						<span class="ti__score">{{ scoreText() }}</span>
					</div>
					<div class="ti__row">
						<svg class="ti__icon" viewBox="0 0 24 24" aria-hidden="true">
							<path
								d="M12 20s-7-4.5-7-9.5A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.5C19 15.5 12 20 12 20Z"
							/>
						</svg>
						<span class="ti__lives">
							<i v-for="n in LIVES" :key="n" class="ti__pip" :class="{ 'is-lost': n > lives }" />
						</span>
					</div>
					<div class="ti__row ti__row--feed">
						<svg class="ti__icon" viewBox="0 0 24 24" aria-hidden="true">
							<circle cx="12" cy="12" r="7" />
							<circle cx="12" cy="12" r="2.5" />
							<path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
						</svg>
						<span class="ti__feed">
							<span
								v-for="(name, i) in feed"
								:key="`${name}-${i}`"
								class="ti__feed-item"
								:style="{ opacity: Math.max(0.12, 0.72 - i * 0.07) }"
								>{{ name }}</span
							>
						</span>
					</div>
				</div>
				<p v-if="over" class="ti__keys">
					<span class="ti__kbd">←</span><span class="ti__kbd">→</span> select
					<span class="ti__sep">·</span>
					<span class="ti__kbd">Enter</span> choose
				</p>
				<p v-else class="ti__keys">
					<span class="ti__kbd">←</span><span class="ti__kbd">→</span> move
					<span class="ti__sep">·</span>
					<span class="ti__kbd">Space</span> fire
				</p>
			</div>

			<p class="sr-only" aria-live="polite">{{ announcement }}</p>
		</div>
	</Transition>
</template>

<style>
/* ---------------------------------------------------------------------------
   Tech Invaders (About page). Flat like the rest of the site the only
   indulgence is the faint vertical wash on the playfield. Unscoped on purpose:
   the invader icons are injected with v-html, which scoped styles never reach.
   --------------------------------------------------------------------------- */
.ti {
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	z-index: 200;
	display: flex;
	flex-direction: column;
	font-family: "Geist Mono Variable", ui-monospace, monospace;
	background: linear-gradient(
		180deg,
		var(--color-global-bg) 0%,
		color-mix(in srgb, var(--color-accent) 4%, var(--color-global-bg)) 62%,
		color-mix(in srgb, var(--color-accent) 9%, var(--color-global-bg)) 100%
	);
}

.ti:focus-visible {
	outline: none;
}

/* Entering the game: the overlay wipes down over the page, the same motion the
   theme toggle uses, then the board settles in just behind it. Leaving runs the
   wipe backwards, quicker. Deliberately clip-path and not scale/height those
   would change the field's box while `measure()` is reading it. */
.ti-enter-active {
	animation: ti-wipe 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}

.ti-leave-active {
	animation: ti-wipe 0.22s cubic-bezier(0.4, 0, 1, 1) reverse;
}

@keyframes ti-wipe {
	from {
		clip-path: inset(0 0 100% 0);
	}
	to {
		clip-path: inset(0 0 0 0);
	}
}

.ti-enter-active .ti__field,
.ti-enter-active .ti__hud {
	animation: ti-settle 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.08s backwards;
}

@keyframes ti-settle {
	from {
		opacity: 0;
		translate: 0 14px;
	}
	to {
		opacity: 1;
		translate: 0 0;
	}
}

@media (prefers-reduced-motion: reduce) {
	.ti-enter-active,
	.ti-leave-active,
	.ti-enter-active .ti__field,
	.ti-enter-active .ti__hud {
		animation: none;
	}
}

.ti__field {
	position: relative;
	flex: 1;
	width: 100%;
	overflow: hidden;
	/* The field owns touch gestures: no scroll or double-tap zoom mid-game. */
	touch-action: none;
}

.ti__invader,
.ti__player,
.ti__shot,
.ti__pop {
	position: absolute;
	top: 0;
	left: 0;
	will-change: transform;
}

.ti__invader {
	display: flex;
	align-items: center;
	justify-content: center;
	color: color-mix(in srgb, var(--color-global-text) 70%, transparent);
}

/* Blue = has posts = takes two hits. The first hit knocks it to plain white. */
.ti__invader.is-project {
	color: var(--color-accent);
}

.ti__invader svg {
	width: 100%;
	height: 100%;
}

.ti__invader.is-hit {
	opacity: 0;
	transition: opacity 0.12s linear;
}

.ti__player {
	width: 42px;
	height: 32px;
	color: var(--color-accent);
}

.ti__player svg {
	width: 100%;
	height: 100%;
	fill: currentColor;
}

.ti__shot {
	width: 3px;
	height: 16px;
	background: var(--color-accent);
}

.ti__shot.is-bomb {
	height: 11px;
	background: color-mix(in srgb, var(--color-global-text) 50%, transparent);
}

/* Kill marker: the tech, and a post it shows up in when there is one. */
.ti__pop {
	display: flex;
	flex-direction: column;
	gap: 0.1rem;
	width: 220px;
	font-size: 0.7rem;
	line-height: 1.25;
	text-align: center;
	animation: ti-pop 0.9s ease-out forwards;
}

.ti__pop b {
	font-weight: 700;
	white-space: nowrap;
	color: var(--color-accent);
}

.ti__pop i {
	font-style: normal;
	font-size: 0.64rem;
	color: color-mix(in srgb, var(--color-global-text) 58%, transparent);
}

@keyframes ti-pop {
	from {
		opacity: 1;
	}
	to {
		opacity: 0;
		translate: 0 -26px;
	}
}

@media (prefers-reduced-motion: reduce) {
	.ti__pop {
		animation: ti-fade 0.9s linear forwards;
	}
}

@keyframes ti-fade {
	to {
		opacity: 0;
	}
}

/* Level over: the fleet clears out so the result stands alone. */
.ti__field.is-over .ti__invader,
.ti__field.is-over .ti__shot,
.ti__field.is-over .ti__player {
	opacity: 0;
	transition: opacity 0.25s ease;
}

/* End screen: back on the site's own type, not the arcade mono. */
.ti__panel {
	position: absolute;
	inset: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	/* `safe` so a short window clips the bottom rather than the title. */
	justify-content: safe center;
	overflow-y: auto;
	padding: 1rem;
	text-align: center;
	font-family: "Plus Jakarta Sans Variable", system-ui, sans-serif;
}

.ti__panel-reason {
	margin: 0 0 0.3rem;
	font-size: 0.9rem;
	color: color-mix(in srgb, var(--color-global-text) 55%, transparent);
}

.ti__panel-title {
	margin: 0;
	font-size: clamp(1.4rem, 5.5vw, 3.1rem);
	font-weight: 700;
	line-height: 1.1;
	color: var(--color-accent-2);
}

/* Score is the payoff, so it gets the size; the rest is a quiet footnote. */
.ti__panel-score {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.1rem;
	margin: clamp(0.7rem, 3vh, 1.5rem) 0 0;
}

.ti__panel-num {
	font-family: "Geist Mono Variable", ui-monospace, monospace;
	font-size: clamp(1.9rem, 6vw, 3.6rem);
	font-weight: 700;
	font-variant-numeric: tabular-nums;
	letter-spacing: 0.04em;
	line-height: 1;
	color: var(--color-accent);
}

.ti__panel-cap {
	font-size: 0.78rem;
	color: color-mix(in srgb, var(--color-global-text) 50%, transparent);
}

.ti__panel-meta {
	margin: 0.7rem 0 0;
	font-size: 0.85rem;
	color: color-mix(in srgb, var(--color-global-text) 55%, transparent);
}

.ti__panel-meta b {
	font-weight: 700;
	font-variant-numeric: tabular-nums;
	color: var(--color-accent-2);
}

.ti__panel-actions {
	display: flex;
	gap: 0.6rem;
	margin-top: clamp(0.8rem, 3.5vh, 1.8rem);
}

.ti__btn {
	padding: 0.35rem 0.7rem;
	border: 1px solid color-mix(in srgb, var(--color-global-text) 22%, transparent);
	border-radius: 0.25rem;
	background: none;
	cursor: pointer;
	font: inherit;
	font-size: 0.72rem;
	letter-spacing: 0.06em;
	color: color-mix(in srgb, var(--color-global-text) 70%, transparent);
}

/* Plain `:focus` too arrow-key selection has to be visible even when the
   browser decides a programmatic focus isn't "focus-visible". */
.ti__btn:hover,
.ti__btn:focus,
.ti__btn:focus-visible {
	border-color: var(--color-accent);
	color: var(--color-accent);
	outline: none;
}

/* --- Bottom left: level, score, lives, kills one icon per row. --- */
.ti__hud {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 2rem;
	padding: 0.75rem 1.25rem 1rem;
	min-width: 0;
}

.ti__readouts {
	display: flex;
	flex-direction: column;
	gap: 0.3rem;
	flex: 1;
	min-width: 0;
}

.ti__row {
	display: flex;
	align-items: center;
	gap: 0.6rem;
	min-width: 0;
}

.ti__icon {
	flex: none;
	width: 1rem;
	height: 1rem;
	fill: none;
	stroke: currentColor;
	stroke-width: 1.6;
	stroke-linecap: round;
	stroke-linejoin: round;
	color: color-mix(in srgb, var(--color-global-text) 40%, transparent);
}

.ti__icon.is-accent {
	color: color-mix(in srgb, var(--color-accent) 70%, transparent);
}

.ti__level {
	font-size: 1rem;
	font-weight: 700;
	font-variant-numeric: tabular-nums;
	line-height: 1;
	color: var(--color-accent-2);
}

.ti__formation {
	font-size: 0.72rem;
	color: color-mix(in srgb, var(--color-global-text) 45%, transparent);
}

.ti__score {
	font-size: 1.5rem;
	font-weight: 700;
	font-variant-numeric: tabular-nums;
	letter-spacing: 0.08em;
	line-height: 1;
	color: var(--color-accent);
}

/* Every life is a slot; spent ones stay as hollow outlines. */
.ti__lives {
	display: inline-flex;
	gap: 0.3rem;
}

.ti__pip {
	width: 0.5rem;
	height: 0.5rem;
	border: 1px solid var(--color-accent);
	border-radius: 999px;
	background: var(--color-accent);
}

.ti__pip.is-lost {
	border-color: color-mix(in srgb, var(--color-global-text) 30%, transparent);
	background: none;
}

/* Newest kill first, so what gets clipped is always the oldest. */
.ti__feed {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	font-size: 0.78rem;
	color: var(--color-global-text);
}

.ti__feed:empty::after {
	content: "nothing yet";
	opacity: 0.28;
}

.ti__feed-item:not(:first-child)::before {
	content: "·";
	margin: 0 0.4rem;
}

.ti__keys {
	flex: none;
	margin: 0;
	font-size: 0.66rem;
	letter-spacing: 0.04em;
	color: color-mix(in srgb, var(--color-global-text) 40%, transparent);
}

.ti__kbd {
	padding: 0.02rem 0.3rem;
	margin-right: 0.15rem;
	border: 1px solid color-mix(in srgb, var(--color-global-text) 22%, transparent);
	border-radius: 0.25rem;
	font-size: 0.62rem;
}

.ti__sep {
	padding: 0 0.3rem;
	opacity: 0.5;
}

/* --- Touch build: centred, two lines, no control hints. --- */
.ti__hud--mobile {
	flex-direction: column;
	align-items: center;
	justify-content: flex-end;
	gap: 0.4rem;
	padding: 0.5rem 0 0.7rem;
	width: 100%;
}

.ti__hud--mobile .ti__lives {
	gap: 0.4rem;
}

.ti__hud--mobile .ti__pip {
	width: 0.6rem;
	height: 0.6rem;
}

.ti__marquee {
	width: 100%;
	overflow: hidden;
	/* Fade the ends so text slides in and out instead of popping. */
	mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
}

.ti__marquee-track {
	display: flex;
	width: max-content;
	animation: ti-marquee 22s linear infinite;
}

/* `pre` keeps the padding in `marqueeText()`, which is what makes every frame
   the same pixel width in this monospace HUD. Equal width means `-50%` always
   means the same distance, so the scroll never jumps when the score ticks.
   (`min-width: 100%` does not work here — a percentage resolves to auto inside
   a max-content track.) */
.ti__marquee-set {
	flex: none;
	padding-right: 2.5rem;
	font-size: 0.72rem;
	letter-spacing: 0.04em;
	white-space: pre;
	color: color-mix(in srgb, var(--color-global-text) 62%, transparent);
}

.ti__marquee-set b {
	font-weight: 700;
	font-variant-numeric: tabular-nums;
	color: var(--color-accent);
}

@keyframes ti-marquee {
	to {
		transform: translateX(-50%);
	}
}

@media (prefers-reduced-motion: reduce) {
	.ti__marquee-track {
		animation: none;
	}

	/* Static instead: show one copy, clipped, rather than a frozen half-scroll. */
	.ti__marquee-set:nth-child(2) {
		display: none;
	}
}
</style>
