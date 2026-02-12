const normalizeTechName = (name: string) => name.toLowerCase().trim();

// Single source-of-truth for tech -> Iconify icon names.
// Prefer `simple-icons:*` where possible since they respect `currentColor`.
export const TECH_ICON_MAP: Record<string, string> = {
	// Web
	react: "simple-icons:react",
	"next.js": "simple-icons:nextdotjs",
	nextjs: "simple-icons:nextdotjs",
	express: "simple-icons:express",
	vite: "simple-icons:vite",
	astro: "simple-icons:astro",
	"tailwind css": "simple-icons:tailwindcss",
	tailwind: "simple-icons:tailwindcss",
	"shadcn ui": "simple-icons:shadcnui",
	shadcn: "simple-icons:shadcnui",
	heroui: "simple-icons:nextui",
	nextui: "simple-icons:nextui",

	// Databases
	postgresql: "simple-icons:postgresql",
	postgres: "simple-icons:postgresql",
	redis: "simple-icons:redis",
	mongodb: "simple-icons:mongodb",
	mysql: "simple-icons:mysql",
	sqlite: "simple-icons:sqlite",

	// Languages & tools
	typescript: "simple-icons:typescript",
	ts: "simple-icons:typescript",
	javascript: "simple-icons:javascript",
	js: "simple-icons:javascript",
	python: "simple-icons:python",
	java: "mdi:language-java",
	kotlin: "simple-icons:kotlin",
	"c++": "simple-icons:cplusplus",
	cplusplus: "simple-icons:cplusplus",
	cpp: "simple-icons:cplusplus",
	git: "simple-icons:git",
	pnpm: "simple-icons:pnpm",
	"node.js": "simple-icons:nodedotjs",
	nodejs: "simple-icons:nodedotjs",
	node: "simple-icons:nodedotjs",
	electron: "simple-icons:electron",
	"electron.js": "simple-icons:electron",
	electronjs: "simple-icons:electron",

	// Infra
	vercel: "simple-icons:vercel",
	cloudflare: "simple-icons:cloudflare",
	docker: "simple-icons:docker",
	github: "simple-icons:github",
	azure: "simple-icons:microsoftazure",
	aws: "simple-icons:amazonaws",
	gcp: "simple-icons:googlecloud",

	// OS
	ubuntu: "simple-icons:ubuntu",
	windows: "simple-icons:windows",
	macos: "simple-icons:apple",
	"mac os": "simple-icons:apple",
	mac: "simple-icons:apple",
};

export const getGenericIconForTech = (normalizedName: string): string => {
	if (/\b(sql|db|database|postgres|mysql|sqlite|mongo|redis)\b/.test(normalizedName))
		return "mdi:database";
	if (/\b(cloud|aws|azure|gcp|vercel|netlify|server)\b/.test(normalizedName)) return "mdi:cloud";
	if (/\b(docker|container|kubernetes|k8s)\b/.test(normalizedName)) return "mdi:cube-outline";
	if (/\b(auth|oauth|jwt|security|crypto)\b/.test(normalizedName)) return "mdi:lock";
	if (/\b(test|jest|vitest|cypress|playwright)\b/.test(normalizedName)) return "mdi:flask-outline";
	if (/\b(css|tailwind|sass|style|ui)\b/.test(normalizedName)) return "mdi:palette";
	if (/\b(api|rest|graphql|grpc)\b/.test(normalizedName)) return "mdi:api";
	if (/\b(android|ios|mobile)\b/.test(normalizedName)) return "mdi:cellphone";
	return "mdi:code-tags";
};

export const getTechIconName = (name: string, aliases?: string[]): string => {
	const keys = [normalizeTechName(name), ...(aliases ?? []).map(normalizeTechName)];
	for (const key of keys) {
		const hit = TECH_ICON_MAP[key];
		if (hit) return hit;
	}
	return getGenericIconForTech(keys[0] ?? "");
};
