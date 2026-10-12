import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'hono/jsx';
import type { Child } from 'hono/jsx';
import { parseSkin, skinNames, type Skin } from '../../schemas/skin.schema';
import { applySkinToDocument, getStoredSkin, setStoredSkin } from '../../lib/skin';

type SkinContextValue = {
	readonly skin: Skin | null;
	readonly setSkin: (skin: unknown) => void;
	readonly clearSkin: () => void;
	readonly hasChosen: boolean;
};

const SkinContext = createContext<SkinContextValue | null>(null);

function SkinProvider({ children }: { readonly children: Child }) {
	const [skin, setSkinState] = useState<Skin | null>(() => getStoredSkin());

	const setSkin = useCallback((nextSkin: unknown) => {
		const parsed = parseSkin(nextSkin);
		if (parsed === null) {
			return;
		}
		setSkinState(parsed);
		setStoredSkin(parsed);
		applySkinToDocument(parsed);
	}, []);

	const clearSkin = useCallback(() => {
		setSkinState(null);
		setStoredSkin(null);
		applySkinToDocument(null);
	}, []);

	useEffect(() => {
		applySkinToDocument(skin);
	}, [skin]);

	useEffect(() => {
		if (skin !== null) {
			return;
		}
		const stored = getStoredSkin();
		if (stored !== null && skinNames.includes(stored)) {
			setSkinState(stored);
			applySkinToDocument(stored);
		}
	}, [skin]);

	const value = useMemo<SkinContextValue>(
		() => ({
			skin,
			setSkin,
			clearSkin,
			hasChosen: skin !== null,
		}),
		[skin, setSkin, clearSkin],
	);

	return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}

function useSkin(): SkinContextValue {
	const context = useContext(SkinContext);
	if (context === null) {
		throw new Error('useSkin must be used within SkinProvider');
	}
	return context;
}

export { SkinProvider, useSkin };
export type { SkinContextValue };
