/**
 * Thin seam over Bun's native markdown parser.
 *
 * `Bun.markdown` ships with Bun 1.4 (marked unstable upstream) and is the
 * reason the documentation needs no parser dependency: `html()` converts a
 * markdown string into an HTML fragment with GitHub-flavoured tables,
 * strikethrough and task lists. The installed `bun-types` does not declare the
 * API yet, so the one surface this app uses is typed here once instead of
 * being cast at every call site.
 */

type MarkdownOptions = {
	readonly headings?: boolean;
	readonly tagFilter?: boolean;
};

type MarkdownModule = {
	readonly html: (markdown: string, options?: MarkdownOptions) => string;
};

const bunMarkdown = (Bun as unknown as { readonly markdown: MarkdownModule }).markdown;

/**
 * Render markdown to an HTML fragment.
 *
 * `headings: true` gives every heading a stable id and wraps its text in an
 * anchor to that id, so titles are selectable links like on any documentation
 * site. `tagFilter` strips raw disallowed HTML tags (script, style, ...) from
 * the source, so authored markdown can never inject markup into the page
 * shell.
 */
function markdownToHtml(markdown: string): string {
	return bunMarkdown.html(markdown, { headings: true, tagFilter: true });
}

export { markdownToHtml };
