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

declare module "baffle" {
	export type BaffleInstance = {
		start: () => BaffleInstance;
		stop: () => BaffleInstance;
		set: (options: Record<string, unknown>) => BaffleInstance;
		text: (fn: (text: string) => string) => BaffleInstance;
		reveal: (duration?: number, delay?: number) => BaffleInstance;
	};

	const baffle: (target: Element | NodeListOf<Element> | string) => BaffleInstance;
	export default baffle;
}
