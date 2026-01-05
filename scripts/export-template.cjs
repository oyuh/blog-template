#!/usr/bin/env node
/*
Export a "public template" snapshot of this repo.

- Copies the repo into an output directory
- Excluded paths won't exist in the output
- Hard-excludes any .env* files (defense-in-depth)

Usage:
  node scripts/export-template.cjs --out .template-export
  node scripts/export-template.cjs --out .template-export --exclude-list template-excludes.txt

Notes:
- Exclude list is workspace-relative paths, one per line (# comments allowed).
- Missing paths in the exclude list are ignored.
*/

const fsp = require("node:fs/promises");
const path = require("node:path");

function usage(exitCode = 0) {
	process.stdout.write(
		[
			"\nexport-template\n",
			"Options:\n",
			"  --out <dir>            Required. Output directory.",
			"  --exclude-list <file>  Optional. Defaults to template-excludes.txt if present.",
			"  --dry-run              Print what would happen.",
			"\nExamples:\n",
			"  node scripts/export-template.cjs --out .template-export\n",
		].join("\n"),
	);
	process.exit(exitCode);
}

function parseArgs(argv) {
	const args = argv.slice(2);
	let outDir = null;
	let excludeList = null;
	let dryRun = false;

	for (let i = 0; i < args.length; i++) {
		const token = args[i];
		if (token === "--out") {
			outDir = args[++i] ?? null;
			continue;
		}
		if (token === "--exclude-list") {
			excludeList = args[++i] ?? null;
			continue;
		}
		if (token === "--dry-run") {
			dryRun = true;
			continue;
		}
		if (token === "-h" || token === "--help") usage(0);

		process.stderr.write(`[export-template] Unknown arg: ${token}\n`);
		usage(1);
	}

	if (!outDir) {
		process.stderr.write("[export-template] Missing required --out <dir>\n");
		usage(1);
	}

	return { outDir, excludeList, dryRun };
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

async function readExcludeList(listPath) {
	const abs = path.resolve(process.cwd(), listPath);
	const raw = await fsp.readFile(abs, "utf8");
	return raw
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.filter((line) => !line.startsWith("#"));
}

function isUnder(parentRel, childRel) {
	const parent = parentRel.endsWith("/") ? parentRel : `${parentRel}/`;
	return childRel === parentRel || childRel.startsWith(parent);
}

function shouldExclude(relPosix, excludesPosix) {
	// Defense-in-depth: never export any env files.
	const base = relPosix.split("/").pop() ?? "";
	if (base === ".env" || base.startsWith(".env.")) return true;
	if (base === ".env.local" || base.startsWith(".env.local.")) return true;

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
		".template-export",
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

async function main() {
	const { outDir, excludeList, dryRun } = parseArgs(process.argv);
	const repoRoot = process.cwd();
	const outAbs = path.resolve(repoRoot, outDir);

	let listPath = excludeList;
	if (!listPath) {
		const defaultList = path.resolve(repoRoot, "template-excludes.txt");
		if (await pathExists(defaultList)) listPath = "template-excludes.txt";
	}

	let excludesPosix = [];
	if (listPath) {
		const raw = await readExcludeList(listPath);
		excludesPosix = Array.from(new Set(raw.map(normalizeRel)));
	}

	process.stdout.write(`[export-template] Repo: ${repoRoot}\n`);
	process.stdout.write(`[export-template] Out:  ${outAbs}${dryRun ? " (dry-run)" : ""}\n`);
	process.stdout.write(`[export-template] Excludes (${excludesPosix.length}):\n`);
	for (const ex of excludesPosix) process.stdout.write(`  - ${ex}\n`);

	if (dryRun) return;

	await fsp.rm(outAbs, { recursive: true, force: true });
	await fsp.mkdir(outAbs, { recursive: true });
	await copyTreeFiltered(repoRoot, outAbs, excludesPosix);
}

main().catch((err) => {
	process.stderr.write(`[export-template] fatal: ${err?.stack || err}\n`);
	process.exit(1);
});
