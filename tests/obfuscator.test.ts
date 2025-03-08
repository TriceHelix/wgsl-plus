import collectDeclaredIdentifiersAndEntryPoints from '../src/tools/obfuscation/collect-declared-identifiers-and-entry-points';
import collectStructNames from '../src/tools/obfuscation/collect-struct-names';
import { resetNameIndex } from '../src/tools/obfuscation/next-name';
import obfuscate from '../src/tools/obfuscation/obfuscate'; // Adjust path as needed
import replaceIdentifiers from '../src/tools/obfuscation/replace-identifiers';
import Token from '../src/tokenization/token';
import tokenizeWgsl from '../src/tokenization/tokenize-wgsl';


describe("collectStructNames", () => {

	beforeEach(() => {
		// Reset nameIndex before each test for consistent obfuscated names
		resetNameIndex();
	});

	it("maps non-swizzle struct members to obfuscated names", () => {
		const code = "struct MyStruct { field1: f32, field2: i32 };";
		const tokens = tokenizeWgsl(code);
		const structMemberMap = collectStructNames(tokens);

		expect(structMemberMap.size).toBe(2);
		expect(structMemberMap.get("field1")).toBe("_0");
		expect(structMemberMap.get("field2")).toBe("_1");
	});

	it("does not map swizzle-like struct members", () => {
		const code = "struct VectorLike { x: f32, y: f32, z: f32, w: f32, xy: vec2<f32> };";
		const tokens = tokenizeWgsl(code);
		const structMemberMap = collectStructNames(tokens);

		expect(structMemberMap.size).toBe(0); // All are potential swizzles
		expect(structMemberMap.get("x")).toBeUndefined();
		expect(structMemberMap.get("y")).toBeUndefined();
		expect(structMemberMap.get("z")).toBeUndefined();
		expect(structMemberMap.get("w")).toBeUndefined();
		expect(structMemberMap.get("xy")).toBeUndefined();
	});

	it("maps overlapping members across structs to the same name if non-swizzle", () => {
		const code = "struct A { common: i32, uniqueA: f32 }; struct B { common: i32, uniqueB: vec2<f32> };";
		const tokens = tokenizeWgsl(code);
		const structMemberMap = collectStructNames(tokens);

		expect(structMemberMap.size).toBe(3);
		expect(structMemberMap.get("common")).toBe("_0");
		expect(structMemberMap.get("uniqueA")).toBe("_1");
		expect(structMemberMap.get("uniqueB")).toBe("_2");
	});

	it("handles empty structs with no mappings", () => {
		const code = "struct EmptyStruct {};";
		const tokens = tokenizeWgsl(code);
		const structMemberMap = collectStructNames(tokens);

		expect(structMemberMap.size).toBe(0);
	});

	it("processes incomplete structs gracefully", () => {
		const code = "struct Incomplete { field: f32"; // No closing brace
		const tokens = tokenizeWgsl(code);
		const structMemberMap = collectStructNames(tokens);

		expect(structMemberMap.size).toBe(1);
		expect(structMemberMap.get("field")).toBe("_0");
	});

	it("ignores swizzle-like members even with mixed cases", () => {
		const code = "struct Mixed { pos: vec3<f32>, x: f32, xyz: f32 };";
		const tokens = tokenizeWgsl(code);
		const structMemberMap = collectStructNames(tokens);

		expect(structMemberMap.size).toBe(1);
		expect(structMemberMap.get("pos")).toBe("_0");
		expect(structMemberMap.get("x")).toBeUndefined();
		expect(structMemberMap.get("xyz")).toBeUndefined();
	});
});

