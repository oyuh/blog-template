// The phrase that greets every new visit. It holds on screen for a few minutes
// before the random rotation starts, so it acts as the site's default tagline.
export const FEATURED_SPLASH_TEXT =
	"I make things that solve very inadequate/self made issues (most of the time).";

export const SPLASH_TEXTS = [
	FEATURED_SPLASH_TEXT,
	"I like making things that make people's lives a little better.",
	"I've never made a GPT wrapper!",
	"My degree might be useless!",
	"Check out my comments service on this STATIC site!",
	"My code works on my machine!",
	"This is fine. (The build is not.)",
	"Have you tried turning it off and on again?",
	"Just one more quick refactor.",
	"TODO: remove TODOs.",
	"Cache invalidation speedrun any%.",
	"AI won't take my job—my backlog will.",
	"If this breaks, it was the pipeline.",
] as const;

// How long the featured phrase stays put before the random rotation begins (ms).
export const SPLASH_HOLD_MS = 3 * 60 * 1000; // 3 minutes
