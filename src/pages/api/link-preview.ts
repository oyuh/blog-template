import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ url }) => {
	const targetUrl = url.searchParams.get("url");

	if (!targetUrl) {
		return new Response(JSON.stringify({ error: "URL parameter is required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		// Fetch the target URL
		const response = await fetch(targetUrl, {
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; LinkPreviewBot/1.0)",
			},
		});

		if (!response.ok) {
			throw new Error("Failed to fetch URL");
		}

		const html = await response.text();

		// Parse meta tags
		const metadata: {
			title: string;
			description: string;
			image?: string;
			url: string;
			siteName?: string;
			favicon?: string;
		} = {
			title: "",
			description: "",
			url: targetUrl,
		};

		// Extract Open Graph tags
		const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i);
		const ogDescription = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
		const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i);
		const ogSiteName = html.match(/<meta\s+property="og:site_name"\s+content="([^"]*)"/i);

		// Extract Twitter Card tags
		const twitterTitle = html.match(/<meta\s+name="twitter:title"\s+content="([^"]*)"/i);
		const twitterDescription = html.match(
			/<meta\s+name="twitter:description"\s+content="([^"]*)"/i,
		);
		const twitterImage = html.match(/<meta\s+name="twitter:image"\s+content="([^"]*)"/i);

		// Extract standard meta tags
		const metaDescription = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
		const titleTag = html.match(/<title>([^<]*)<\/title>/i);

		// Extract favicon
		const favicon = html.match(/<link\s+rel="(?:icon|shortcut icon)"\s+href="([^"]*)"/i);

		// Set metadata with fallbacks
		metadata.title =
			ogTitle?.[1] || twitterTitle?.[1] || titleTag?.[1] || new URL(targetUrl).hostname;
		metadata.description =
			ogDescription?.[1] || twitterDescription?.[1] || metaDescription?.[1] || "";

		const imageUrl = ogImage?.[1] || twitterImage?.[1];
		if (imageUrl) {
			metadata.image = imageUrl;
		}

		if (ogSiteName?.[1]) {
			metadata.siteName = ogSiteName[1];
		}

		// Resolve relative URLs
		const baseUrl = new URL(targetUrl);
		if (metadata.image && !metadata.image.startsWith("http")) {
			metadata.image = new URL(metadata.image, baseUrl.origin).toString();
		}
		if (favicon?.[1]) {
			const faviconUrl = favicon[1].startsWith("http")
				? favicon[1]
				: new URL(favicon[1], baseUrl.origin).toString();
			metadata.favicon = faviconUrl;
		} else {
			// Default to /favicon.ico
			metadata.favicon = `${baseUrl.origin}/favicon.ico`;
		}

		return new Response(JSON.stringify(metadata), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, max-age=3600", // Cache for 1 hour
			},
		});
	} catch (error) {
		console.error("Error fetching link preview:", error);
		return new Response(JSON.stringify({ error: "Failed to fetch link preview" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
