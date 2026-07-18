type ToastType = "success" | "info" | "warning" | "error";

type CopyTipAnchor = HTMLElement | { x: number; y: number };

const COPY_TIP_VISIBLE_MS = 1200;
const COPY_TIP_EXIT_MS = 600;
const COPY_TIP_MARGIN = 8;

/**
 * Small anchored "Copied!" tip that pops up at the element/point that was
 * clicked — same tilted, card-less language as the footer now-playing readout.
 * Pass the clicked element, or a {x, y} viewport point (e.g. the mouse position).
 */
export function showCopyTip(message: string, anchor: CopyTipAnchor) {
	let x: number;
	let y: number;
	if (anchor instanceof HTMLElement) {
		const rect = anchor.getBoundingClientRect();
		x = rect.left + rect.width / 2;
		y = rect.top;
	} else {
		x = anchor.x;
		y = anchor.y;
	}

	const tip = document.createElement("div");
	tip.className = "copy-tip";
	tip.setAttribute("role", "status");
	tip.textContent = message;

	// Random slight tilt (±2–5deg) so repeated tips feel hand-placed.
	const tilt = (Math.random() * 3 + 2) * (Math.random() < 0.5 ? -1 : 1);
	tip.style.setProperty("--tip-tilt", `${tilt.toFixed(1)}deg`);

	document.body.appendChild(tip);

	// Measure after mount, then clamp inside the viewport. If the anchor sits too
	// close to the top edge, flip the tip below the point instead.
	const halfWidth = tip.offsetWidth / 2;
	const clampedX = Math.min(
		Math.max(x, halfWidth + COPY_TIP_MARGIN),
		window.innerWidth - halfWidth - COPY_TIP_MARGIN,
	);
	const flipBelow = y - tip.offsetHeight - COPY_TIP_MARGIN * 2 < 0;
	if (flipBelow) tip.classList.add("is-below");
	tip.style.left = `${clampedX}px`;
	tip.style.top = `${flipBelow ? y + COPY_TIP_MARGIN * 2 : y - COPY_TIP_MARGIN}px`;

	// The offsetWidth read above already flushed the hidden state, so adding the
	// class now transitions in (no rAF — it can be throttled in occluded tabs).
	tip.classList.add("show");

	window.setTimeout(() => {
		tip.classList.remove("show");
		window.setTimeout(() => tip.remove(), COPY_TIP_EXIT_MS);
	}, COPY_TIP_VISIBLE_MS);
}

let hideTimeoutId: number | undefined;

function getOrCreateToastHost() {
	let toast = document.querySelector(".lawson-toast-host") as HTMLDivElement | null;
	if (!toast) {
		toast = document.createElement("div");
		toast.className = "lawson-toast-host copy-toast lawson-toast";
		toast.setAttribute("role", "status");
		toast.setAttribute("aria-live", "polite");
		toast.setAttribute("aria-atomic", "true");
		document.body.appendChild(toast);
	}
	return toast;
}

function setToastType(toast: HTMLDivElement, type: ToastType) {
	toast.dataset.toastType = type;
}

function show(toast: HTMLDivElement, duration: number) {
	if (hideTimeoutId) window.clearTimeout(hideTimeoutId);
	toast.classList.add("show");
	hideTimeoutId = window.setTimeout(() => {
		toast.classList.remove("show");
	}, duration);
}

function safeLinkHref(input: string) {
	try {
		const url = new URL(input, window.location.origin);
		if (url.protocol !== "http:" && url.protocol !== "https:") return "#";
		return url.href;
	} catch {
		return "#";
	}
}

// Simple toast utility for notifications
export function showToast(message: string, type: ToastType = "info", duration = 3000) {
	const toast = getOrCreateToastHost();
	setToastType(toast, type);
	toast.replaceChildren();
	toast.textContent = message;
	show(toast, duration);
}

// Toast with link functionality
export function showToastWithLink(
	message: string,
	linkText: string,
	linkUrl: string,
	type: ToastType = "info",
	duration = 5000,
) {
	const toast = getOrCreateToastHost();
	setToastType(toast, type);

	const content = document.createElement("div");
	content.className = "lawson-toast__content";

	const msg = document.createElement("div");
	msg.className = "lawson-toast__message";
	msg.textContent = message;

	const link = document.createElement("a");
	link.className = "lawson-toast__link";
	link.href = safeLinkHref(linkUrl);
	link.rel = "noopener noreferrer";
	link.textContent = `${linkText} →`;

	content.appendChild(msg);
	content.appendChild(link);

	toast.replaceChildren(content);
	show(toast, duration);
}
