import nextName from './next-name.ts';
import Token from '../../tokenization/token.d.ts';
import swizzles from './swizzles.ts';

/**
 * Checks if an identifier could be a vector swizzle.
 * @param name The identifier to check.
 * @returns True if it consists only of 'x', 'y', 'z', 'w' and is 1-4 characters long.
 */
function isPotentialSwizzle(name: string): boolean {
	if (name.length < 1 || name.length > 4) return false;
	for (let char of name) {
		if (!swizzles.has(char)) return false;
	}
	return true;
}

export default function collectStructNames(tokens: Token[]): Map<string, string> {
	const structMemberMap = new Map<string, string>(); // For struct member names

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (token.type === "keyword" && token.value === "struct") {
			i += 2;
			while (i < tokens.length && tokens[i].value !== "}") {
				if (
					tokens[i].type === "identifier" &&
					i + 1 < tokens.length &&
					tokens[i + 1].value === ":"
				) {
					const memberName = tokens[i].value;
					if (!isPotentialSwizzle(memberName) && !structMemberMap.has(memberName)) {
						structMemberMap.set(memberName, nextName());
					}
				}
				i++;
			}
		}
	}

	return structMemberMap;
}