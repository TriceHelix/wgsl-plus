import { Macro } from './types.d.ts';

/**
 * Expands macros in a line of code
 */
export function expandMacros(line: string, defines: Map<string, Macro>): string {
	// Extract and protect string literals
	const stringLiterals: string[] = [];
	let inString = false;
	let stringChar = '';
	let escaped = false;
	let currentString = '';
	let protectedLine = '';
	
	// Parse through the line character by character, protecting strings
	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		
		if (escaped) {
			// This character is escaped
			if (inString) {
				currentString += char;
			} else {
				protectedLine += char;
			}
			escaped = false;
			continue;
		}
		
		if (char === '\\') {
			// Escape character
			if (inString) {
				currentString += char;
			} else {
				protectedLine += char;
			}
			escaped = true;
			continue;
		}
		
		if ((char === '"' || char === "'") && (!inString || char === stringChar)) {
			if (inString) {
				// End of string
				currentString += char;
				stringLiterals.push(currentString);
				protectedLine += `###STRING_LITERAL_${stringLiterals.length - 1}###`;
				currentString = '';
				inString = false;
			} else {
				// Start of string
				inString = true;
				stringChar = char;
				currentString = char;
			}
			continue;
		}
		
		if (inString) {
			currentString += char;
		} else {
			protectedLine += char;
		}
	}
	
	// Handle unclosed string (shouldn't happen with valid code)
	if (inString) {
		stringLiterals.push(currentString);
		protectedLine += `###STRING_LITERAL_${stringLiterals.length - 1}###`;
	}
	
	// Process macros on the protected line
	let result = protectedLine;
	let changed = true;
	let iterationCount = 0;
	const MAX_ITERATIONS = 100;  // Prevent infinite expansion loops

	// Build a sorted list of macros to process, longer names first to avoid partial replacements
	const sortedMacros = Array.from(defines.entries())
		.sort((a, b) => b[0].length - a[0].length);

	// Iterate until no more expansions are possible or we reach max iterations
	while (changed && iterationCount < MAX_ITERATIONS) {
		changed = false;
		iterationCount++;
		
		// Process each macro
		for (const [name, macro] of sortedMacros) {
			if (!macro.params) {
				// Special handling for standalone "X is defined" pattern
				// Only apply this to complete lines that match exactly this pattern
				const isDefinedRegex = new RegExp(`^\\s*${name}\\s+is\\s+defined\\s*$`);
				const isDefinedInPreprocessorRegex = new RegExp(`^\\s*${name}\\s+is\\s+defined\\s*(//.*)?$`);
				
				if (isDefinedRegex.test(result) || isDefinedInPreprocessorRegex.test(result)) {
					continue;
				}
				
				// Special case for single-letter macros
				if (name.length === 1 && /^[A-Za-z]$/.test(name)) {
					// For single letters, we need a more specific pattern to handle cases like "2A"
					// Match when: at start of text, after space/punctuation, or after a digit
					const regex = new RegExp(`(^|[^A-Za-z0-9_]|[0-9])(${name})(?![A-Za-z0-9_])`, "g");
					const newResult = result.replace(regex, (match, prefix, target) => {
						changed = true;
						return prefix + macro.value;
					});
					if (newResult !== result) {
						result = newResult;
					}
				} else {
					// Standard case - only replace when it's a complete identifier
					const regex = new RegExp(`\\b${name}\\b`, "g");
					const newResult = result.replace(regex, () => {
						changed = true;
						return macro.value;
					});
					if (newResult !== result) {
						result = newResult;
						// Restart processing with newly expanded macros
						break;
					}
				}
			} else {
				// Function-like macro
				const functionLikeRegex = new RegExp(`\\b${name}\\s*\\(`, "g");
				let match;
				let lastIndex = 0;
				let newResult = "";
				let functionMacroChanged = false;

				while ((match = functionLikeRegex.exec(result)) !== null) {
					const startIndex = match.index;
					const openParenIndex = startIndex + match[0].length - 1;

					// Extract arguments
					const args: string[] = [];
					let currentArg = "";
					let parenDepth = 1;
					let i = openParenIndex + 1;

					while (i < result.length && parenDepth > 0) {
						if (result[i] === "(") {
							parenDepth++;
							currentArg += result[i];
						} else if (result[i] === ")") {
							parenDepth--;
							if (parenDepth === 0) {
								// End of arguments
								if (currentArg.trim() || args.length > 0 || macro.params.length === 1) {
									args.push(currentArg.trim());
								}
							} else {
								currentArg += result[i];
							}
						} else if (result[i] === "," && parenDepth === 1) {
							args.push(currentArg.trim());
							currentArg = "";
						} else {
							currentArg += result[i];
						}

						i++;
					}

					if (args.length !== macro.params.length) {
						throw new Error(`Macro ${name} expects ${macro.params.length} arguments, got ${args.length}`);
					}

					// Perform argument substitution
					let expansion = macro.value;
					for (let j = 0; j < macro.params.length; j++) {
						const paramRegex = new RegExp(`\\b${macro.params[j]}\\b`, "g");
						expansion = expansion.replace(paramRegex, args[j]);
					}

					// Add to the result
					newResult += result.substring(lastIndex, startIndex) + expansion;
					lastIndex = i;
					functionMacroChanged = true;

					// Update the regex's lastIndex to avoid matching within the expansion
					functionLikeRegex.lastIndex = i;
				}

				if (functionMacroChanged) {
					newResult += result.substring(lastIndex);
					result = newResult;
					changed = true;
					// Restart processing with newly expanded macros
					break;
				}
			}
		}
	}

	if (iterationCount >= MAX_ITERATIONS) {
		console.warn("Maximum macro expansion iterations reached. Possible recursive macro definition.");
	}
	
	// Restore string literals
	for (let i = 0; i < stringLiterals.length; i++) {
		result = result.replace(`###STRING_LITERAL_${i}###`, stringLiterals[i]);
	}
	
	return result;
}