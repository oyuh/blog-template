export function enhanceExternalLinks(root: Element | Document) {
	const links = new Set(root.querySelectorAll<HTMLAnchorElement>("a[href]"));
	if (root instanceof Element) {
		const parentLink = root.closest<HTMLAnchorElement>("a[href]");
		if (parentLink) links.add(parentLink);
	}

	for (const link of links) {
		const external = /^https?:$/.test(link.protocol) && link.origin !== location.origin;
		if (!external) {
			link.classList.remove("external-text-link");
			continue;
		}

		link.target = "_blank";
		link.relList.add("noopener", "noreferrer");
		if (!link.hasAttribute("aria-description")) {
			link.setAttribute("aria-description", "Opens in a new tab");
		}

		// Icon labels and SVG titles do not count as visible link text.
		const content = link.cloneNode(true) as HTMLAnchorElement;
		for (const hidden of content.querySelectorAll("svg, .sr-only, [hidden], [aria-hidden='true']")) {
			hidden.remove();
		}
		link.classList.toggle(
			"external-text-link",
			Boolean(content.textContent?.trim()) && !link.textContent?.includes("↗"),
		);
	}
}
