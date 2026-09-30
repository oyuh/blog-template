import type { MiddlewareHandler } from "astro";

// Keep in sync with public/_headers, which only covers static assets on Cloudflare.
const FRAME_ANCESTORS =
	"frame-ancestors 'self' https://personal.utdallas.edu https://*.utdallas.edu";

export const onRequest: MiddlewareHandler = async (context, next) => {
	const response = await next();
	if (context.isPrerendered) {
		return response;
	}

	const statusCode = response.status;
	const pathname = context.url.pathname;
	const acceptHeader = context.request.headers.get("accept") ?? "";
	const expectsHtml = acceptHeader.includes("text/html");

	const isClientError = statusCode >= 400 && statusCode <= 499;
	const isApiRoute = pathname.startsWith("/api/");
	const isErrorRoute = pathname.startsWith("/400") || pathname.startsWith("/404");

	if (isClientError && expectsHtml && !isApiRoute && !isErrorRoute) {
		const originalPath = `${pathname}${context.url.search}`;
		const rewritten = await context.rewrite(
			`/400/?status=${statusCode}&from=${encodeURIComponent(originalPath)}`,
		);
		rewritten.headers.set("Content-Security-Policy", FRAME_ANCESTORS);
		return rewritten;
	}

	response.headers.set("Content-Security-Policy", FRAME_ANCESTORS);
	return response;
};
