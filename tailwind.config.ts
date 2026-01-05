import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

// ❌ Do not call `heroui()` directly unless using its theme
// ✅ Only include HeroUI content path for component usage
const config: Config = {
	darkMode: ["class", "dark"],
	content: [
		"./src/**/*.{js,ts,jsx,tsx,astro}",
		"./node_modules/@heroui/react/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ["Geist", "system-ui", "sans-serif"],
				mono: [
					"Geist Mono",
					"ui-monospace",
					"SFMono-Regular",
					"Menlo",
					"Monaco",
					"Consolas",
					'"Liberation Mono"',
					'"Courier New"',
					"monospace",
				],
			},
			animation: {
				"spin-slow": "spin 8s linear infinite",
			},
			typography: () => ({
				DEFAULT: {
					css: {
						a: {
							textUnderlineOffset: "2px",
							"&:hover": {
								"@media (hover: hover)": {
									textDecorationColor: "var(--color-link)",
									textDecorationThickness: "2px",
								},
							},
						},
						blockquote: {
							borderLeftWidth: "0",
						},
						code: {
							border: "1px solid color-mix(in srgb, var(--color-global-text) 25%, transparent)",
							borderRadius: "0.375rem",
							backgroundColor: "color-mix(in srgb, var(--color-global-text) 6%, transparent)",
							paddingInline: "0.3em",
							paddingBlock: "0.1em",
						},
						kbd: {
							"&:where([data-theme='dark'], [data-theme='dark'] *)": {
								background: "var(--color-global-text)",
							},
						},
						hr: {
							borderTopStyle: "dashed",
						},
						strong: {
							fontWeight: "700",
						},
						sup: {
							marginInlineStart: "calc(var(--spacing) * 0.5)",
							a: {
								"&:after": {
									content: "']'",
								},
								"&:before": {
									content: "'['",
								},
								"&:hover": {
									"@media (hover: hover)": {
										color: "var(--color-link)",
									},
								},
							},
						},
						"tbody tr": {
							borderBottomWidth: "none",
						},
						tfoot: {
							borderTop: "1px dashed color-mix(in srgb, var(--color-global-text) 30%, transparent)",
						},
						thead: {
							borderBottomWidth: "none",
						},
						"thead th": {
							borderBottom:
								"1px dashed color-mix(in srgb, var(--color-global-text) 30%, transparent)",
							fontWeight: "700",
						},
						'th[align="center"], td[align="center"]': {
							textAlign: "center",
						},
						'th[align="right"], td[align="right"]': {
							textAlign: "right",
						},
						'th[align="left"], td[align="left"]': {
							textAlign: "left",
						},
					},
				},
				sm: {
					css: {
						code: {
							fontSize: "var(--text-sm)",
							fontWeight: "400",
						},
					},
				},
			}),
		},
	},
	plugins: [
		typography,
		// ❌ remove heroui() plugin — just use the components directly
	],
};

export default config;
