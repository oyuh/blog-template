import { AstroError } from "astro/errors";
import { jsx } from "astro/jsx-runtime";
import { renderJSX } from "astro/runtime/server/index.js";

const slotName = (str: string) => str.trim().replace(/[-_]([a-z])/g, (_, w) => w.toUpperCase());

const MDX_COMPONENT_SYMBOL = Symbol.for("mdx-component");

type JsxComponent = Parameters<typeof jsx>[0];

function isMdxTaggedComponent(Component: unknown): Component is Record<PropertyKey, unknown> {
	if (typeof Component !== "function") return false;
	return (Component as unknown as Record<PropertyKey, unknown>)[MDX_COMPONENT_SYMBOL] === true;
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
	return typeof value === "object" && value !== null;
}

/**
 * This is a safety-patched version of `@astrojs/mdx/dist/server.js`.
 *
 * Why it exists:
 * Astro's renderer auto-detection runs each renderer's `check()`.
 * The upstream MDX `check()` calls `await Component(props)` which will
 * directly execute React function components and explode with
 * "Invalid hook call".
 *
 * Our patched `check()` only returns true for MDX-tagged components and
 * never executes arbitrary functions.
 */
export async function check(
	Component: unknown,
	_props: Record<string, unknown>,
	_slotted: Record<string, unknown> = {},
) {
	// Only claim components that MDX itself produced.
	return isMdxTaggedComponent(Component);
}

export async function renderToStaticMarkup(
	this: { result: Parameters<typeof renderJSX>[0] },
	Component: JsxComponent,
	props: Record<string, unknown> = {},
	slotted: Record<string, unknown> = {},
) {
	const { default: children = null, ...rest } = slotted as Record<string, unknown> & {
		default?: unknown;
	};

	const slots: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(rest)) {
		const name = slotName(key);
		slots[name] = value;
	}

	const { result } = this;

	try {
		const html = await renderJSX(result, jsx(Component, { ...props, ...slots, children }));
		return { html };
	} catch (e: unknown) {
		throwEnhancedErrorIfMdxComponent(e, Component);
		throw e;
	}
}

function throwEnhancedErrorIfMdxComponent(error: unknown, Component: unknown) {
	if (!isMdxTaggedComponent(Component)) return;
	if (AstroError.is(error)) return;

	if (isRecord(error)) {
		const title = error instanceof Error ? error.name : String(error.name ?? "Error");
		error.title = title;
		error.hint = "This issue often occurs when your MDX component encounters runtime errors.";
	}

	throw error;
}

const renderer = {
	name: "astro:jsx",
	check,
	renderToStaticMarkup,
};

export default renderer;
