export default function prettify(code: string): string {
	const tokens: string[] = [];
	let index = 0;
	const formattedLines: string[] = [];
	let currentLevel = 0; // Indentation level
	let inStructDefinition = false; // Track if inside a struct definition

	// Regex patterns for tokenization
	const keywordRegex = /^(?:fn|let|var|const|if|else|for|while|return|struct|type|alias|bitcast|break|case|continue|continuing|default|discard|enable|false|loop|switch|true|type|var|while)\b/;
	const operatorRegex = /^(?:<<=|>>=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|<<|>>|<=|>=|==|!=|&&|\|\||->|[-+*/%&|^~!<>=])/; // -> as a single token
	const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*/;
	const numberRegex = /^(?:0[xX][0-9a-fA-F]+[uif]?|[0-9]+(\.[0-9]+)?[uif]?|[0-9]*\.[0-9]+[f]?)/;
	const stringRegex = /^"[^"]*"/;
	const attributeRegex = /^@(?:[a-zA-Z_][a-zA-Z0-9_]*)(?:\([^\)]*\))?/;
	const punctuationRegex = /^[\(\)\{\}\[\],;:.]/;
	const commentRegex = /^\/\/.*|^\/\*[\s\S]*?\*\//;

	// Step 1: Tokenize the code
	while (index < code.length) {
		const slice = code.slice(index);
		let match: RegExpExecArray | null = null;

		// Skip whitespace
		if ((match = /^\s+/.exec(slice))) {
			index += match[0].length;
			continue;
		}

		// Handle comments
		if ((match = commentRegex.exec(slice))) {
			tokens.push(match[0]);
			index += match[0].length;
			continue;
		}

		// Match other token types
		if ((match = attributeRegex.exec(slice))) {
			tokens.push(match[0]);
		} else if ((match = keywordRegex.exec(slice))) {
			tokens.push(match[0]);
		} else if ((match = operatorRegex.exec(slice))) {
			tokens.push(match[0]);
		} else if ((match = identifierRegex.exec(slice))) {
			tokens.push(match[0]);
		} else if ((match = numberRegex.exec(slice))) {
			tokens.push(match[0]);
		} else if ((match = stringRegex.exec(slice))) {
			tokens.push(match[0]);
		} else if ((match = punctuationRegex.exec(slice))) {
			tokens.push(match[0]);
		} else {
			tokens.push(slice[0]);
			index += 1;
			continue;
		}

		if (match) {
			index += match[0].length;
		}
	}

	// Step 2: Reconstruct with proper formatting
	let line = '';
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		const nextToken = i + 1 < tokens.length ? tokens[i + 1] : null;

		// Handle comments separately
		if (token.startsWith('//') || token.startsWith('/*')) {
			formattedLines.push('    '.repeat(currentLevel) + token);
			continue;
		}

		line += token;

		// Updated spacing logic
		if (nextToken) {
			const isKeyword = keywordRegex.test(token);
			const isIdentifier = identifierRegex.test(token);
			const isAttribute = attributeRegex.test(token);
			const isOperator = operatorRegex.test(token);
			const isNextOperator = operatorRegex.test(nextToken);
			const isPunctuation = punctuationRegex.test(token);
			const isNextPunctuation = punctuationRegex.test(nextToken);

			if (
				(isKeyword || isIdentifier || isAttribute) && // Space after keywords, identifiers, attributes
				!(isNextPunctuation && ['(', '{', '[', ';', ','].includes(nextToken)) || // Unless followed by certain punctuation
				(token === ':' && (identifierRegex.test(nextToken) || keywordRegex.test(nextToken))) || // Space after : in type annotations
				(token === ')' && nextToken === '{') || // Space before '{' after ')'
				(isOperator && !isNextOperator) || // Space after operators unless next is an operator
				(!isOperator && isNextOperator && nextToken !== '<') // Space before operators except '<' after identifiers
			) {
				line += ' ';
			}
		}

		// Handle line breaks and indentation
		if (token === ';' || (inStructDefinition && token === ',')) {
			formattedLines.push('    '.repeat(currentLevel) + line.trim());
			line = '';
		} else if (token === '{') {
			formattedLines.push('    '.repeat(currentLevel) + line.trim());
			line = '';
			currentLevel++;
			if (tokens[i - 1] === 'struct' || (i > 1 && tokens[i - 2] === 'struct')) {
				inStructDefinition = true; // Start struct body after {
			}
		} else if (token === '}') {
			currentLevel = Math.max(currentLevel - 1, 0);
			if (inStructDefinition && nextToken === ';') {
				line += ';';
				i++; // Skip the semicolon
				inStructDefinition = false;
			}
			formattedLines.push('    '.repeat(currentLevel) + line.trim());
			line = '';
		}
	}

	// Add any remaining line
	if (line.trim()) {
		formattedLines.push('    '.repeat(currentLevel) + line.trim());
	}

	return formattedLines.join('\n');
}