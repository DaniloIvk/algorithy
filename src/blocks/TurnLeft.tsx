import { RotateCcw } from 'lucide';
import Lucide from '../components/Lucide';
import BlockShell from './BlockShell';
import { messages } from '../lib/i18n';

function TurnLeft({ grayed = false }: { readonly grayed?: boolean } = {}) {
	return (
		<BlockShell variant={grayed ? 'gray' : 'sky'}>
			<>
				{messages.block_turn_left_label()}
				<Lucide icon={RotateCcw} class='ml-1 size-6' />
			</>
		</BlockShell>
	);
}

export default TurnLeft;
