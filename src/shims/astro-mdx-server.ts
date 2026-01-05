import { AstroError } from "astro/errors";
import { AstroJSX, jsx } from "astro/jsx-runtime";
import { renderJSX } from "astro/runtime/server/index.js";

const slotName = (str: string) =>
	str.trim().replace(/[-_]([a-z])/g, (_: string, w: string) => w.toUpperCase());

// The upstream @astrojs/mdx renderer's `check()` currently *executes* the passed
// component to determine whether it returns Astro JSX.
//
// That behavior is unsafe for non-MDX components (e.g. React function components),
// because calling them directly runs hooks outside a React render and triggers
// "Invalid hook call" warnings (and can break rendering/hydration).
//
// This shim makes `check()` opt-in: only MDX-tagged components are executed.
const MDX_COMPONENT_SYMBOL = Symbol.for("mdx-component");

type SlotProps = Record<string, unknown>;
type SlotsInput = { default?: unknown } & Record<string, unknown>;
type CallableComponent = (props: SlotProps) => unknown | Promise<unknown>;
type SSRResultType = Parameters<typeof renderJSX>[0];
type RendererThis = { result: SSRResultType };

export async function check(
	Component: unknown,
	props: Record<string, unknown>,
	{ default: children = null, ...slotted }: SlotsInput = {},
): Promise<boolean> {
	if (typeof Component !== "function") return false;

	// Only MDX components should be probed/executed by the MDX renderer.
	const componentRecord = Component as unknown as Record<symbol, unknown>;
	if (componentRecord[MDX_COMPONENT_SYMBOL] !== true) return false;

	const slots: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(slotted)) {
		const name = slotName(key);
		slots[name] = value;
	}

	try {
		const componentFn = Component as unknown as CallableComponent;
		const result = await componentFn({ ...props, ...slots, children });
		const resultRecord = result as unknown as Record<symbol, unknown>;
		return Boolean(resultRecord?.[AstroJSX]);
	} catch (error: unknown) {
		throwEnhancedErrorIfMdxComponent(error, Component);
	}

	return false;
}

export async function renderToStaticMarkup(
	this: RendererThis,
	Component: unknown,
	props: Record<string, unknown> = {},
	{ default: children = null, ...slotted }: SlotsInput = {},
) {
	const slots: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(slotted)) {
		const name = slotName(key);
		slots[name] = value;
	}

	const { result } = this;

	try {
		const html = await renderJSX(
			result,
			jsx(Component as unknown as CallableComponent, { ...props, ...slots, children }),
		);
		return { html };
	} catch (error: unknown) {
		throwEnhancedErrorIfMdxComponent(error, Component);
		throw error;
	}
}

function throwEnhancedErrorIfMdxComponent(error: unknown, Component: unknown) {
	const componentRecord = Component as unknown as Record<symbol, unknown>;
	if (componentRecord?.[MDX_COMPONENT_SYMBOL]) {
		if (AstroError.is(error)) return;
		const err = error as Error & { title?: string; hint?: string };
		err.title = err.name;
		err.hint = "This issue often occurs when your MDX component encounters runtime errors.";
		throw err;
	}
}

const renderer = {
	name: "astro:jsx",
	check,
	renderToStaticMarkup,
};

export default renderer;
