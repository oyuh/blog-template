import baffle from "baffle";

type Cleanup = () => void;

const cleanups = new WeakMap<HTMLElement, Cleanup>();

function safeJsonParse(value: string | null): unknown {
	if (!value) return undefined;
	try {
		return JSON.parse(value);
	} catch {
		return undefined;
	}
}

function getTexts(el: HTMLElement): string[] {
	const parsed = safeJsonParse(el.getAttribute("data-splash-texts"));
	if (!Array.isArray(parsed)) return [];
	return parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function getIntervalMs(el: HTMLElement): number {
	const raw = el.getAttribute("data-splash-interval-ms");
	const num = raw ? Number(raw) : Number.NaN;
	return Number.isFinite(num) && num > 0 ? num : 5000;
}

function pickNext(texts: string[], current: string): string {
	if (texts.length === 0) return current;
	if (texts.length === 1) return texts[0] ?? current;

	let next = current;
	for (let i = 0; i < 8 && next === current; i++) {
		next = texts[Math.floor(Math.random() * texts.length)] ?? current;
	}
	return next;
}

function initOne(el: HTMLElement) {
	// If this element was already initialized, reset it.
	cleanups.get(el)?.();

	const texts = getTexts(el);
	const intervalMs = getIntervalMs(el);
	const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	let stop = false;
	let currentText = (el.textContent ?? "").trim();

	const b = prefersReducedMotion
		? undefined
		: baffle(el).set({
				characters: "<>/\\|{}[]-=+*#@!$%^&?~",
				speed: 35,
			});

	const setTextInstant = (next: string) => {
		currentText = next;
		el.textContent = next;
	};

	const animateTo = (next: string) => {
		if (stop) return;
		if (next === currentText) return;

		if (!b) {
			setTextInstant(next);
			return;
		}

		b.start()
			.text(() => next)
			.reveal(650);
		currentText = next;
	};

	// Kick off with a non-repeating first value
	const first = pickNext(texts, currentText);
	animateTo(first);

	const intervalId = window.setInterval(() => {
		animateTo(pickNext(texts, currentText));
	}, intervalMs);

	const cleanup = () => {
		stop = true;
		if (intervalId) window.clearInterval(intervalId);
		try {
			b?.stop();
		} catch {
			// ignore
		}
	};

	cleanups.set(el, cleanup);

	// Cleanup on view transitions / navigation
	window.addEventListener("astro:before-swap", cleanup, { once: true });
	window.addEventListener("pagehide", cleanup, { once: true });
}

export function initSplashTexts(root: ParentNode = document) {
	const els = root.querySelectorAll<HTMLElement>("[data-splash-text]");
	for (const el of els) initOne(el);
}

// Initial load
initSplashTexts(document);

// Handle Astro view transitions
document.addEventListener("astro:page-load", () => initSplashTexts(document));
