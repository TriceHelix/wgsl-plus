import wgslKeywords from "./wgsl-keywords";

// Define a token structure
interface Token {
	type: string;
	value: string;
}

/**
 * Tokenizes WGSL code into a list of tokens.
 * @param code The WGSL source code.
 * @returns An array of tokens.
 */
function tokenizeWGSL(code: string): Token[] {
	const tokens: Token[] = [];
	let index = 0;

	// Regular expressions for token matching
	const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*/;
	const numberRegex = /^(?:0[xX][0-9a-fA-F]+[uif]?|[0-9]+(\.[0-9]+)?[uif]?|[0-9]*\.[0-9]+[f]?)/;
	const stringRegex = /^"[^"]*"/;
	const operatorRegex = /^(?:<<=|>>=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|<<|>>|<=|>=|==|!=|&&|\|\||[-+*/%&|^~!<>=(){}[\],;:.@])/;
	const commentRegex = /^\/\/.*|^\/\*[\s\S]*?\*\//;
	const whitespaceRegex = /^\s+/;
	// Updated to match any #word "string" directive (both #binding and #entrypoint)
	const directiveRegex = /^#(\w+)\s+"([^"]+)"/;
	const attributeRegex = /^@(?:[a-zA-Z_][a-zA-Z0-9_]*)(?:\([^\)]*\))?/;

	while (index < code.length) {
		const slice = code.slice(index);
		let match: RegExpExecArray | null;

		if ((match = whitespaceRegex.exec(slice))) {
			index += match[0].length;
			continue;
		}
		if ((match = commentRegex.exec(slice))) {
			index += match[0].length;
			continue;
		}
		if ((match = directiveRegex.exec(slice))) {
			tokens.push({ type: "directive", value: match[0] });
			index += match[0].length;
			continue;
		}
		if ((match = stringRegex.exec(slice))) {
			tokens.push({ type: "string", value: match[0] });
			index += match[0].length;
			continue;
		}
		if ((match = numberRegex.exec(slice))) {
			tokens.push({ type: "number", value: match[0] });
			index += match[0].length;
			continue;
		}
		if ((match = attributeRegex.exec(slice))) {
			tokens.push({ type: "attribute", value: match[0] });
			index += match[0].length;
			continue;
		}
		if ((match = identifierRegex.exec(slice))) {
			const value = match[0];
			const type = wgslKeywords.has(value) ? "keyword" : "identifier";
			tokens.push({ type, value });
			index += match[0].length;
			continue;
		}
		if ((match = operatorRegex.exec(slice))) {
			tokens.push({ type: "operator", value: match[0] });
			index += match[0].length;
			continue;
		}

		throw new Error(`Unexpected character at position ${index}: ${code[index]}`);
	}

	return tokens;
}

/**
 * Generates a simple obfuscated name based on an index.
 * @param index The index to include in the name.
 * @returns An obfuscated name (e.g., "_0").
 */
function generateObfuscatedName(index: number): string {
	return `_${index.toString(36)}`;
}

/**
 * Obfuscates WGSL code by renaming explicitly declared functions, variables, structs, and function parameters,
 * while preserving entry point function names specified by #entrypoint directives or "main" if none are specified.
 * @param code The WGSL source code to obfuscate.
 * @returns The obfuscated and minified code with binding comments.
 */
export default function obfuscate(code: string): string {
	const tokens = tokenizeWGSL(code);
	const identifierMap = new Map<string, string>();
	const bindingMap = new Map<string, string>();
	const entryPointNames = new Set<string>(); // To store entry point function names
	let obfuscatedIndex = 0;

	// First pass: Collect declared identifiers and entry points
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (token.type === "directive") {
			const match = token.value.match(/^#(\w+)\s+"([^"]+)"/);
			if (match) {
				const directiveType = match[1];
				const name = match[2];
				if (directiveType === "binding") {
					if (!identifierMap.has(name)) {
						const newName = generateObfuscatedName(obfuscatedIndex++);
						identifierMap.set(name, newName);
					}
					bindingMap.set(name, identifierMap.get(name)!);
				} else if (directiveType === "entrypoint") {
					entryPointNames.add(name); // Add entry point name to preserve
				}
			}
		} else if (token.type === "keyword") {
			if (token.value === "fn" && i + 1 < tokens.length && tokens[i + 1].type === "identifier") {
				const funcName = tokens[i + 1].value;
				// Skip mapping if it's an entry point or if no entry points are specified and it's "main"
				if (!(entryPointNames.has(funcName) || (entryPointNames.size === 0 && funcName === "main"))) {
					if (!identifierMap.has(funcName)) {
						identifierMap.set(funcName, generateObfuscatedName(obfuscatedIndex++));
					}
				}
				i++;
				// Parse parameters (these still get obfuscated)
				if (i + 1 < tokens.length && tokens[i + 1].value === "(") {
					i += 2;
					while (i < tokens.length && tokens[i].value !== ")") {
						if (tokens[i].type === "identifier" && i + 1 < tokens.length && tokens[i + 1].value === ":") {
							const paramName = tokens[i].value;
							if (!identifierMap.has(paramName)) {
								identifierMap.set(paramName, generateObfuscatedName(obfuscatedIndex++));
							}
							i++;
						}
						i++;
					}
				}
			} else if (
				(token.value === "let" || token.value === "var" || token.value === "const") &&
				i + 1 < tokens.length &&
				tokens[i + 1].type === "identifier"
			) {
				const varName = tokens[i + 1].value;
				if (!identifierMap.has(varName)) {
					identifierMap.set(varName, generateObfuscatedName(obfuscatedIndex++));
				}
				i++;
			} else if (token.value === "struct" && i + 1 < tokens.length && tokens[i + 1].type === "identifier") {
				const structName = tokens[i + 1].value;
				if (!identifierMap.has(structName)) {
					identifierMap.set(structName, generateObfuscatedName(obfuscatedIndex++));
				}
				i++;
			}
		}
	}

	// Second pass: Replace identifiers and remove directives
	const obfuscatedTokens: Token[] = [];
	for (const token of tokens) {
		if (token.type === "identifier" && identifierMap.has(token.value)) {
			token.value = identifierMap.get(token.value)!;
			obfuscatedTokens.push(token);
		} else if (token.type !== "directive") {
			obfuscatedTokens.push(token);
		}
	}

	// Reconstruct the obfuscated code with corrected spacing
	let obfuscatedCode = "";
	for (let i = 0; i < obfuscatedTokens.length; i++) {
		const token = obfuscatedTokens[i];
		obfuscatedCode += token.value;
		const nextToken = i + 1 < obfuscatedTokens.length ? obfuscatedTokens[i + 1] : null;
		if (
			nextToken &&
			(token.type === "keyword" || token.type === "identifier" || token.type === "attribute") &&
			nextToken.type !== "operator"
		) {
			obfuscatedCode += " ";
		}
	}

	// Generate binding mapping comments
	const bindingComments = Array.from(bindingMap.entries())
		.map(([oldName, newName]) => `//#!binding ${oldName} ${newName}`)
		.join("\n");

	return bindingComments ? `${bindingComments}\n${obfuscatedCode}` : obfuscatedCode;
}