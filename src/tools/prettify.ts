import Token from "../tokenization/token";
import tokenizeWgsl from "../tokenization/tokenize-wgsl";

// Helper function to check if a token is punctuation
function isPunctuation(token: Token): boolean {
    return token.type === 'operator' && /^[\(\)\{\}\[\],;:.]$/.test(token.value);
}

// Helper function to check if angle brackets are part of a type parameter
function isTypeAngleBracket(tokens: Token[], index: number): boolean {
    const token = tokens[index];
    
    // Only process angle brackets
    if (token.value !== '<' && token.value !== '>') {
        return false;
    }
    
    if (token.value === '<') {
        // Check if preceded by a type name
        const prevToken = index > 0 ? tokens[index - 1] : null;
        return prevToken && (prevToken.type === 'identifier' || prevToken.type === 'builtin');
    } else {
        // For '>', check if it's closing a type angle bracket
        let depth = 1;
        for (let i = index - 1; i >= 0; i--) {
            if (tokens[i].value === '<') depth--;
            if (tokens[i].value === '>') depth++;
            
            if (depth === 0) {
                // Found the matching '<', check if it's part of a type
                return i > 0 && (tokens[i - 1].type === 'identifier' || tokens[i - 1].type === 'builtin');
            }
        }
    }
    
    return false;
}

export default function prettify(code: string): string {
    const formattedLines: string[] = [];
    let currentLevel = 0; // Indentation level
    let inStructDefinition = false; // Track if inside a struct definition
    let inForLoop = false; // Track if inside a for loop initialization

    // Tokenize the code
    const tokens = tokenizeWgsl(code);
    
    // Process tokens and format the code
    let line = '';
    let i = 0;
    
    while (i < tokens.length) {
        const token = tokens[i];
        const nextToken = i + 1 < tokens.length ? tokens[i + 1] : null;
        const prevToken = i > 0 ? tokens[i - 1] : null;

        // Handle for loop detection
        if (token.type === 'keyword' && token.value === 'for') {
            inForLoop = true;
        } else if (inForLoop && token.value === ')') {
            inForLoop = false;
        }

        // Handle comments separately
        if (token.type === 'comment') {
            // Check if it's a multi-line comment
            if (token.value.startsWith('/*')) {
                // Format multi-line comments by normalizing indentation
                const lines = token.value.split('\n');
                if (lines.length > 1) {
                    // Add the first line
                    formattedLines.push('    '.repeat(currentLevel) + lines[0].trim());
                    
                    // For middle lines, preserve relative indentation but normalize it
                    for (let j = 1; j < lines.length - 1; j++) {
                        const lineContent = lines[j].trim();
                        formattedLines.push('    '.repeat(currentLevel) + '   ' + lineContent);
                    }
                    
                    // For the last line, which has the closing */
                    if (lines.length > 1) {
                        const lastLine = lines[lines.length - 1].trim();
                        formattedLines.push('    '.repeat(currentLevel) + '   ' + lastLine);
                    }
                } else {
                    formattedLines.push('    '.repeat(currentLevel) + token.value);
                }
            } else {
                // Single-line comments
                formattedLines.push('    '.repeat(currentLevel) + token.value);
            }
            i++;
            continue;
        }

        // Define token types for easier reference
        const isKeyword = token.type === 'keyword';
        const isIdentifier = token.type === 'identifier' || token.type === 'builtin';
        const isAttribute = token.type === 'attribute';
        const isOperator = token.type === 'operator' && !isPunctuation(token);
        const isNextOperator = nextToken?.type === 'operator' && !isPunctuation(nextToken);
        const isNextPunctuation = nextToken ? isPunctuation(nextToken) : false;

        // Add the token to the current line
        line += token.value;

        // Handle special spacing cases
        if (nextToken) {
            // Special case 1: Always add space after comma or semicolon in for loops
            if ((token.value === ',' || (token.value === ';' && inForLoop))) {
                line += ' ';
            }
            // Special case 2: No spaces for type angle brackets
            else if ((token.value === '<' && isTypeAngleBracket(tokens, i)) || 
                     (token.value === '>' && isTypeAngleBracket(tokens, i)) ||
                     (nextToken.value === '<' && isTypeAngleBracket(tokens, i + 1)) ||
                     (nextToken.value === '>' && isTypeAngleBracket(tokens, i + 1))) {
                // Don't add space
            }
            // Special case 3: No space before closing parentheses/brackets/braces
            else if (nextToken.value === ')' || nextToken.value === ']' || nextToken.value === '}') {
                // Don't add space before closing brackets
            }
            // Special case 4: No space before comma or semicolon
            else if (nextToken.value === ',' || nextToken.value === ';') {
                // Don't add space
            }
            // Special case 5: Handle colon in type annotations (position: vec3<f32>)
            else if (token.value === ':' || nextToken.value === ':') {
                // No space before colon, but add space after
                if (token.value === ':') {
                    line += ' ';
                }
                // No space should be added before a colon
            }
            // Special case 6: No space after opening parentheses for control structures
            else if ((token.value === 'if' || token.value === 'for' || token.value === 'while') && 
                     nextToken && nextToken.value === '(') {
                // No space between if/for/while and opening parenthesis
            }
            // General spacing logic
            else {
                const isKeyword = token.type === 'keyword';
                const isIdentifier = token.type === 'identifier' || token.type === 'builtin';
                const isAttribute = token.type === 'attribute';
                const isOperator = token.type === 'operator' && !isPunctuation(token);
                const isNextOperator = nextToken.type === 'operator' && !isPunctuation(nextToken);
                const isNextPunctuation = isPunctuation(nextToken);

                if (
                    ((isKeyword || isIdentifier || isAttribute) && 
                    !(isNextPunctuation && ['(', '['].includes(nextToken.value))) ||
                    // Always add space before { after an identifier or keyword
                    (nextToken.value === '{') ||
                    (token.value === ':' && (nextToken.type === 'identifier' || nextToken.type === 'keyword' || nextToken.type === 'builtin')) ||
                    (token.value === ')' && nextToken.value === '{') ||
                    (isOperator && !isNextOperator) ||
                    (!isOperator && isNextOperator && 
                     !(nextToken.value === '<' && isTypeAngleBracket(tokens, i + 1)))
                ) {
                    line += ' ';
                }
            }
        }

        // Handle line breaks and indentation
        if ((token.value === ';' && !inForLoop) || (inStructDefinition && token.value === ',')) {
            formattedLines.push('    '.repeat(currentLevel) + line.trim());
            line = '';
        } else if (token.value === '{') {
            formattedLines.push('    '.repeat(currentLevel) + line.trim());
            line = '';
            currentLevel++;
            if ((i > 0 && tokens[i - 1].value === 'struct') || 
                (i > 1 && tokens[i - 2].value === 'struct')) {
                inStructDefinition = true;
            }
        } else if (token.value === '}') {
            currentLevel = Math.max(currentLevel - 1, 0);
            formattedLines.push('    '.repeat(currentLevel) + line.trim());
            line = '';
            
            // Handle struct or other definition ending with };
            if (nextToken && nextToken.value === ';') {
                // For struct definitions, put the }; on the same line
                formattedLines[formattedLines.length - 1] = formattedLines[formattedLines.length - 1].replace(/}$/, '};');
                i++; // Skip the semicolon
                if (inStructDefinition) {
                    inStructDefinition = false;
                }
            }
        }

        i++;
    }

    // Add any remaining line
    if (line.trim()) {
        formattedLines.push('    '.repeat(currentLevel) + line.trim());
    }

    return formattedLines.join('\n');
}