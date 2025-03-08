import collectDeclaredIdentifiersAndEntryPoints from "./collect-declared-identifiers-and-entry-points";
import collectStructNames from "./collect-struct-names";
import Token from "../../tokenization/token";
import tokenizeWgsl from "../../tokenization/tokenize-wgsl";
import replaceIdentifiers from "./replace-identifiers";
import reconstructObfuscatedCode from "./reconstruct-obfuscated-code";
import { resetNameIndex } from "./next-name";

/**
 * Obfuscates WGSL code by renaming explicitly declared functions, variables, structs, and function parameters,
 * as well as struct members, while preserving vector swizzles and entry point names.
 * @param code The WGSL source code to obfuscate.
 * @returns The obfuscated and minified code with binding comments.
 */
export default function obfuscate(code: string): string {

	resetNameIndex();

	// Get all the tokens.
	const tokens = tokenizeWgsl(code).filter(token => token.type !== "comment");

	// Preliminary pass: Collect struct member names
	let structMemberMap = collectStructNames(tokens);

	// First pass: Collect declared identifiers and entry points
	let {identifierMap, bindingMap} = collectDeclaredIdentifiersAndEntryPoints(tokens);

	// Second pass: Replace identifiers with context-aware logic
	const obfuscatedTokens: Token[] = replaceIdentifiers(tokens, identifierMap, structMemberMap);

	// Reconstruct the obfuscated code with corrected spacing
	let obfuscatedCode = reconstructObfuscatedCode(obfuscatedTokens, tokens);

	// Generate binding mapping comments
	const bindingComments = Array.from(bindingMap.entries())
		.map(([oldName, newName]) => `//#!binding ${oldName} ${newName}`)
		.join("\n");

	return bindingComments ? `${bindingComments}\n${obfuscatedCode}` : obfuscatedCode;
}