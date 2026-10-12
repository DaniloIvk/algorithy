function columnLetter(index: number): string {
	if (Number.isInteger(index) === false || index < 0 || index >= 26) {
		throw new Error(`columnLetter: index ${index} out of range 0..25`);
	}

	return String.fromCharCode(65 + index);
}

export { columnLetter };
