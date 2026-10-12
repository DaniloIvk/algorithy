import { Link } from '../lib/router';
import { messages } from '../lib/i18n';

function NotFound() {
	return (
		<div class='flex min-h-screen w-full flex-col items-center-safe justify-center-safe gap-4 p-8 text-center'>
			<title>{messages.not_found_document_title()}</title>
			<h1 class='text-6xl font-bold'>404</h1>
			<p class='text-content/70'>{messages.not_found_message()}</p>
			<Link href='/' class='underline hover:opacity-80 active:opacity-60'>
				{messages.not_found_go_home()}
			</Link>
		</div>
	);
}

export default NotFound;
