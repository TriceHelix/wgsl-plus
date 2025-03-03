import Token from "../token";
import swizzles from "./swizzles";

export default function replaceIdentifiers(tokens: Token[], identifierMap: Map<string, string>, structMemberMap: Map<string, string>) {
    const obfuscatedTokens: Token[] = [];
    let inStructDefinition = false;

    // Common vector swizzle patterns to preserve
    // const swizzles = new Set(["x", "y", "z", "w", "xy", "xz", "yz", "xyz", "xyzw"]);

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token.type === "keyword" && token.value === "struct") {
            inStructDefinition = true;
            obfuscatedTokens.push(token);
            continue;
        }
        if (inStructDefinition && token.value === "}") {
            inStructDefinition = false;
            obfuscatedTokens.push(token);
            continue;
        }

        if (token.type === "identifier") {
            // Inside struct definition, before a colon
            if (inStructDefinition && i + 1 < tokens.length && tokens[i + 1].value === ":") {
                const newValue = structMemberMap.get(token.value);
                if (newValue) {
                    obfuscatedTokens.push({ ...token, value: newValue });
                } else {
                    obfuscatedTokens.push(token);
                }
            }
            // After a dot, preserve swizzles unless explicitly a struct member in a known struct context
            else if (i > 0 && tokens[i - 1].value === ".") {
                if (structMemberMap.has(token.value) && !swizzles.has(token.value)) {
                    obfuscatedTokens.push({ ...token, value: structMemberMap.get(token.value)! });
                } else {
                    obfuscatedTokens.push(token); // Preserve swizzles or unmapped identifiers
                }
            }
            // Top-level identifier
            else {
                const newValue = identifierMap.get(token.value);
                if (newValue) {
                    obfuscatedTokens.push({ ...token, value: newValue });
                } else {
                    obfuscatedTokens.push(token);
                }
            }
        } 
		else if (token.type === "builtin" || token.type !== "directive") {
            // Preserve builtins and pass through non-directive tokens
            obfuscatedTokens.push(token);
        }
		else if (token.type !== "directive") {
            obfuscatedTokens.push(token);
        }
    }

    return obfuscatedTokens;
}