describe("collectDeclaredIdentifiersAndEntryPoints", () => {
	beforeEach(() => {
		resetNameIndex(); // Reset name index for predictable obfuscated names (_0, _1, etc.)
	});

	it("maps top-level variables", () => {
		const code = "let a: i32 = 5; var b: f32; const c = 10;";
		const tokens = tokenizeWgsl(code);
		const structMemberMap = collectStructNames(tokens);
		const { identifierMap } = collectDeclaredIdentifiersAndEntryPoints(tokens);

		expect(identifierMap.size).toBe(3);
		expect(identifierMap.get("a")).toBe("_0");
		expect(identifierMap.get("b")).toBe("_1");
		expect(identifierMap.get("c")).toBe("_2");
	});

	it("preserves entry point function names with #entrypoint", () => {
		const code = "#entrypoint \"myFunc\"\nfn myFunc() {}";
		const tokens = tokenizeWgsl(code);
		const structMemberMap = collectStructNames(tokens);
		const { identifierMap } = collectDeclaredIdentifiersAndEntryPoints(tokens);

		expect(identifierMap.has("myFunc")).toBe(false);
	});

	it("preserves main as entry point when no #entrypoint is specified", () => {
		const code = "fn main() {}";
		const tokens = tokenizeWgsl(code);
		const structMemberMap = collectStructNames(tokens);
		const { identifierMap } = collectDeclaredIdentifiersAndEntryPoints(tokens);

		expect(identifierMap.has("main")).toBe(false);
	});

	it("obfuscates non-entry point functions", () => {
		const code = "fn helper() {}";
		const tokens = tokenizeWgsl(code);
		const structMemberMap = collectStructNames(tokens);
		const { identifierMap } = collectDeclaredIdentifiersAndEntryPoints(tokens);

		expect(identifierMap.get("helper")).toBe("_0");
	});

	it("maps function parameters in non-entry point functions", () => {
		const code = "fn myFunc(param1: i32, param2: f32) {}";
		const tokens = tokenizeWgsl(code);
		const structMemberMap = collectStructNames(tokens);
		const { identifierMap } = collectDeclaredIdentifiersAndEntryPoints(tokens);

		expect(identifierMap.get("myFunc")).toBe("_0");
		expect(identifierMap.get("param1")).toBe("_1");
		expect(identifierMap.get("param2")).toBe("_2");
	});

	it("maps function parameters in entry point functions", () => {
		const code = "#entrypoint \"myFunc\"\nfn myFunc(param1: i32, param2: f32) {}";
		const tokens = tokenizeWgsl(code);
		const structMemberMap = collectStructNames(tokens);
		const { identifierMap } = collectDeclaredIdentifiersAndEntryPoints(tokens);

		expect(identifierMap.has("myFunc")).toBe(false);
		expect(identifierMap.get("param1")).toBe("_0");
		expect(identifierMap.get("param2")).toBe("_1");
	});

	it("maps struct type names", () => {
		const code = "struct MyStruct { x: f32 };";
		const tokens = tokenizeWgsl(code);
		const structMemberMap = collectStructNames(tokens);
		const { identifierMap } = collectDeclaredIdentifiersAndEntryPoints(tokens);

		expect(identifierMap.get("MyStruct")).toBe("_0");
	});

	it("handles #binding directives", () => {
		const code = "#binding \"data\"\nlet data: i32;";
		const tokens = tokenizeWgsl(code);
		const structMemberMap = collectStructNames(tokens);
		const { identifierMap, bindingMap } = collectDeclaredIdentifiersAndEntryPoints(tokens);

		expect(identifierMap.get("data")).toBe("_0");
		expect(bindingMap.get("data")).toBe("_0");
	});

	it("handles multiple #entrypoint directives", () => {
		const code = "#entrypoint \"vertexMain\"\nfn vertexMain() {}\n#entrypoint \"fragmentMain\"\nfn fragmentMain() {}";
		const tokens = tokenizeWgsl(code);
		const structMemberMap = collectStructNames(tokens);
		const { identifierMap } = collectDeclaredIdentifiersAndEntryPoints(tokens);

		expect(identifierMap.has("vertexMain")).toBe(false);
		expect(identifierMap.has("fragmentMain")).toBe(false);
	});

	it("maps overlapping identifiers uniquely", () => {
		const code = "let x: i32 = 5; fn x(param: i32) {}";
		const tokens = tokenizeWgsl(code);
		const structMemberMap = collectStructNames(tokens);
		const { identifierMap } = collectDeclaredIdentifiersAndEntryPoints(tokens);

		expect(identifierMap.size).toBe(2);
		expect(identifierMap.get("x")).toBe("_0");
		expect(identifierMap.get("param")).toBe("_1");
	});

	it("integrates with collectStructNames for struct and variable declarations", () => {
		const code = "struct S { x: f32 }; let y: S;";
		const tokens = tokenizeWgsl(code);
		const structMemberMap = collectStructNames(tokens);
		const { identifierMap } = collectDeclaredIdentifiersAndEntryPoints(tokens);

		expect(identifierMap.get("S")).toBe("_0");
		expect(identifierMap.get("y")).toBe("_1");
	});
});

