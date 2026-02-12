type ToastType = "success" | "info" | "warning" | "error";

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
