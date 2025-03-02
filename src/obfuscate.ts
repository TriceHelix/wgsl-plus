import minify from "./minify";

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

	// WGSL keywords that should not be renamed
	const keywords = new Set([
		// Type-defining keywords (33)
		"array", "atomic", "bool", "f32", "f16", "i32", "mat2x2", "mat2x3", "mat2x4",
		"mat3x2", "mat3x3", "mat3x4", "mat4x2", "mat4x3", "mat4x4", "ptr", "sampler",
		"sampler_comparison", "texture_1d", "texture_2d", "texture_2d_array", "texture_3d",
		"texture_cube", "texture_cube_array", "texture_multisampled_2d", "texture_storage_1d",
		"texture_storage_2d", "texture_storage_2d_array", "texture_storage_3d", "u32",
		"vec2", "vec3", "vec4",
		// Other keywords (24)
		"alias", "bitcast", "break", "case", "const", "continue", "continuing", "default",
		"discard", "else", "enable", "false", "fn", "for", "if", "let", "loop", "return",
		"struct", "switch", "true", "type", "var", "while",
	]);

	// Regular expressions for token matching
	const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*/;
	const numberRegex = /^[0-9]+(\.[0-9]*)?f?/;
	const stringRegex = /^"[^"]*"/;
	const operatorRegex = /^(?:<<=|>>=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|<<|>>|<=|>=|==|!=|&&|\|\||[-+*/%&|^~!<>=(){}[\],;:.@])/;
	const commentRegex = /^\/\/.*|^\/\*[\s\S]*?\*\//;
	const whitespaceRegex = /^\s+/;
	const directiveRegex = /^#binding\s+"([^"]+)"/;

	while (index < code.length) {
		const slice = code.slice(index);
		let match: RegExpExecArray | null;

		// Skip whitespace
		if ((match = whitespaceRegex.exec(slice))) {
			index += match[0].length;
			continue;
		}

		// Skip comments
		if ((match = commentRegex.exec(slice))) {
			index += match[0].length;
			continue;
		}

		// Handle #binding directives
		if ((match = directiveRegex.exec(slice))) {
			tokens.push({ type: "directive", value: match[0] });
			index += match[0].length;
			continue;
		}

		// Strings
		if ((match = stringRegex.exec(slice))) {
			tokens.push({ type: "string", value: match[0] });
			index += match[0].length;
			continue;
		}

		// Numbers
		if ((match = numberRegex.exec(slice))) {
			tokens.push({ type: "number", value: match[0] });
			index += match[0].length;
			continue;
		}

		// Identifiers and keywords
		if ((match = identifierRegex.exec(slice))) {
			const value = match[0];
			const type = keywords.has(value) ? "keyword" : "identifier";
			tokens.push({ type, value });
			index += match[0].length;
			continue;
		}

		// Operators and punctuation
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
 * @returns An obfuscated name (e.g., "_x0").
 */
function generateObfuscatedName(index: number): string {
	return `_x${index.toString(36)}`;
}

/**
 * Obfuscates WGSL code by renaming identifiers and handling bindings.
 * @param code The WGSL source code to obfuscate.
 * @returns The obfuscated and minified code with binding comments.
 */
export default function obfuscate(code: string): string {
	const tokens = tokenizeWGSL(code);
	const identifierMap = new Map<string, string>();
	const bindingMap = new Map<string, string>();
	let obfuscatedIndex = 0;

	// First pass: Collect identifiers and bindings
	for (const token of tokens) {
		if (token.type === "identifier" && !identifierMap.has(token.value)) {
			const newName = generateObfuscatedName(obfuscatedIndex++);
			identifierMap.set(token.value, newName);
		} else if (token.type === "directive") {
			const match = token.value.match(/^#binding\s+"([^"]+)"/);
			if (match) {
				const bindingName = match[1];
				if (!identifierMap.has(bindingName)) {
					const newName = generateObfuscatedName(obfuscatedIndex++);
					identifierMap.set(bindingName, newName);
				}
				bindingMap.set(bindingName, identifierMap.get(bindingName)!);
			}
		}
	}

	// Second pass: Replace identifiers and remove directives
	const obfuscatedTokens: Token[] = [];
	for (const token of tokens) {
		if (token.type === "identifier") {
			token.value = identifierMap.get(token.value) || token.value;
			obfuscatedTokens.push(token);
		} else if (token.type !== "directive") {
			obfuscatedTokens.push(token);
		}
	}

	// Reconstruct the obfuscated code with spacing
	let obfuscatedCode = "";
	for (let i = 0; i < obfuscatedTokens.length; i++) {
		const token = obfuscatedTokens[i];
		obfuscatedCode += token.value;
		// Add space if next token needs it (e.g., after keywords or identifiers)
		const nextToken = i + 1 < obfuscatedTokens.length ? obfuscatedTokens[i + 1] : null;
		if (
			nextToken &&
			(token.type === "keyword" || token.type === "identifier") &&
			nextToken.type !== "operator"
		) {
			obfuscatedCode += " ";
		}
	}

	// Minify the obfuscated code (assuming minify is defined)
	// const minifiedCode = minify(obfuscatedCode);
	const minifiedCode = obfuscatedCode;

	// Generate binding mapping comments
	const bindingComments = Array.from(bindingMap.entries())
		.map(([oldName, newName]) => `//#!binding ${oldName} ${newName}`)
		.join("\n");

	// Combine comments and minified code
	return bindingComments ? `${bindingComments}\n${minifiedCode}` : minifiedCode;
}