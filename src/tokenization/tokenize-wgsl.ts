import Token from './token.d.ts';
import { wgslBuiltins, wgslKeywords } from './wgsl-tokens.ts';

export default function tokenizeWgsl(code: string): Token[] {
	const tokens: Token[] = [];
	let index = 0;

	// Regex patterns (same as your obfuscator)
	const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*/;
	const numberRegex = /^(?:0[xX][0-9a-fA-F]+[uif]?|[0-9]+(\.[0-9]*)?[uif]?|[0-9]*\.[0-9]+[f]?)/;
	const stringRegex = /^"[^"]*"/;
	const operatorRegex = /^(?:<<=|>>=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|<<|>>|<=|>=|==|!=|&&|\|\||->|[-+*/%&|^~!<>=(){}[\],;:.@])/;
	const commentRegex = /^\/\/.*|^\/\*[\s\S]*?\*\//;
	const whitespaceRegex = /^\s+/;
	const directiveRegex = /^#(\w+)\s+"([^"]+)"/;
	const attributeRegex = /^@(?:[a-zA-Z_][a-zA-Z0-9_]*)(?:\((?:[^()]+|\([^()]*\))*\))?/;

	while (index < code.length) {
		const slice = code.slice(index);
		let match: RegExpExecArray | null = null;

		// Handle whitespace
		if ((match = whitespaceRegex.exec(slice))) {
			index += match[0].length;
			continue;
		}

		// Handle comments - preserve these as tokens for the prettifier
		if ((match = commentRegex.exec(slice))) {
			tokens.push({ type: "comment", value: match[0] });
			index += match[0].length;
			continue;
		}

		// Match other token types
		if ((match = directiveRegex.exec(slice))) {
			tokens.push({ type: "directive", value: match[0] });
		} else if ((match = attributeRegex.exec(slice))) {
			tokens.push({ type: "attribute", value: match[0] });
		} else if ((match = stringRegex.exec(slice))) {
			tokens.push({ type: "string", value: match[0] });
		} else if ((match = numberRegex.exec(slice))) {
			tokens.push({ type: "number", value: match[0] });
		} else if ((match = identifierRegex.exec(slice))) {
			const value = match[0];
			const type = wgslKeywords.has(value) ? "keyword" :
				wgslBuiltins.has(value) ? "builtin" : "identifier";
			tokens.push({ type, value });
		} else if ((match = operatorRegex.exec(slice))) {
			tokens.push({ type: "operator", value: match[0] });
		} else {
			// Handle unexpected characters
			tokens.push({ type: "unknown", value: slice[0] });
			index += 1;
			throw new Error(`Unexpected character: ${slice[0]}`);
		}

		if (match) {
			index += match[0].length;
		}
	}

	return tokens;
}