import { AstroError } from "astro/errors";
import { AstroJSX, jsx } from "astro/jsx-runtime";
import { renderJSX } from "astro/runtime/server/index.js";

const slotName = (str: string) => str.trim().replace(/[-_]([a-z])/g, (_, w) => w.toUpperCase());

const MDX_COMPONENT_SYMBOL = Symbol.for("mdx-component");

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
	if (typeof Component !== "function") return false;
	// Only claim components that MDX itself produced.
	return (Component as any)[MDX_COMPONENT_SYMBOL] === true;
}

export async function renderToStaticMarkup(
	Component: any,
	props: Record<string, unknown> = {},
	{ default: children = null, ...slotted }: Record<string, any> = {},
) {
	const slots: Record<string, any> = {};
	for (const [key, value] of Object.entries(slotted)) {
		const name = slotName(key);
		slots[name] = value;
	}

	const { result } = this as any;

	try {
		const html = await renderJSX(result, jsx(Component, { ...props, ...slots, children }));
		return { html };
	} catch (e: any) {
		throwEnhancedErrorIfMdxComponent(e, Component);
		throw e;
	}
}

function throwEnhancedErrorIfMdxComponent(error: any, Component: any) {
	if (Component?.[MDX_COMPONENT_SYMBOL]) {
		if (AstroError.is(error)) return;
		error.title = error.name;
		error.hint = `This issue often occurs when your MDX component encounters runtime errors.`;
		throw error;
	}
}

const renderer = {
	name: "astro:jsx",
	check,
	renderToStaticMarkup,
};

export default renderer;
