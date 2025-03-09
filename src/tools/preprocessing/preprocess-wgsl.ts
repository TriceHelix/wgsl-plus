import { Macro } from './types';
import { processConditionals } from './conditional-processor';

/**
 * Preprocesses WGSL code, handling C-like preprocessor directives:
 * #define, #undef, #if, #ifdef, #ifndef, #elif, #else, and #endif
 * 
 * @param code The WGSL source code
 * @returns The preprocessed WGSL code
 */
export default function preprocessWgsl(code: string): string {
	// Map to store defined macros
	const defines: Map<string, Macro> = new Map();

	// Split code into lines for preprocessing
	const lines = code.split("\n");

	// Process conditionals and directives
	const resultLines = processConditionals(lines, defines);

	// Clean up excessive empty lines
	const cleanedLines: string[] = [];
	let previousLineEmpty = false;

	for (const line of resultLines) {
		const isLineEmpty = line.trim() === '';

		// Skip consecutive empty lines
		if (isLineEmpty && previousLineEmpty) {
			continue;
		}

		cleanedLines.push(line);
		previousLineEmpty = isLineEmpty;
	}

	// Remove trailing empty lines
	while (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1].trim() === '') {
		cleanedLines.pop();
	}

	return cleanedLines.join('\n');
}