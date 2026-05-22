const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const cachePaths = [".astro", path.join("node_modules", ".astro"), path.join("node_modules", ".vite")];

for (const cachePath of cachePaths) {
	fs.rmSync(path.join(root, cachePath), { force: true, recursive: true });
}
