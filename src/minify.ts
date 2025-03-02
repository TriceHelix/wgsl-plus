// Define the token structure
interface Token {
	type: 'identifier' | 'number' | 'string' | 'operator';
	value: string;
}

// Tokenization function to break code into tokens, skipping comments and whitespace
function tokenize(code: string): Token[] {
	const tokens: Token[] = [];
	let index = 0;

	// Regular expressions for token matching
	const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*/; // Identifiers and keywords
	const numberRegex = /^[0-9]+(\.[0-9]*)?f?/; // Simplified numbers (integers, floats with 'f')
	const stringRegex = /^"[^"]*"/; // String literals, no escape handling for simplicity
	const operatorRegex = /^(?:<<=|>>=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|<<|>>|<=|>=|==|!=|&&|\|\||[-+*/%&|^~!<>=(){}[\],;:.@])/; // Operators and punctuation
	const commentRegex = /^\/\/.*|^\/\*[\s\S]*?\*\//; // Single-line and multi-line comments
	const whitespaceRegex = /^\s+/; // Whitespace to skip

	while (index < code.length) {
		let match;

		// Skip whitespace
		if (match = whitespaceRegex.exec(code.slice(index))) {
			index += match[0].length;
			continue;
		}

		// Skip comments
		if (match = commentRegex.exec(code.slice(index))) {
			index += match[0].length;
			continue;
		}

		// Match string literals
		if (match = stringRegex.exec(code.slice(index))) {
			tokens.push({ type: 'string', value: match[0] });
			index += match[0].length;
			continue;
		}

		// Match numbers
		if (match = numberRegex.exec(code.slice(index))) {
			tokens.push({ type: 'number', value: match[0] });
			index += match[0].length;
			continue;
		}

		// Match identifiers
		if (match = identifierRegex.exec(code.slice(index))) {
			tokens.push({ type: 'identifier', value: match[0] });
			index += match[0].length;
			continue;
		}

		// Match operators and punctuation
		if (match = operatorRegex.exec(code.slice(index))) {
			tokens.push({ type: 'operator', value: match[0] });
			index += match[0].length;
			continue;
		}

		// If no match, throw an error for unexpected characters
		throw new Error(`Unexpected character at position ${index}: ${code[index]}`);
	}

	return tokens;
}

// Main minification function
export default function minify(code: string): string {
	// Get the list of tokens, excluding comments and unnecessary whitespace
	const tokens = tokenize(code);
	let output = '';

	// Reconstruct the code, inserting spaces where necessary
	for (let i = 0; i < tokens.length; i++) {
		// Check if a space is needed before the current token
		if (i > 0) {
			const t1 = tokens[i - 1];
			const t2 = tokens[i];
			// Insert space if both tokens are identifiers or if t1 is an identifier and t2 is a number
			if ((t1.type === 'identifier' && t2.type === 'identifier') ||
				(t1.type === 'identifier' && t2.type === 'number')) {
				output += ' ';
			}
		}
		// Append the token's value
		output += tokens[i].value;
	}

	return output;
}

// // Example usage
// const wgslCode = `
// 	// Define a variable
// 	let x = 1.0f; /* Set initial value */
// 	@vertex
// 	fn main() -> @location(0) vec4<f32> {
// 	  return vec4<f32>(x, 0.0, 0.0, 1.0);
// 	}
//   `;

// const minified = minifyWGSL(wgslCode);
// console.log(minified);
// // Output: let x=1.0f;@vertex fn main()->@location(0)vec4<f32>{return vec4<f32>(x,0.0,0.0,1.0);}