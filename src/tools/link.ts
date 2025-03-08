import path from "path";
import * as fs from 'fs';

// Process a WGSL file, resolving #include directives recursively
function getIncludedLines(filePath: string, processing: Set<string>, includedLines: string[]): void {
	const absolutePath = path.resolve(filePath);

	// Detect circular dependencies
	if (processing.has(absolutePath)) {
		throw new Error(`Circular dependency detected: ${absolutePath}`);
	}

	// Check if file exists
	if (!fs.existsSync(absolutePath)) {
		throw new Error(`File not found: ${absolutePath}`);
	}

	processing.add(absolutePath);
	const content = fs.readFileSync(absolutePath, 'utf-8');
	const lines = content.split('\n');

	for (const line of lines) {
		const match = line.match(/^#include\s+"(.+)"\s*$/);
		if (match) {
			const includePath = match[1];
			const relativePath = path.resolve(path.dirname(absolutePath), includePath);
			if (!fs.existsSync(relativePath)) {
				throw new Error(`Linked file not found: ${includePath} in ${absolutePath}`);
			}
			getIncludedLines(relativePath, processing, includedLines);
		} else {
			includedLines.push(line);
		}
	}

	processing.delete(absolutePath);
}

export default function link(importFiles: string[]): string {
	const processing = new Set<string>();
	const includedLines: string[] = [];
	for (const importFile of importFiles) {
		getIncludedLines(importFile, processing, includedLines);
	}
	return includedLines.join('\n');
}