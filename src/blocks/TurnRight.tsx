import { RotateCw } from 'lucide';
import Lucide from '../components/Lucide';
import BlockShell from './BlockShell';
import { messages } from '../lib/i18n';

function TurnRight({ grayed = false }: { readonly grayed?: boolean } = {}) {
	return (
		<BlockShell variant={grayed ? 'gray' : 'sky'}>
			<>
				{messages.block_turn_right_label()}
				<Lucide icon={RotateCw} class='ml-1 size-6' />
			</>
		</BlockShell>
	);
}

export default TurnRight;
