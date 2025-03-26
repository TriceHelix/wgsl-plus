import Token from '../tokenization/token.d.ts';
import tokenizeWgsl from '../tokenization/tokenize-wgsl.ts';

// Main minification function
export default function minify(code: string): string {
    // Use the comprehensive tokenizer from the obfuscator
    const tokens = tokenizeWgsl(code).filter(token => token.type !== 'comment');
    let output = '';
    
    // First pass: identify struct definitions to remove trailing semicolons
    // Looking for pattern: struct [identifier] { ... };
    const skipIndices = new Set();
    
    // Find struct definitions and mark their trailing semicolons for removal
    for (let i = 0; i < tokens.length - 2; i++) {
        // Find struct keyword
        if (tokens[i].type === 'keyword' && tokens[i].value === 'struct') {
            // Look for the closing pattern: }; (closing brace followed by semicolon)
            for (let j = i + 3; j < tokens.length - 1; j++) {
                if (tokens[j].type === 'operator' && tokens[j].value === '}' &&
                    tokens[j+1].type === 'operator' && tokens[j+1].value === ';') {
                    // Mark the semicolon for removal
                    skipIndices.add(j+1);
                    break;
                }
            }
        }
    }

    // Reconstruct the code, inserting spaces where necessary
    for (let i = 0; i < tokens.length; i++) {
        // Skip tokens marked for removal
        if (skipIndices.has(i)) {
            continue;
        }

        // Check if a space is needed before the current token
        if (i > 0) {
            const t1 = tokens[i - 1];
            const t2 = tokens[i];
            
            if (needsSpace(t1, t2)) {
                output += ' ';
            }
        }
        // Append the token's value
        output += tokens[i].value;
    }

    return output;
}

// Helper function to check if a token is identifier-like (identifier, keyword, or builtin)
function isIdentifierLike(token: Token): boolean {
    return token.type === 'identifier' || token.type === 'keyword' || token.type === 'builtin';
}

// Helper function to check if two tokens need a space between them
function needsSpace(t1: Token, t2: Token): boolean {
    // Between identifier-like tokens or between identifier-like and number
    if ((isIdentifierLike(t1) && isIdentifierLike(t2)) ||
        (isIdentifierLike(t1) && t2.type === 'number')) {
        return true;
    }
    
    // Special case for attributes:
    // Add space after standalone attributes (like @fragment) before keywords/identifiers
    // But don't add space after attributes with parameters (like @location(0))
    if (t1.type === 'attribute' && isIdentifierLike(t2)) {
        // Check if the attribute has parameters (contains opening parenthesis)
        const hasParameters = t1.value.includes('(');
        // Only add space for standalone attributes without parameters
        return !hasParameters;
    }
    
    return false;
}