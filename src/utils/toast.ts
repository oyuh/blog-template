// Simple toast utility for notifications
export function showToast(
	message: string,
	type: "success" | "info" | "warning" | "error" = "info",
	duration = 3000,
) {
	void type;

	let toast = document.querySelector(".holiday-toast") as HTMLDivElement | null;
	if (!toast) {
		toast = document.createElement("div");
		toast.className = "holiday-toast copy-toast lawson-toast";
		document.body.appendChild(toast);
	}

	toast.textContent = message;
	toast.classList.add("show");

	window.setTimeout(() => {
		toast?.classList.remove("show");
	}, duration);
}

// Toast with link functionality
export function showToastWithLink(
	message: string,
	linkText: string,
	linkUrl: string,
	type: "success" | "info" | "warning" | "error" = "info",
	duration = 5000,
) {
	void type;

	let toast = document.querySelector(".holiday-toast") as HTMLDivElement | null;
	if (!toast) {
		toast = document.createElement("div");
		toast.className = "holiday-toast copy-toast lawson-toast";
		document.body.appendChild(toast);
	}

	// Toast content with link
	toast.innerHTML = `
		<div class="flex flex-col gap-2">
			<div>${message}</div>
			<a href="${linkUrl}">${linkText} →</a>
		</div>
	`;

	toast.classList.add("show");
	window.setTimeout(() => {
		toast?.classList.remove("show");
	}, duration);
}
