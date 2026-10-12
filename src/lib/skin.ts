import { parseSkin, type Skin } from '../schemas/skin.schema';

const STORAGE_KEY = 'bunplate:player-skin';

function getStoredSkin(): Skin | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw === null) {
			return null;
		}
		const parsed: unknown = JSON.parse(raw);
		return parseSkin(parsed);
	} catch {
		return null;
	}
}

function setStoredSkin(skin: Skin | null): void {
	if (skin === null) {
		localStorage.removeItem(STORAGE_KEY);
		return;
	}
	localStorage.setItem(STORAGE_KEY, JSON.stringify(skin));
}

function applySkinToDocument(skin: Skin | null): void {
	const root = document.documentElement;
	if (skin === null) {
		root.removeAttribute('data-player-skin');
		return;
	}
	root.setAttribute('data-player-skin', skin);
}

export { STORAGE_KEY, applySkinToDocument, getStoredSkin, setStoredSkin };
