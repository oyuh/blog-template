/*
  Patches @astrojs/mdx's server renderer check() to be "server safe".

  Why:
  - Some versions of @astrojs/mdx implement `check()` by executing the passed
    component to see if it returns Astro JSX.
  - When Astro probes React function components this way, it runs React hooks
    outside a React render and spams: "Warning: Invalid hook call".

  This script replaces the installed `@astrojs/mdx/dist/server.js` with an
  equivalent renderer whose `check()` is opt-in: it only executes components
  tagged with Symbol.for("mdx-component") (i.e. real MDX components).
*/

const fs = require("node:fs");
const path = require("node:path");

function main() {
	let entry;
	try {
		entry = require.resolve("@astrojs/mdx");
	} catch {
		console.warn("[patch-mdx] Could not resolve @astrojs/mdx; skipping.");
		return;
	}

	// Walk up from the resolved entrypoint to find the package root.
	let dir = path.dirname(entry);
	let pkgRoot = null;
	for (let i = 0; i < 10; i++) {
		const pkgPath = path.join(dir, "package.json");
		if (fs.existsSync(pkgPath)) {
			try {
				const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
				if (pkg?.name === "@astrojs/mdx") {
					pkgRoot = dir;
					break;
				}
			} catch {
				// ignore
			}
		}
		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}

	if (!pkgRoot) {
		console.warn("[patch-mdx] Could not locate @astrojs/mdx package root; skipping.");
		return;
	}

	const resolved = path.join(pkgRoot, "dist", "server.js");
	if (!fs.existsSync(resolved)) {
		console.warn("[patch-mdx] Expected file missing:", resolved);
		return;
	}

	const marker = "/* PATCHED_BY_LH_SAFE_MDX_CHECK */";
	const current = fs.readFileSync(resolved, "utf8");
	if (current.includes(marker)) {
		console.log("[patch-mdx] Already patched:", resolved);
		return;
	}

	const patched = `${marker}
import { AstroError } from "astro/errors";
import { AstroJSX, jsx } from "astro/jsx-runtime";
import { renderJSX } from "astro/runtime/server/index.js";

const slotName = (str) => str.trim().replace(/[-_]([a-z])/g, (_, w) => w.toUpperCase());

// The upstream @astrojs/mdx renderer's \`check()\` may *execute* the passed
// component to determine whether it returns Astro JSX.
//
// That behavior is unsafe for non-MDX components (e.g. React function components),
// because calling them directly runs hooks outside a React render and triggers
// \"Invalid hook call\" warnings.
//
// This shim makes \`check()\` opt-in: only MDX-tagged components are executed.
const MDX_COMPONENT_SYMBOL = Symbol.for("mdx-component");

async function check(Component, props, { default: children = null, ...slotted } = {}) {
	if (typeof Component !== "function") return false;

	// Only MDX components should be probed/executed by the MDX renderer.
	if (Component?.[MDX_COMPONENT_SYMBOL] !== true) return false;

	const slots = {};
	for (const [key, value] of Object.entries(slotted)) {
		const name = slotName(key);
		slots[name] = value;
	}

	try {
		const result = await Component({ ...props, ...slots, children });
		return Boolean(result?.[AstroJSX]);
	} catch (e) {
		throwEnhancedErrorIfMdxComponent(e, Component);
	}

	return false;
}

async function renderToStaticMarkup(Component, props = {}, { default: children = null, ...slotted } = {}) {
	const slots = {};
	for (const [key, value] of Object.entries(slotted)) {
		const name = slotName(key);
		slots[name] = value;
	}

	const { result } = this;
	try {
		const html = await renderJSX(result, jsx(Component, { ...props, ...slots, children }));
		return { html };
	} catch (e) {
		throwEnhancedErrorIfMdxComponent(e, Component);
		throw e;
	}
}

function throwEnhancedErrorIfMdxComponent(error, Component) {
	if (Component?.[MDX_COMPONENT_SYMBOL]) {
		if (AstroError.is(error)) return;
		error.title = error.name;
		error.hint = "This issue often occurs when your MDX component encounters runtime errors.";
		throw error;
	}
}

const renderer = {
	name: "astro:jsx",
	check,
	renderToStaticMarkup,
};

var server_default = renderer;
export {
	check,
	server_default as default,
	renderToStaticMarkup,
};
`;

	// Backup once (best-effort).
	try {
		const backupPath = path.join(path.dirname(resolved), "server.js.bak");
		if (!fs.existsSync(backupPath)) fs.writeFileSync(backupPath, current, "utf8");
	} catch {
		// ignore
	}

	fs.writeFileSync(resolved, patched, "utf8");
	console.log("[patch-mdx] Patched:", resolved);
}

main();
