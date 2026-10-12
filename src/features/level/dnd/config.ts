const DND_CONFIG = {
	/** How long a touch/pen must be held still before a drag starts. */
	holdMs: 50,
	/** Pointer movement (px) that turns a touch/pen press into a drag. */
	slopPx: 8,
	/** Pointer movement (px) that turns a mouse press into a drag. */
	mouseSlopPx: 4,
	/** Stacking order of the floating drag ghost. */
	ghostZIndex: 1000,
	/** Distance (px) from a viewport edge where autoscroll kicks in. */
	autoscrollEdgePx: 56,
	/** Maximum autoscroll speed (px per animation frame). */
	autoscrollSpeedPx: 14,
} as const;

export { DND_CONFIG };
