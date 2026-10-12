import type { ActionName } from '../../../domain/actions';
import type { ConditionName } from '../../../domain/conditions';

/** Everything the drag layer needs to know about the thing being dragged. */
type DraggableDescriptor = {
	/** Sequence item id; omitted for palette (new) blocks. */
	readonly id?: string;
	readonly action: ActionName;
	readonly label: string;
	readonly default?: boolean;
	readonly count?: number;
	readonly condition?: ConditionName;
	/** Index in the source zone; omitted for palette (new) blocks. */
	readonly from?: number;
	/** Source zone id; omitted for palette (new) blocks. */
	readonly zoneId?: string;
};

/** The drag currently in progress, exposed reactively for source styling. */
type ActiveDrag = {
	/** Item id, or null when dragging a fresh block out of the palette. */
	readonly id: string | null;
	readonly action: ActionName;
	readonly width: number;
	readonly height: number;
};

type DropTarget =
	| { readonly kind: 'delete' }
	| {
			readonly kind: 'zone';
			readonly zoneId: string;
			readonly element: HTMLElement;
			readonly index: number | null;
	  };

/**
 * The stable, consuming-facing DnD interface. Components only ever touch
 * these methods; the implementation behind them can be replaced freely.
 */
type DndApi = {
	draggableProps(descriptor: DraggableDescriptor): {
		readonly onPointerDown: (event: PointerEvent) => void;
	};
	dropZoneProps(zoneId: string): { readonly 'data-drop-zone': string };
	deleteZoneProps(): { readonly 'data-drop-delete': string };
};

export type { ActiveDrag, DndApi, DraggableDescriptor, DropTarget };
