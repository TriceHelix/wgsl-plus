let index = 0;

/**
 * Generates a simple obfuscated name based on an index.
 * @returns An obfuscated name (e.g., "_0").
 */
export default function nextName(): string {
	return `_${(index++).toString(36)}`;
}

export function resetNameIndex(){
	index = 0;
}