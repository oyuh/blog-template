import type { MiddlewareHandler } from "astro";

export const onRequest: MiddlewareHandler = async (context, next) => {
	const response = await next();
	const statusCode = response.status;
	const pathname = context.url.pathname;
	const acceptHeader = context.request.headers.get("accept") ?? "";
	const expectsHtml = acceptHeader.includes("text/html");

	const isClientError = statusCode >= 400 && statusCode <= 499;
	const isApiRoute = pathname.startsWith("/api/");
	const isErrorRoute = pathname.startsWith("/400") || pathname.startsWith("/404");

	if (isClientError && expectsHtml && !isApiRoute && !isErrorRoute) {
		const originalPath = `${pathname}${context.url.search}`;
		return context.rewrite(`/400/?status=${statusCode}&from=${encodeURIComponent(originalPath)}`);
	}

	return response;
};
