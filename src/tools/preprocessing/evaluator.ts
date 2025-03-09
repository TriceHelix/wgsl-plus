import { Macro } from './types';

/**
 * Evaluates a preprocessor conditional expression (whether conditions are true or false).
 */
export function evaluateExpression(expr: string, defines: Map<string, Macro>): boolean {
	// Replace defined() operator
	expr = expr.replace(/defined\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/g, (_, name) => {
		return defines.has(name) ? "1" : "0";
	});

	// Special case for common pattern: RENDERER == VULKAN where RENDERER="VULKAN" and VULKAN is undefined
	// First, collect all macros that expand to identifiers
	const macroValueToName = new Map<string, string>();
	for (const [name, macro] of defines.entries()) {
		if (!macro.params && macro.value && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(macro.value)) {
			macroValueToName.set(macro.value, name);
		}
	}

	// Detect and handle equality comparisons in a C preprocessor compatible way
	const equalityRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*==\s*([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
	let match;
	while ((match = equalityRegex.exec(expr)) !== null) {
		const [fullMatch, left, right] = match;
		
		const leftMacro = defines.get(left);
		const rightMacro = defines.get(right);
		
		// Case 1: Left is a defined macro with value equal to right (which is undefined)
		if (leftMacro && !leftMacro.params && leftMacro.value === right && !rightMacro) {
			expr = expr.replace(fullMatch, "1");
			continue;
		}
		
		// Case 2: Right is a defined macro with value equal to left (which is undefined)
		if (rightMacro && !rightMacro.params && rightMacro.value === left && !leftMacro) {
			expr = expr.replace(fullMatch, "1");
			continue;
		}
		
		// Case 3: Both are defined macros
		if (leftMacro && rightMacro && !leftMacro.params && !rightMacro.params) {
			// If both macros expand to the same value, it's true
			if (leftMacro.value === rightMacro.value) {
				expr = expr.replace(fullMatch, "1");
				continue;
			}
		}
	}

	// Replace undefined identifiers and function-like macros with 0
	expr = expr.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (match, identifier) => {
		const macro = defines.get(identifier);
		
		if (macro && !macro.params) {
			// For defined macros, use their value
			return macro.value || "0";
		} else {
			// For undefined identifiers or function-like macros without args
			return "0";
		}
	});

	// Process the expression to convert C-style operators to JavaScript
	expr = expr.replace(/(\s*)(!=|==|&&|\|\||!)(\s*)/g, (match, before, op, after) => {
		switch (op) {
			case '!=': return before + '!==' + after;
			case '==': return before + '===' + after;
			case '&&': return before + '&&' + after;
			case '||': return before + '||' + after;
			case '!': return before + '!' + after;
			default: return match;
		}
	});

	// For standalone numbers (not part of comparisons), treat non-zero as true
	if (/^\s*\d+\s*$/.test(expr)) {
		const val = parseInt(expr.trim(), 10);
		return val !== 0;
	}
	
	try {
		// Evaluate the expression directly
		return eval(expr) ? true : false;
	} catch (e) {
		// Log the error for debugging
		console.error(`Evaluation error for expression: "${expr}". ${e.message}`);
		return false; // Default to false on error
	}
}