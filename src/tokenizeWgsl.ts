import Token from "./token";
import { wgslBuiltins, wgslKeywords } from "./wgsl-tokens";

export default function tokenizeWgsl(code: string): Token[] {
	const tokens: Token[] = [];
	let index = 0;

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
            const type = wgslKeywords.has(value) ? "keyword" : 
                         wgslBuiltins.has(value) ? "builtin" : "identifier";
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