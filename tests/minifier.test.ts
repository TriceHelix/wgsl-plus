import minify from '../src/tools/minify';

describe('WGSL Minifier', () => {
    it('minifies simple function definitions', () => {
        const input = 'fn main() {\n    let x = 5;\n    return;\n}';
        const expected = 'fn main(){let x=5;return;}';
        expect(minify(input)).toBe(expected);
    });

    it('minifies variable declarations', () => {
        const input = 'const PI = 3.14;\nlet x: i32 = 5;\nvar y = vec2<f32>(0.0, 1.0);';
        const expected = 'const PI=3.14;let x:i32=5;var y=vec2<f32>(0.0,1.0);';
        expect(minify(input)).toBe(expected);
    });

    it('removes comments', () => {
        const input = '// This is a comment\nfn main() {\n    /* Multi-line\n    comment */\n    let x = 5; // Inline comment\n}';
        const expected = 'fn main(){let x=5;}';
        expect(minify(input)).toBe(expected);
    });

    it('preserves attributes', () => {
        const input = '@fragment\nfn fragmentMain(@location(0) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {\n    return fragCoord;\n}';
        const expected = '@fragment fn fragmentMain(@location(0)fragCoord:vec4<f32>)->@location(0)vec4<f32>{return fragCoord;}';
        expect(minify(input)).toBe(expected);
    });

    it('minifies control flow', () => {
        const input = 'if (x > 0) {\n    y = 1;\n} else {\n    y = 0;\n}';
        const expected = 'if(x>0){y=1;}else{y=0;}';
        expect(minify(input)).toBe(expected);
    });

    it('handles literals and operators', () => {
        const input = 'let a = 1 + 2 * 3;\nlet b = 0xFFu;\nlet c = 3.14f;\nlet d = true && false;';
        const expected = 'let a=1+2*3;let b=0xFFu;let c=3.14f;let d=true&&false;';
        expect(minify(input)).toBe(expected);
    });

    it('preserves strings with special characters', () => {
        const input = 'let s = "hello // world";\nlet t = "/* comment */";';
        const expected = 'let s="hello // world";let t="/* comment */";';
        expect(minify(input)).toBe(expected);
    });

    it('handles code with no whitespace', () => {
        const input = 'fnmain(){letx=5;return;}';
        const expected = 'fnmain(){letx=5;return;}';
        expect(minify(input)).toBe(expected);
    });

    it('removes excessive whitespace', () => {
        const input = 'fn   main(  )   {\n    let   x   =   5   ;\n    return   ;\n}';
        const expected = 'fn main(){let x=5;return;}';
        expect(minify(input)).toBe(expected);
    });

    it('minifies complex expressions', () => {
        const input = 'let result = dot(vec3<f32>(1.0, 2.0, 3.0), normalize(vec3<f32>(x, y, z))) + 5.0 * length(vec2<f32>(a, b));';
        const expected = 'let result=dot(vec3<f32>(1.0,2.0,3.0),normalize(vec3<f32>(x,y,z)))+5.0*length(vec2<f32>(a,b));';
        expect(minify(input)).toBe(expected);
    });

    it('handles attributes with parameters', () => {
        const input = '@builtin(position) var<out> gl_Position: vec4<f32>;';
        const expected = '@builtin(position)var<out>gl_Position:vec4<f32>;';
        expect(minify(input)).toBe(expected);
    });

    it('minifies switch statements', () => {
        const input = 'switch (x) {\n    case 1: {\n        y = 10;\n    }\n    case 2, 3: {\n        y = 20;\n    }\n    default: {\n        y = 0;\n    }\n}';
        const expected = 'switch(x){case 1:{y=10;}case 2,3:{y=20;}default:{y=0;}}';
        expect(minify(input)).toBe(expected);
    });

    it('minifies functions with parameters', () => {
        const input = 'fn add(a: i32, b: i32) -> i32 {\n    return a + b;\n}';
        const expected = 'fn add(a:i32,b:i32)->i32{return a+b;}';
        expect(minify(input)).toBe(expected);
    });

    it('minifies struct definitions', () => {
        const input = 'struct MyStruct {\n    field1: i32;\n    field2: vec2<f32>;\n};';
        const expected = 'struct MyStruct{field1:i32;field2:vec2<f32>;}';
        expect(minify(input)).toBe(expected);
    });

    it('handles bitwise operations', () => {
        const input = 'let x = 1 | 2 & 3 ^ 4;';
        const expected = 'let x=1|2&3^4;';
        expect(minify(input)).toBe(expected);
    });
});