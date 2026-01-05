#!/usr/bin/env node
/*
Template sandbox runner (non-destructive).

Goal:
- Validate the repo in “public template mode” by excluding files/folders
	WITHOUT ever moving/renaming anything in your working tree.

How it works:
- Copies the repo into `.template-sandbox/<timestamp>`
- Excluded paths simply won't exist in the sandbox copy
- Links your existing `node_modules` into the sandbox to avoid reinstalling
- Runs `pnpm dev` or `pnpm build` from inside the sandbox

Usage:
	pnpm template:dev
	pnpm template:build

	pnpm template:dev -- --exclude src/components/SpotifyStatus.tsx
	pnpm template:build -- --exclude src/components/HolidayOverlay.tsx

Options:
	--exclude <path>       Repeatable.
	--exclude-list <file>  One path per line (# comments allowed).
	--dry-run              Print actions without running.

Notes:
- Paths are workspace-relative.
- Missing paths are ignored.
*/

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");

function usage(exitCode = 0) {
	const msg =
		"\nTemplate sandbox\n\n" +
		"Commands:\n" +
		"  dev    Run dev server in a sandbox copy\n" +
		"  build  Run build in a sandbox copy\n\n" +
		"Options:\n" +
		"  --exclude <path>        Repeatable\n" +
		"  --exclude-list <file>   One relative path per line (# comments allowed)\n" +
		"  --dry-run               Don't run, just print what would happen\n\n" +
		"Examples:\n" +
		"  pnpm template:dev\n" +
		"  pnpm template:dev -- --exclude src/components/SpotifyStatus.tsx\n" +
		"  pnpm template:build -- --exclude src/components/HolidayOverlay.tsx\n";
	process.stdout.write(msg);
	process.exit(exitCode);
}

function parseArgs(argv) {
	const args = argv.slice(2);
	if (args.length === 0) usage(1);
	const command = args[0];
	if (command === "-h" || command === "--help") usage(0);
	if (command !== "dev" && command !== "build") {
		process.stderr.write(`[template-sandbox] Unknown command: ${command}\n`);
		usage(1);
	}

	const excludes = [];
	let excludeList = null;
	let dryRun = false;

	for (let i = 1; i < args.length; i++) {
		const token = args[i];
		if (token === "--exclude") {
			const value = args[++i];
			if (!value) {
				process.stderr.write("[template-sandbox] Missing value for --exclude\n");
				process.exit(1);
			}
			excludes.push(value);
			continue;
		}
		if (token === "--exclude-list") {
			const value = args[++i];
			if (!value) {
				process.stderr.write("[template-sandbox] Missing value for --exclude-list\n");
				process.exit(1);
			}
			excludeList = value;
			continue;
		}
		if (token === "--dry-run") {
			dryRun = true;
			continue;
		}
		if (token === "-h" || token === "--help") usage(0);

		process.stderr.write(`[template-sandbox] Unknown arg: ${token}\n`);
		usage(1);
	}

	return { command, excludes, excludeList, dryRun };
}

async function readExcludeList(listPath) {
	const abs = path.resolve(process.cwd(), listPath);
	const raw = await fsp.readFile(abs, "utf8");
	return raw
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.filter((line) => !line.startsWith("#"));
}

async function pathExists(p) {
	try {
		await fsp.stat(p);
		return true;
	} catch {
		return false;
	}
}

function normalizeRel(p) {
	return p.replace(/^[\\/]+/, "").replace(/\\/g, "/");
}

function isUnder(parentRel, childRel) {
	const parent = parentRel.endsWith("/") ? parentRel : `${parentRel}/`;
	return childRel === parentRel || childRel.startsWith(parent);
}

function shouldExclude(relPosix, excludesPosix) {
	for (const ex of excludesPosix) {
		if (isUnder(ex, relPosix)) return true;
	}
	return false;
}