describe("replaceIdentifiers", () => {

	// Token type (simplified for testing)
	interface Token {
		type: string;
		value: string;
	}

	// Create a single token
	function createToken(type: string, value: string): Token {
		return { type, value };
	}

	// Simple tokenizer for test inputs (not full WGSL parsing)
	// function tokenizeSimple(code: string): Token[] {
	// 	const keywords = new Set(["struct", "fn", "let", "var", "const", "if", "else", "for", "while", "return"]);
	// 	const regex = /[\w]+|[^\s]/g;
	// 	const tokens: Token[] = [];
	// 	let match;
	// 	while ((match = regex.exec(code)) !== null) {
	// 		const value = match[0];
	// 		const type = keywords.has(value) ? "keyword" : (value.match(/^[a-zA-Z_]/) ? "identifier" : "operator");
	// 		tokens.push({ type, value });
	// 	}
	// 	return tokens;
	// }

	// Convert tokens back to string for comparison
	function tokensToString(tokens: Token[]): string {
		return tokens.map(t => t.value).join(" ");
	}

	// General functionality tests
	it("replaces top-level identifiers using identifierMap", () => {
		const tokens = tokenizeWgsl("let a = 5");
		const identifierMap = new Map<string, string>([["a", "_0"]]);
		const structMemberMap = new Map<string, string>();
		const result = replaceIdentifiers(tokens, identifierMap, structMemberMap);
		expect(tokensToString(result)).toBe("let _0 = 5");
	});

	it("leaves identifiers not in either map unchanged", () => {
		const tokens = tokenizeWgsl("let unknown = 5");
		const identifierMap = new Map<string, string>();
		const structMemberMap = new Map<string, string>();
		const result = replaceIdentifiers(tokens, identifierMap, structMemberMap);
		expect(tokensToString(result)).toBe("let unknown = 5");
	});

	it("preserves non-identifier tokens", () => {
		const tokens = tokenizeWgsl("let = ( ) ;");
		const identifierMap = new Map<string, string>();
		const structMemberMap = new Map<string, string>();
		const result = replaceIdentifiers(tokens, identifierMap, structMemberMap);
		expect(tokensToString(result)).toBe("let = ( ) ;");
	});

	// Addressing failing test 1: Preserves vector swizzles
	it("preserves vector swizzles while obfuscating variables", () => {
		const input = "fn main ( ) { let v : vec3 < f32 > = vec3 < f32 > ( 1.0 , 2.0 , 3.0 ) ; let x = v . x ; let xy = v . xy ; let xyz = v . xyz ; }";
		const tokens = tokenizeWgsl(input);
		const identifierMap = new Map<string, string>([
			["main", "_0"],
			["v", "_1"],
			["x", "_2"],
			["xy", "_3"],
			["xyz", "_4"]
		]);
		const structMemberMap = new Map<string, string>(); // No structs in this test
		const result = replaceIdentifiers(tokens, identifierMap, structMemberMap);
		const expected = "fn _0 ( ) { let _1 : vec3 < f32 > = vec3 < f32 > ( 1.0 , 2.0 , 3.0 ) ; let _2 = _1 . x ; let _3 = _1 . xy ; let _4 = _1 . xyz ; }";
		expect(tokensToString(result)).toBe(expected);
	});

	// Addressing failing test 2: Obfuscates struct members, preserves swizzles
	it("obfuscates struct members while preserving vector swizzles", () => {
		const input = "struct S { x : f32 , y : i32 } ; fn main ( ) { let v : vec2 < f32 > = vec2 < f32 > ( 1.0 , 2.0 ) ; let s : S ; let a = v . x ; let b = s . y ; }";
		const tokens = tokenizeWgsl(input);
		const identifierMap = new Map<string, string>([
			["S", "_0"],
			["main", "_1"],
			["v", "_2"],
			["s", "_3"],
			["a", "_4"],
			["b", "_5"]
		]);
		const structMemberMap = new Map<string, string>([]);

		const result = replaceIdentifiers(tokens, identifierMap, structMemberMap);
		const expected = "struct _0 { x : f32 , y : i32 } ; fn _1 ( ) { let _2 : vec2 < f32 > = vec2 < f32 > ( 1.0 , 2.0 ) ; let _3 : _0 ; let _4 = _2 . x ; let _5 = _3 . y ; }";
		expect(tokensToString(result)).toBe(expected);
	});

	// Addressing failing test 3: Mixed swizzles and struct members
	it("handles mixed vector swizzles and struct members with overlapping names", () => {
		const input = "struct S { xy : vec2 < f32 > , z : i32 } ; fn main ( ) { let v : vec3 < f32 > = vec3 < f32 > ( 1.0 , 2.0 , 3.0 ) ; let s : S ; let a = v . xy ; let b = v . z ; let c = s . z ; }";
		const tokens = tokenizeWgsl(input);
		const identifierMap = new Map<string, string>([
			["S", "_0"],
			["main", "_1"],
			["v", "_2"],
			["s", "_3"],
			["a", "_4"],
			["b", "_5"],
			["c", "_6"]
		]);
		const structMemberMap = new Map<string, string>([]);
		const result = replaceIdentifiers(tokens, identifierMap, structMemberMap);
		const expected = "struct _0 { xy : vec2 < f32 > , z : i32 } ; fn _1 ( ) { let _2 : vec3 < f32 > = vec3 < f32 > ( 1.0 , 2.0 , 3.0 ) ; let _3 : _0 ; let _4 = _2 . xy ; let _5 = _2 . z ; let _6 = _3 . z ; }";
		expect(tokensToString(result)).toBe(expected);
	});

	it("doesn't obfuscate color-based struct members in definitions", () => {
		const input = "struct Color { r : f32 , g : i32 , b : f32 }";
		const tokens = tokenizeWgsl(input);
		const identifierMap = new Map<string, string>([["Color", "_0"]]);
		const structMemberMap = new Map<string, string>([]);
		const result = replaceIdentifiers(tokens, identifierMap, structMemberMap);
		const expected = "struct _0 { r : f32 , g : i32 , b : f32 }";
		expect(tokensToString(result)).toBe(expected);
	});

	it("doesn't obfuscates color-based struct members in accesses", () => {
		const input = "struct Color { r : f32 , g : i32 } ; fn main ( ) { let c : Color ; let red = c . r ; let green = c . g ; }";
		const tokens = tokenizeWgsl(input);
		const identifierMap = new Map<string, string>([
			["Color", "_0"],
			["main", "_1"],
			["c", "_2"],
			["red", "_3"],
			["green", "_4"]
		]);
		const structMemberMap = new Map<string, string>([
		]);
		const result = replaceIdentifiers(tokens, identifierMap, structMemberMap);
		const expected = "struct _0 { r : f32 , g : i32 } ; fn _1 ( ) { let _2 : _0 ; let _3 = _2 . r ; let _4 = _2 . g ; }";
		expect(tokensToString(result)).toBe(expected);
	});

	it("preserves color-based identifiers as invalid swizzles on vectors", () => {
		const input = "fn main ( ) { let v : vec3 < f32 > = vec3 < f32 > ( 1.0 , 2.0 , 3.0 ) ; let r = v . r ; let g = v . g ; }";
		const tokens = tokenizeWgsl(input);
		const identifierMap = new Map<string, string>([
			["main", "_0"],
			["v", "_1"],
			["r", "_2"],
			["g", "_3"]
		]);
		const structMemberMap = new Map<string, string>(); // No struct members here
		const result = replaceIdentifiers(tokens, identifierMap, structMemberMap);
		const expected = "fn _0 ( ) { let _1 : vec3 < f32 > = vec3 < f32 > ( 1.0 , 2.0 , 3.0 ) ; let _2 = _1 . r ; let _3 = _1 . g ; }";
		expect(tokensToString(result)).toBe(expected);
	});

	// it("distinguishes color-based struct members from invalid swizzles", () => {
	// 	const input = "struct Color { r : f32 , g : i32 } ; fn main ( ) { let v : vec3 < f32 > ; let c : Color ; let vr = v . r ; let cr = c . r ; }";
	// 	const tokens = tokenizeWgsl(input);
	// 	const identifierMap = new Map<string, string>([
	// 		["Color", "_0"],
	// 		["main", "_1"],
	// 		["v", "_2"],
	// 		["c", "_3"],
	// 		["vr", "_4"],
	// 		["cr", "_5"]
	// 	]);
	// 	const structMemberMap = new Map<string, string>([
	// 		["r", "_6"],
	// 		["g", "_7"]
	// 	]);
	// 	const result = replaceIdentifiers(tokens, identifierMap, structMemberMap);
	// 	const expected = "struct _0 { _6 : f32 , _7 : i32 } ; fn _1 ( ) { let _2 : vec3 < f32 > ; let _3 : _0 ; let _4 = _2 . r ; let _5 = _3 . _6 ; }";
	// 	expect(tokensToString(result)).toBe(expected);
	// });

	it("handles mixed swizzle-like and color-based struct members", () => {
		const input = "struct Mixed { x : f32 , r : i32 , rgb : vec3 < f32 > } ; fn main ( ) { let v : vec3 < f32 > ; let m : Mixed ; let vx = v . x ; let mr = m . r ; let mrgb = m . rgb ; }";
		const tokens = tokenizeWgsl(input);
		const identifierMap = new Map<string, string>([
			["Mixed", "_0"],
			["main", "_1"],
			["v", "_2"],
			["m", "_3"],
			["vx", "_4"],
			["mr", "_5"],
			["mrgb", "_6"]
		]);
		const structMemberMap = new Map<string, string>([
			// ["x", "_7"],
			// ["r", "_8"],
			// ["rgb", "_9"]
		]);
		const result = replaceIdentifiers(tokens, identifierMap, structMemberMap);
		const expected = "struct _0 { x : f32 , r : i32 , rgb : vec3 < f32 > } ; fn _1 ( ) { let _2 : vec3 < f32 > ; let _3 : _0 ; let _4 = _2 . x ; let _5 = _3 . r ; let _6 = _3 . rgb ; }";
		expect(tokensToString(result)).toBe(expected);
	});
});

