import obfuscate from '../src/obfuscate'; // Adjust path as needed

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
		const expected = `struct _0{field1:i32;field2:vec2<f32>;};`;
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
});