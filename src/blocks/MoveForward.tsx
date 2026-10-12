import { ArrowBigRight } from 'lucide';
import Lucide from '../components/Lucide';
import BlockShell from './BlockShell';
import { messages } from '../lib/i18n';

function MoveForward({ grayed = false }: { readonly grayed?: boolean } = {}) {
	return (
		<BlockShell variant={grayed ? 'gray' : 'sky'}>
			<>
				{messages.block_move_forward_label()}
				<Lucide icon={ArrowBigRight} class='ml-1 size-6' />
			</>
		</BlockShell>
	);
}

export default MoveForward;
