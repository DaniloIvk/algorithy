import { createContext, useContext, useMemo, useState, type Child } from 'hono/jsx';
import { playSound } from '../../../lib/sound';
import type { SequenceItem } from '../../../schemas/sequence.schema';
import { createDragController } from './session';
import type { ActiveDrag, DndApi } from './types';

type SetSequence = (
	action: SequenceItem[] | ((previous: SequenceItem[]) => SequenceItem[]),
) => void;

const DndContext = createContext<DndApi | null>(null);
const ActiveZoneContext = createContext<string | null>(null);
const ActiveDropIndexContext = createContext<number | null>(null);
const ActiveDragContext = createContext<ActiveDrag | null>(null);

function DndProvider({
	setSequence,
	children,
}: {
	readonly setSequence: SetSequence;
	readonly children: Child;
}) {
	const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
	const [activeDropIndex, setActiveDropIndex] = useState<number | null>(null);
	const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);

	const api = useMemo<DndApi>(() => {
		const controller = createDragController(
			setSequence,
			setActiveZoneId,
			setActiveDrag,
			setActiveDropIndex,
			playSound,
		);
		return {
			draggableProps: (descriptor) => ({
				onPointerDown: (event: PointerEvent) => controller.begin(event, descriptor),
			}),
			dropZoneProps: (zoneId) => ({ 'data-drop-zone': zoneId }),
			deleteZoneProps: () => ({ 'data-drop-delete': 'true' }),
		};
	}, [setSequence, setActiveZoneId, setActiveDrag, setActiveDropIndex]);

	return (
		<DndContext.Provider value={api}>
			<ActiveZoneContext.Provider value={activeZoneId}>
				<ActiveDropIndexContext.Provider value={activeDropIndex}>
					<ActiveDragContext.Provider value={activeDrag}>{children}</ActiveDragContext.Provider>
				</ActiveDropIndexContext.Provider>
			</ActiveZoneContext.Provider>
		</DndContext.Provider>
	);
}

function useDnd(): DndApi {
	const api = useContext(DndContext);
	if (api === null) {
		throw new Error('useDnd must be used within DndProvider');
	}
	return api;
}

/** The drop zone currently under the pointer, or null. Reactive. */
function useActiveZoneId(): string | null {
	return useContext(ActiveZoneContext);
}

/** The insertion index currently under the pointer, or null. Reactive. */
function useActiveDropIndex(): number | null {
	return useContext(ActiveDropIndexContext);
}

/** The drag currently in progress, or null. Reactive (changes on start/end). */
function useActiveDrag(): ActiveDrag | null {
	return useContext(ActiveDragContext);
}

export { DndProvider, useActiveDrag, useActiveDropIndex, useActiveZoneId, useDnd };