describe('WGSL Obfuscator', () => {
	it('renames identifiers while preserving keywords and attributes', () => {
		const input = `@fragment fn myFunc() { let x = 5; return; }`;
		const expected = `@fragment fn _0(){let _1=5;return;}`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('handles #binding directives correctly', () => {
		const input = `#binding "data"\nlet data = 42;`;
		const expected = `//#!binding data _0\nlet _0=42;`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('preserves operators and punctuation', () => {
		const input = `let a = 1 + 2 * 3;`;
		const expected = `let _0=1+2*3;`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('preserves string and number literals', () => {
		const input = `let s = "hello"; let n = 0xFF; let f = 3.14f;`;
		const expected = `let _0="hello";let _1=0xFF;let _2=3.14f;`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('removes comments', () => {
		const input = `// Single-line comment\nfn myFunc() { /* Multi-line\ncomment */ let x = 5; }`;
		const expected = `fn _0(){let _1=5;}`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('handles complex expressions', () => {
		const input = `fn process(x: f32, y: f32, z: f32, a: f32, b: f32){ let result = dot(vec3<f32>(1.0, 2.0, 3.0), normalize(vec3<f32>(x, y, z))) + 5.0 * length(vec2<f32>(a, b));}`;
		const expected = `fn _0(_1:f32,_2:f32,_3:f32,_4:f32,_5:f32){let _6=dot(vec3<f32>(1.0,2.0,3.0),normalize(vec3<f32>(_1,_2,_3)))+5.0*length(vec2<f32>(_4,_5));}`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('handles struct definitions', () => {
		const input = `struct MyStruct { field1: i32; field2: vec2<f32>; };`;
		const expected = `struct _2{_0:i32;_1:vec2<f32>;};`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('handles attributes with parameters', () => {
		// This test could perhaps be improved.
		// I think there's a rendundant space after (position).
		const input = `fn myFunc(@builtin(position) var<out> gl_Position: vec4<f32>){}`;
		const expected = `fn _0(@builtin(position) var<out>_1:vec4<f32>){}`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('handles switch statements', () => {
		const input = `let x = 1; var y = 0;\nswitch (x) { case 1: { y = 10; } case 2, 3: { y = 20; } default: { y = 0; } }}`;
		const expected = `let _0=1;var _1=0;switch(_0){case 1:{_1=10;}case 2,3:{_1=20;}default:{_1=0;}}}`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('handles functions with parameters', () => {
		const input = `fn add(a: i32, b: i32) -> i32 { return a + b; }`;
		const expected = `fn _0(_1:i32,_2:i32)->i32{return _1+_2;}`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('handles bitwise operations', () => {
		const input = `let x = 1 | 2 & 3 ^ 4;`;
		const expected = `let _0=1|2&3^4;`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('handles minimal whitespace', () => {
		const input = `fn myFunc(){let x=5;return;}`;
		const expected = `fn _0(){let _1=5;return;}`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('handles excessive whitespace', () => {
		const input = `fn   myFunc(  )   { let   x   =   5   ; return   ; }`;
		const expected = `fn _0(){let _1=5;return;}`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('preserves built-in functions and types', () => {
		const input = `let v = vec3<f32>(1.0, 2.0, 3.0); let m = mat2x2<f32>();`;
		const expected = `let _0=vec3<f32>(1.0,2.0,3.0);let _1=mat2x2<f32>();`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('handles multiple #binding directives', () => {
		const input = `#binding "data"\n#binding "buffer"\nlet data = 42; let buffer = 24;`;
		const expected = `//#!binding data _0\n//#!binding buffer _1\nlet _0=42;let _1=24;`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('preserves single entry point function specified by #entrypoint', () => {
		const input = `
            #entrypoint "myCompute"
            @compute @workgroup_size(1,1)
            fn myCompute() {
                let x = 1;
            }
            fn helper() {
                var y = 2;
            }
        `;
		const expected = `@compute @workgroup_size(1,1) fn myCompute(){let _0=1;}fn _1(){var _2=2;}`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('preserves main as entry point when no #entrypoint is specified', () => {
		const input = `
            @compute @workgroup_size(1,1)
            fn main() {
                let a = 5;
            }
            fn otherFunc() {
                var b = 10;
            }
        `;
		const expected = `@compute @workgroup_size(1,1) fn main(){let _0=5;}fn _1(){var _2=10;}`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('preserves multiple entry point functions with #entrypoint directives', () => {
		const input = `
            #entrypoint "vertexMain"
            #entrypoint "fragmentMain"
            @vertex
            fn vertexMain() {
                let v = 1;
            }
            @fragment
            fn fragmentMain() {
                let f = 2;
            }
            fn utility() {
                var u = 3;
            }
        `;
		const expected = `@vertex fn vertexMain(){let _0=1;}@fragment fn fragmentMain(){let _1=2;}fn _2(){var _3=3;}`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('obfuscates non-main entry point when no #entrypoint is specified', () => {
		const input = `
            @compute @workgroup_size(1,1)
            fn customEntry() {
                let z = 4;
            }
            fn support() {
                var s = 5;
            }
        `;
		const expected = `@compute @workgroup_size(1,1) fn _0(){let _1=4;}fn _2(){var _3=5;}`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('handles mixed #entrypoint and #binding directives', () => {
		const input = `
            #entrypoint "computeMain"
            #binding "data"
            @compute @workgroup_size(1,1)
            fn computeMain() {
                let x = data;
            }
        `;
		const expected = `
//#!binding data _0
@compute @workgroup_size(1,1) fn computeMain(){let _1=_0;}
        `.trim();
		expect(obfuscate(input)).toBe(expected);
	});

	it('preserves vector swizzles while obfuscating variables', () => {
		const input = `
            fn main() {
                let v: vec3<f32> = vec3<f32>(1.0, 2.0, 3.0);
                let x = v.x;
                let xy = v.xy;
                let xyz = v.xyz;
            }
        `;
		const expected = `fn main(){let _0:vec3<f32>=vec3<f32>(1.0,2.0,3.0);let _1=_0.x;let _2=_0.xy;let _3=_0.xyz;}`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('obfuscates struct members while preserving vector swizzles', () => {

		// This test has been defunct since now we are just not renaming potential swizzler names.

		const input = `
            struct MyStruct {
                x: f32,
                y: i32
            };
            fn main() {
                let v: vec2<f32> = vec2<f32>(1.0, 2.0);
                let s: MyStruct;
                let a = v.x;
                let b = s.x;
                let c = s.y;
            }
        `;
		const expected = `struct _0{x:f32,y:i32};fn main(){let _1:vec2<f32>=vec2<f32>(1.0,2.0);let _2:_0;let _3=_1.x;let _4=_2.x;let _5=_2.y;}`;
		expect(obfuscate(input)).toBe(expected);
	});

	it('handles mixed vector swizzles and struct members with overlapping names', () => {
		const input = `
            struct Position {
                xy: vec2<f32>,
                z: i32
            };
            fn main() {
                let v: vec3<f32> = vec3<f32>(1.0, 2.0, 3.0);
                let p: Position;
                let swizzle1 = v.xy;
                let swizzle2 = v.z;
                let member1 = p.xy;
                let member2 = p.z;
            }
        `;
		const expected = `struct _0{xy:vec2<f32>,z:i32};fn main(){let _1:vec3<f32>=vec3<f32>(1.0,2.0,3.0);let _2:_0;let _3=_1.xy;let _4=_1.z;let _5=_2.xy;let _6=_2.z;}`;
		expect(obfuscate(input)).toBe(expected);
	});
});