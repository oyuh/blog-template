import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

function resolveSiteDir() {
	// With a server adapter, prerendered HTML and static assets land in `dist/client`.
	const distClient = "dist/client";
	if (existsSync(distClient)) return distClient;

	// Default Astro output directory.
	const dist = "dist";
	if (existsSync(dist)) return dist;

	throw new Error(
		"pagefind: could not find a build output directory. Expected 'dist'. Run the build first.",
	);
}

const siteDir = resolveSiteDir();
console.log(`pagefind: indexing '${siteDir}'`);

const child = spawn("pagefind", ["--site", siteDir], {
	stdio: "inherit",
	// On Windows, the executable is typically resolved via pagefind.cmd.
	shell: process.platform === "win32",
});

child.on("exit", (code) => {
	process.exit(code ?? 1);
});

child.on("error", (err) => {
	console.error("pagefind: failed to run", err);
	process.exit(1);
});
