import type { MiddlewareHandler } from "astro";

export const onRequest: MiddlewareHandler = async (_ctx, next) => {
	return next();
};
