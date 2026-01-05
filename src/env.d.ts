/// <reference path="./types/vendor.d.ts" />

declare module "@pagefind/default-ui" {
	export class PagefindUI {
		constructor(arg: unknown);
	}
	export default PagefindUI;
}

declare module "aos" {
	const AOS: {
		init?: (opts?: Record<string, unknown>) => void;
		refreshHard?: () => void;
	};
	export default AOS;
}

declare module "*?raw" {
	const content: string;
	export default content;
}

declare module "astro-webmanifest" {
	const webmanifest: (...args: unknown[]) => unknown;
	export default webmanifest;
}

// Holiday system global interface
declare global {
	interface Window {
		holiday: {
			enableHoliday: (holidayId?: string) => void;
			disableHoliday: (holidayId?: string) => void;
			listHolidays: () => void;
		};
	}
}

interface ImportMetaEnv {
	readonly BASE_URL: string;
	readonly PUBLIC_TEMPLATE_REPO_URL?: string;
	readonly PUBLIC_COMMENTS_API_ORIGIN?: string;
	readonly PUBLIC_ENABLE_VERCEL_ANALYTICS?: string;
	readonly PUBLIC_ENABLE_SPEED_INSIGHTS?: string;
	readonly VERCEL?: string;
	readonly PUBLIC_COMMENTS_DEBUG?: string;
	readonly GITHUB_TOKEN?: string;
	readonly GITHUB_OWNER?: string;
	readonly GITHUB_REPO?: string;
	readonly UMAMI_API_KEY?: string;
	readonly UMAMI_HOST?: string;
	readonly UMAMI_WEBSITE_ID?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

export {};
