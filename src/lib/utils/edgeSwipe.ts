export interface EdgeSwipeConfig {
	/** Which screen edge the drawer is anchored to. */
	edge: 'left' | 'right';
	/** Whether the gesture is currently active (e.g. only on mobile). */
	enabled: () => boolean;
	/** Open (true) or close (false) the drawer. */
	setOpen: (open: boolean) => void;
	/** How close to the edge (px) the gesture must start to count. */
	edgeThreshold?: number;
	/** Minimum swipe distance, expressed as screenWidth / distanceDivisor. */
	distanceDivisor?: number;
}

/**
 * Shared edge-swipe logic for the left sidebar and right scratchboard drawers.
 *
 * A gesture that starts within `edgeThreshold` of the anchored edge and travels
 * far enough toggles the drawer: swiping *away* from the edge opens it, swiping
 * *back* toward the edge closes it. The result is idempotent, so it is safe to
 * evaluate both edges for every gesture regardless of current drawer state.
 */
export function handleEdgeSwipe(config: EdgeSwipeConfig, start: Touch, end: Touch): void {
	if (!config.enabled()) return;

	const edgeThreshold = config.edgeThreshold ?? 40;
	const distanceDivisor = config.distanceDivisor ?? 8;

	const screenWidth = window.innerWidth;
	const swipeDistance = Math.abs(end.screenX - start.screenX);
	if (swipeDistance < screenWidth / distanceDivisor) return;

	const movedRight = end.screenX > start.screenX;

	if (config.edge === 'left') {
		// Left-anchored: gesture must start near the left edge.
		if (start.clientX > edgeThreshold) return;
		config.setOpen(movedRight); // swipe right opens, swipe left closes
	} else {
		// Right-anchored: gesture must start near the right edge.
		if (start.clientX < screenWidth - edgeThreshold) return;
		config.setOpen(!movedRight); // swipe left opens, swipe right closes
	}
}
