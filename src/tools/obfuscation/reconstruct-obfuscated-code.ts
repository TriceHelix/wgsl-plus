import Token from "../../tokenization/token";


export default function reconstructObfuscatedCode(obfuscatedTokens: Token[], tokens: Token[]): string{
	let obfuscatedCode = "";
	for (let i = 0; i < obfuscatedTokens.length; i++) {
		const token = obfuscatedTokens[i];
		obfuscatedCode += token.value;
		const nextToken = i + 1 < tokens.length ? obfuscatedTokens[i + 1] : null;
		if (
			nextToken &&
			(token.type === "keyword" || token.type === "identifier" || token.type === "attribute") &&
			nextToken.type !== "operator"
		) {
			obfuscatedCode += " ";
		}
	}

	return obfuscatedCode;
}