async function copyTreeFiltered(srcRoot, destRoot, excludesPosix) {
	const ignoreTop = new Set([
		"node_modules",
		"dist",
		".git",
		".astro",
		".vercel",
		".template-disabled",
		".template-sandbox",
	]);

	async function walk(relPosix) {
		const relFs = relPosix.split("/").join(path.sep);
		const srcAbs = path.join(srcRoot, relFs);
		const destAbs = path.join(destRoot, relFs);

		if (relPosix) {
			const top = relPosix.split("/")[0];
			if (ignoreTop.has(top)) return;
			if (shouldExclude(relPosix, excludesPosix)) return;
		}

		const stat = await fsp.lstat(srcAbs);
		if (stat.isSymbolicLink()) {
			const link = await fsp.readlink(srcAbs);
			await fsp.mkdir(path.dirname(destAbs), { recursive: true });
			await fsp.symlink(link, destAbs);
			return;
		}
		if (stat.isDirectory()) {
			await fsp.mkdir(destAbs, { recursive: true });
			const entries = await fsp.readdir(srcAbs);
			for (const entry of entries) {
				const childRel = relPosix ? `${relPosix}/${entry}` : entry;
				await walk(childRel);
			}
			return;
		}

		await fsp.mkdir(path.dirname(destAbs), { recursive: true });
		await fsp.copyFile(srcAbs, destAbs);
	}

	await walk("");
}

async function linkNodeModules(repoRoot, sandboxRoot) {
	const src = path.join(repoRoot, "node_modules");
	const dest = path.join(sandboxRoot, "node_modules");
	if (!(await pathExists(src))) {
		throw new Error("node_modules not found. Run `pnpm install` first.");
	}
	await fsp.symlink(src, dest, process.platform === "win32" ? "junction" : "dir");
}

function runPnpm(command, { cwd } = {}) {
	// On Windows, pnpm resolves to a .cmd shim. Spawning a .cmd with
	// `shell: false` can throw `spawn EINVAL`, so use a shell on win32.
	const isWindows = process.platform === "win32";
	return spawn("pnpm", [command], {
		cwd,
		stdio: "inherit",
		shell: isWindows,
	});
}

async function main() {
	const { command, excludes, excludeList, dryRun } = parseArgs(process.argv);

	let allExcludes = [...excludes];
	if (excludeList) {
		const list = await readExcludeList(excludeList);
		allExcludes = allExcludes.concat(list);
	}

	// De-dupe
	allExcludes = Array.from(new Set(allExcludes));

	// Convenience: if you run `pnpm template:dev` with no flags, but a
	// `template-excludes.txt` exists at the repo root, use it.
	if (allExcludes.length === 0) {
		const defaultList = path.resolve(process.cwd(), "template-excludes.txt");
		if (await pathExists(defaultList)) {
			const list = await readExcludeList(defaultList);
			allExcludes = Array.from(new Set(list));
			if (allExcludes.length > 0) {
				process.stdout.write(
					`[template-sandbox] Loaded ${allExcludes.length} excludes from template-excludes.txt\n`,
				);
			}
		}
	}

	if (allExcludes.length === 0) {
		process.stdout.write("[template-sandbox] No excludes provided; running normally.\n");
		const child = runPnpm(command);
		child.on("exit", (code) => process.exit(code ?? 0));
		return;
	}

	const repoRoot = process.cwd();
	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	const sandboxRoot = path.join(repoRoot, ".template-sandbox", stamp);
	const excludesPosix = allExcludes.map(normalizeRel);

	process.stdout.write(`[template-sandbox] Mode: ${command}${dryRun ? " (dry-run)" : ""}\n`);
	process.stdout.write(`[template-sandbox] Sandbox: ${sandboxRoot}\n`);
	process.stdout.write(`[template-sandbox] Excludes (${excludesPosix.length}):\n`);
	for (const ex of excludesPosix) process.stdout.write(`  - ${ex}\n`);

	if (dryRun) return;

	await fsp.mkdir(sandboxRoot, { recursive: true });
	await copyTreeFiltered(repoRoot, sandboxRoot, excludesPosix);
	await linkNodeModules(repoRoot, sandboxRoot);

	let cleaning = false;
	const cleanupOnce = async () => {
		if (cleaning) return;
		cleaning = true;
		try {
			await fsp.rm(sandboxRoot, { recursive: true, force: true });
		} catch {
			process.stdout.write(
				`[template-sandbox] Note: could not delete sandbox folder (likely Windows file lock): ${sandboxRoot}\n`,
			);
		}
	};

	const child = runPnpm(command, { cwd: sandboxRoot });

	const signals = ["SIGINT", "SIGTERM"];
	for (const sig of signals) {
		process.on(sig, async () => {
			if (!child.killed) child.kill("SIGINT");
			await cleanupOnce();
			process.exit(130);
		});
	}

	child.on("close", async (code) => {
		await cleanupOnce();
		process.exit(code ?? 0);
	});
}

main().catch((err) => {
	process.stderr.write(`[template-sandbox] fatal: ${err?.stack || err}\n`);
	process.exit(1);
});
