import nextName from "./next-name";
import Token from "../token";

export default function collectDeclaredIdentifiersAndEntryPoints(tokens: Token[]): { identifierMap: Map<string, string>, bindingMap: Map<string, string> } {

	const identifierMap = new Map<string, string>(); // For top-level identifiers
	const bindingMap = new Map<string, string>();
	const entryPointNames = new Set<string>();

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (token.type === "directive") {
			const match = token.value.match(/^#(\w+)\s+"([^"]+)"/);
			if (match) {
				const directiveType = match[1];
				const name = match[2];
				if (directiveType === "binding") {
					if (!identifierMap.has(name)) {
						const newName = nextName();
						identifierMap.set(name, newName);
					}
					bindingMap.set(name, identifierMap.get(name)!);
				} else if (directiveType === "entrypoint") {
					entryPointNames.add(name);
				}
			}
		} else if (token.type === "keyword") {
			if (token.value === "fn" && i + 1 < tokens.length && tokens[i + 1].type === "identifier") {
				const funcName = tokens[i + 1].value;
				if (!(entryPointNames.has(funcName) || (entryPointNames.size === 0 && funcName === "main"))) {
					if (!identifierMap.has(funcName)) {
						identifierMap.set(funcName, nextName());
					}
				}
				i++;
				if (i + 1 < tokens.length && tokens[i + 1].value === "(") {
					i += 2;
					while (i < tokens.length && tokens[i].value !== ")") {
						if (
							tokens[i].type === "identifier" &&
							i + 1 < tokens.length &&
							tokens[i + 1].value === ":"
						) {
							const paramName = tokens[i].value;
							if (!identifierMap.has(paramName)) {
								identifierMap.set(paramName, nextName());
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
					identifierMap.set(varName, nextName());
				}
				i++;
			} else if (token.value === "struct" && i + 1 < tokens.length && tokens[i + 1].type === "identifier") {
				const structName = tokens[i + 1].value;
				if (!identifierMap.has(structName)) {
					identifierMap.set(structName, nextName());
				}
				i++;
			}
		}
	}

	return { identifierMap, bindingMap };
}