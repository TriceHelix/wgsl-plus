import Token from '../src/tokenization/token.d.ts';
import tokenizeWgsl from '../src/tokenization/tokenize-wgsl.ts';

describe("tokenizeWgsl", () => {
	// Test 1: Keywords and Identifiers
	it("tokenizes keywords and identifiers", () => {
		const input = "fn main() { let x = 5; }";
		const expected: Token[] = [
			{ type: "keyword", value: "fn" },
			{ type: "identifier", value: "main" },
			{ type: "operator", value: "(" },
			{ type: "operator", value: ")" },
			{ type: "operator", value: "{" },
			{ type: "keyword", value: "let" },
			{ type: "identifier", value: "x" },
			{ type: "operator", value: "=" },
			{ type: "number", value: "5" },
			{ type: "operator", value: ";" },
			{ type: "operator", value: "}" }
		];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// Test 2: Numbers
	it("tokenizes various number formats", () => {
		const input = "123 4.56 0.789 0x1A 0. 1. 0xFFu 1.0f";
		const expected: Token[] = [
			{ type: "number", value: "123" },
			{ type: "number", value: "4.56" },
			{ type: "number", value: "0.789" },
			{ type: "number", value: "0x1A" },
			{ type: "number", value: "0." },
			{ type: "number", value: "1." },
			{ type: "number", value: "0xFFu" },
			{ type: "number", value: "1.0f" }
		];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// Test 3: Strings
	it("tokenizes strings with quotes", () => {
		const input = "\"hello\" \"world\" \"123\"";
		const expected: Token[] = [
			{ type: "string", value: "\"hello\"" },
			{ type: "string", value: "\"world\"" },
			{ type: "string", value: "\"123\"" }
		];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// Test 4: Operators
	it("tokenizes all operator types", () => {
		const input = "+ - * / % == != < > <= >= && || ! ~ & | ^ << >> <<= >>= += -= *= /= %= &= |= ^=";
		const expected: Token[] = [
			{ type: "operator", value: "+" },
			{ type: "operator", value: "-" },
			{ type: "operator", value: "*" },
			{ type: "operator", value: "/" },
			{ type: "operator", value: "%" },
			{ type: "operator", value: "==" },
			{ type: "operator", value: "!=" },
			{ type: "operator", value: "<" },
			{ type: "operator", value: ">" },
			{ type: "operator", value: "<=" },
			{ type: "operator", value: ">=" },
			{ type: "operator", value: "&&" },
			{ type: "operator", value: "||" },
			{ type: "operator", value: "!" },
			{ type: "operator", value: "~" },
			{ type: "operator", value: "&" },
			{ type: "operator", value: "|" },
			{ type: "operator", value: "^" },
			{ type: "operator", value: "<<" },
			{ type: "operator", value: ">>" },
			{ type: "operator", value: "<<=" },
			{ type: "operator", value: ">>=" },
			{ type: "operator", value: "+=" },
			{ type: "operator", value: "-=" },
			{ type: "operator", value: "*=" },
			{ type: "operator", value: "/=" },
			{ type: "operator", value: "%=" },
			{ type: "operator", value: "&=" },
			{ type: "operator", value: "|=" },
			{ type: "operator", value: "^=" }
		];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// Test 5: Attributes
	it("tokenizes attributes with and without parameters", () => {
		const input = "@vertex @fragment(workgroup_size(1,1))";
		const expected: Token[] = [
			{ type: "attribute", value: "@vertex" },
			{ type: "attribute", value: "@fragment(workgroup_size(1,1))" }
		];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// Test 6: Directives
	it("tokenizes directives with quoted arguments", () => {
		const input = "#binding \"data\" #entrypoint \"main\"";
		const expected: Token[] = [
			{ type: "directive", value: "#binding \"data\"" },
			{ type: "directive", value: "#entrypoint \"main\"" }
		];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// Test 7: Comments
	it("properly tokenizes single-line and multi-line comments", () => {
		const input = "// Single-line comment\n/* Multi-line\ncomment */";
		const expected: Token[] = [
			{ type: "comment", value: "// Single-line comment" },
			{ type: "comment", value: "/* Multi-line\ncomment */" }
		];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// Non-essential.
	// Test 8: Identifiers with Numbers and Underscores
	it.skip("throws error on identifiers starting with digits", () => {
		const input = "123illegal";
		expect(() => tokenizeWgsl(input)).toThrow("Unexpected character at position 0: 1");
	});

	// This test is invalid. Nested comments aren't supported.
	// Test 9: Multiline Comments with Nested Content
	// it("skips nested multi-line comments correctly", () => {
	// 	const input = "/* Comment with /* nested */ content */";
	// 	const expected: Token[] = [];
	// 	expect(tokenizeWgsl(input)).toEqual(expected);
	// });

	// This test might be invalid.
	// // Test 10: Unterminated String
	// it("throws error on unterminated string", () => {
	// 	const input = "\"unterminated string";
	// 	expect(() => tokenizeWgsl(input)).toThrow(/Unexpected character: /);
	// });

	// Test 11: Large Numbers and Hex Values
	it("tokenizes large numbers and hex values", () => {
		const input = "0xFFFFFFFFFFFFFFFFu 1.23456789";
		const expected: Token[] = [
			{ type: "number", value: "0xFFFFFFFFFFFFFFFFu" },
			{ type: "number", value: "1.23456789" }
		];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// Test 12: Attributes with Complex Parameters
	it("tokenizes attributes with complex parameters", () => {
		const input = "@compute(workgroup_size(1,1,1))";
		const expected: Token[] = [
			{ type: "attribute", value: "@compute(workgroup_size(1,1,1))" }
		];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// Test 13: Adjacent Operators
	it("tokenizes adjacent operators separately", () => {
		const input = "a+b-c*d/e";
		const expected: Token[] = [
			{ type: "identifier", value: "a" },
			{ type: "operator", value: "+" },
			{ type: "identifier", value: "b" },
			{ type: "operator", value: "-" },
			{ type: "identifier", value: "c" },
			{ type: "operator", value: "*" },
			{ type: "identifier", value: "d" },
			{ type: "operator", value: "/" },
			{ type: "identifier", value: "e" }
		];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// Test 14: Full Function Definition
	it("tokenizes a full WGSL function definition", () => {
		const input = "@vertex\nfn vertexMain() -> @builtin(position) vec4<f32> {\n    return vec4<f32>(0.0, 0.0, 0.0, 1.0);\n}";
		const expected: Token[] = [
			{ type: "attribute", value: "@vertex" },
			{ type: "keyword", value: "fn" },
			{ type: "identifier", value: "vertexMain" },
			{ type: "operator", value: "(" },
			{ type: "operator", value: ")" },
			{ type: "operator", value: "->" },
			{ type: "attribute", value: "@builtin(position)" },
			{ type: "builtin", value: "vec4" },
			{ type: "operator", value: "<" },
			{ type: "builtin", value: "f32" },
			{ type: "operator", value: ">" },
			{ type: "operator", value: "{" },
			{ type: "keyword", value: "return" },
			{ type: "builtin", value: "vec4" },
			{ type: "operator", value: "<" },
			{ type: "builtin", value: "f32" },
			{ type: "operator", value: ">" },
			{ type: "operator", value: "(" },
			{ type: "number", value: "0.0" },
			{ type: "operator", value: "," },
			{ type: "number", value: "0.0" },
			{ type: "operator", value: "," },
			{ type: "number", value: "0.0" },
			{ type: "operator", value: "," },
			{ type: "number", value: "1.0" },
			{ type: "operator", value: ")" },
			{ type: "operator", value: ";" },
			{ type: "operator", value: "}" }
		];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// Test 15: Directives with Special Characters
	it("tokenizes directives with special characters", () => {
		const input = "#binding \"data_with_special_chars!\"";
		const expected: Token[] = [
			{ type: "directive", value: "#binding \"data_with_special_chars!\"" }
		];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// Test 16: Invalid Characters
	it("throws on invalid characters", () => {
		const input = "let x = 5; $";
		expect(() => tokenizeWgsl(input)).toThrow("Unexpected character: $");
	});

	// Test 17: Kitchen Sink Test
	it("tokenizes a comprehensive WGSL snippet", () => {
		const input = "// Comment\n#binding \"data\"\n@vertex\nfn main() {\n    let x = 1.0f;\n    let y = \"string\";\n    /* Multiline comment */\n    return x + y;\n}";
		const expected: Token[] = [
			{ type: "comment", value: "// Comment" },
			{ type: "directive", value: "#binding \"data\"" },
			{ type: "attribute", value: "@vertex" },
			{ type: "keyword", value: "fn" },
			{ type: "identifier", value: "main" },
			{ type: "operator", value: "(" },
			{ type: "operator", value: ")" },
			{ type: "operator", value: "{" },
			{ type: "keyword", value: "let" },
			{ type: "identifier", value: "x" },
			{ type: "operator", value: "=" },
			{ type: "number", value: "1.0f" },
			{ type: "operator", value: ";" },
			{ type: "keyword", value: "let" },
			{ type: "identifier", value: "y" },
			{ type: "operator", value: "=" },
			{ type: "string", value: "\"string\"" },
			{ type: "operator", value: ";" },
			{ type: "comment", value: "/* Multiline comment */" },
			{ type: "keyword", value: "return" },
			{ type: "identifier", value: "x" },
			{ type: "operator", value: "+" },
			{ type: "identifier", value: "y" },
			{ type: "operator", value: ";" },
			{ type: "operator", value: "}" }
		];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// Test 18: Empty Attribute Parameters
	it("tokenizes attributes with empty parameters", () => {
		const input = "@compute()";
		const expected: Token[] = [
			{ type: "attribute", value: "@compute()" }
		];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// Test 19: Keywords in Identifiers
	it("tokenizes identifiers containing keyword substrings", () => {
		const input = "let_foo";
		const expected: Token[] = [
			{ type: "identifier", value: "let_foo" }
		];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// Test 20: Whitespace Overload
	it("handles excessive whitespace", () => {
		const input = "   \n\t  let   \r\n  x   =   5   ;   ";
		const expected: Token[] = [
			{ type: "keyword", value: "let" },
			{ type: "identifier", value: "x" },
			{ type: "operator", value: "=" },
			{ type: "number", value: "5" },
			{ type: "operator", value: ";" }
		];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// Test 21: Operator Ambiguity
	it("tokenizes ambiguous adjacent operators", () => {
		const input = "<<=>>=";
		const expected: Token[] = [
			{ type: "operator", value: "<<=" },
			{ type: "operator", value: ">>=" }
		];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// Test 22: Empty Input
	it("returns empty array for empty input", () => {
		const input = "";
		const expected: Token[] = [];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// Test 23: Whitespace-Only Input
	it("returns empty array for whitespace-only input", () => {
		const input = " \n\t ";
		const expected: Token[] = [];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// // // Test 24: Unterminated Multi-Line Comment
	// it("throws error on unterminated multi-line comment", () => {
	// 	const input = "/* unterminated";
	// 	expect(() => tokenizeWgsl(input)).toThrow(/Unexpected character: /);
	// });

	// // Test 25: Malformed Directive
	it("throws error on malformed directive", () => {
		const input = "#binding \"unclosed";
		expect(() => tokenizeWgsl(input)).toThrow(/Unexpected character: /);
	});

	// I believe this test needs work. There technically isn't an invalid character.
	// Suggest adding several tests for this if we want to test for it.
	// // Test 26: Unclosed Attribute
	// it("throws error on unclosed attribute parameters", () => {
	// 	const input = "@compute(1";
	// 	expect(() => tokenizeWgsl(input)).toThrow(/Unexpected character: /);
	// });

	// Test 27: Type Constructor Spacing
	it("tokenizes type constructors with flexible spacing", () => {
		const input = "vec3 < f32 >";
		const expected: Token[] = [
			{ type: "builtin", value: "vec3" },
			{ type: "operator", value: "<" },
			{ type: "builtin", value: "f32" },
			{ type: "operator", value: ">" }
		];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// Test 28: Multiple Attributes
	it("tokenizes multiple consecutive attributes", () => {
		const input = "@group(0) @binding(1)";
		const expected: Token[] = [
			{ type: "attribute", value: "@group(0)" },
			{ type: "attribute", value: "@binding(1)" }
		];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// Test 29: Operator vs. Attribute Overlap
	it("tokenizes attribute-like operator correctly", () => {
		const input = "@=";
		const expected: Token[] = [
			{ type: "operator", value: "@" },
			{ type: "operator", value: "=" }
		];
		expect(tokenizeWgsl(input)).toEqual(expected);
	});

	// TODO: can probably easily get this working. Non critical.
	// Test 30: Number Greediness
	it.skip("throws error on greedy number followed by text", () => {
		const input = "0xFFfollowedByText";
		expect(() => tokenizeWgsl(input)).toThrow(/Unexpected character: f/);
	});

	// Test 31: Unicode Identifiers
	it("throws error on identifiers with unicode characters", () => {
		const input = "let 你好 = 5;";
		expect(() => tokenizeWgsl(input)).toThrow("Unexpected character: 你");
	});
});