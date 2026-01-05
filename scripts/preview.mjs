import { spawn } from "node:child_process";

function run(command, args = []) {
	return new Promise((resolve) => {
		const child = spawn(command, args, {
			stdio: "inherit",
			shell: process.platform === "win32",
			env: {
				...process.env,
				ASTRO_ADAPTER: "node",
			},
		});

		child.on("exit", (code) => resolve(code ?? 1));
		child.on("error", () => resolve(1));
	});
}

const buildCode = await run("pnpm", ["run", "build"]);
if (buildCode !== 0) process.exit(buildCode);

const previewCode = await run("pnpm", ["exec", "astro", "preview"]);
process.exit(previewCode);
