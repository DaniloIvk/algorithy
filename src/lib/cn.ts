function classNames(...values: readonly (string | boolean | null | undefined)[]) {
	return values
		.map((value) => (value ? String(value).trim() : null))
		.filter(Boolean)
		.join(' ');
}

export { classNames };
