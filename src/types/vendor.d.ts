// Vendor/ambient module typings for packages without bundled TypeScript types.

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
