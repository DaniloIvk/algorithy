/** Picks readable ink for a computed CSS colour, by perceived lightness. */

const INK_ON_LIGHT_BACKGROUND = '#16141c';
const INK_ON_DARK_BACKGROUND = '#ffffff';
const DARK_INK_LIGHTNESS = 0.65;

function parseChannel(part: string, percentScale: number, unitScale: number): number {
	const value = Number.parseFloat(part);
	if (!Number.isFinite(value)) {
		return 0;
	}
	return part.includes('%') ? value * percentScale : value * unitScale;
}

function linearChannel(value: number): number {
	const channel = value / 255;
	return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function perceivedLightness(channels: readonly number[]): number {
	const [red = 0, green = 0, blue = 0] = channels;
	const luminance =
		0.2126 * linearChannel(red) + 0.7152 * linearChannel(green) + 0.0722 * linearChannel(blue);
	return Math.cbrt(luminance);
}

function prefersDarkInk(background: string): boolean {
	const color = background.trim().toLowerCase();
	const start = color.indexOf('(');
	const end = color.lastIndexOf(')');

	if (start === -1 || end === -1) {
		return false;
	}

	const name = color.slice(0, start);
	const parts = color
		.slice(start + 1, end)
		.split(/[,\s/]+/)
		.filter((part) => part.length > 0);

	if (name === 'oklch' || name === 'oklab') {
		const lightness = parts[0] ?? '';
		const value = Number.parseFloat(lightness);
		return (
			Number.isFinite(value) &&
			(lightness.includes('%') ? value / 100 : value) >= DARK_INK_LIGHTNESS
		);
	}

	const channels =
		name === 'color'
			? parts.slice(0, 3).map((part) => parseChannel(part, 2.55, 255))
			: parts.slice(0, 3).map((part) => parseChannel(part, 2.55, 1));

	return perceivedLightness(channels) >= DARK_INK_LIGHTNESS;
}

/** The ink colour to put on top of `background`, a computed CSS colour. */
function readableInk(background: string): string {
	return prefersDarkInk(background) ? INK_ON_LIGHT_BACKGROUND : INK_ON_DARK_BACKGROUND;
}

export { readableInk };
