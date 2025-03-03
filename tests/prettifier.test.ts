import prettify from '../src/prettify';

describe('WGSL Prettifier', () => {
    it('formats simple function definitions', () => {
        const input = 'fn main(){let x=5;return;}';
        const expected = [
            'fn main() {',
            '    let x = 5;',
            '    return;',
            '}'
        ].join('\n');
        expect(prettify(input)).toBe(expected);
    });

    it('formats variable declarations', () => {
        const input = 'const PI=3.14;let x:i32=5;var y=vec2<f32>(0.0,1.0);';
        const expected = [
            'const PI = 3.14;',
            'let x: i32 = 5;',
            'var y = vec2<f32>(0.0, 1.0);'
        ].join('\n');
        expect(prettify(input)).toBe(expected);
    });

    it('formats if-else control flow', () => {
        const input = 'if(x>0){y=1;}else{y=0;}';
        const expected = [
            'if (x > 0) {',
            '    y = 1;',
            '} else {',
            '    y = 0;',
            '}'
        ].join('\n');
        expect(prettify(input)).toBe(expected);
    });

    it('formats attributes on functions and parameters', () => {
        const input = '@fragment fn fragmentMain(@location(0) fragCoord:vec4<f32>)->@location(0)vec4<f32>{return fragCoord;}';
        const expected = [
            '@fragment',
            'fn fragmentMain(@location(0) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {',
            '    return fragCoord;',
            '}'
        ].join('\n');
        expect(prettify(input)).toBe(expected);
    });

    it('preserves and formats comments', () => {
        const input = '// This is a comment\nfn main() {\n/* Multi-line\ncomment */\nlet x=5;// Inline comment\n}';
        const expected = [
            '// This is a comment',
            'fn main() {',
            '    /* Multi-line',
            '       comment */',
            '    let x = 5; // Inline comment',
            '}'
        ].join('\n');
        expect(prettify(input)).toBe(expected);
    });

    it('formats struct definitions', () => {
        const input = 'struct MyStruct{field1:i32;field2:vec2<f32>;};';
        const expected = [
            'struct MyStruct {',
            '    field1: i32;',
            '    field2: vec2<f32>;',
            '};'
        ].join('\n');
        expect(prettify(input)).toBe(expected);
    });

    it('formats literals and operators', () => {
        const input = 'let a=1+2*3;let b=0xFFu;let c=3.14f;let d=true&&false;';
        const expected = [
            'let a = 1 + 2 * 3;',
            'let b = 0xFFu;',
            'let c = 3.14f;',
            'let d = true && false;'
        ].join('\n');
        expect(prettify(input)).toBe(expected);
    });

    it('formats nested control structures (for and if)', () => {
        const input = 'for(var i=0;i<10;i++){if(i%2==0){continue;}else{break;}}';
        const expected = [
            'for (var i = 0; i < 10; i++) {',
            '    if (i % 2 == 0) {',
            '        continue;',
            '    } else {',
            '        break;',
            '    }',
            '}'
        ].join('\n');
        expect(prettify(input)).toBe(expected);
    });

    it('formats function with parameters', () => {
        const input = 'fn add(a:i32,b:i32)->i32{return a+b;}';
        const expected = [
            'fn add(a: i32, b: i32) -> i32 {',
            '    return a + b;',
            '}'
        ].join('\n');
        expect(prettify(input)).toBe(expected);
    });

    it('formats switch statements', () => {
        const input = 'switch(x){case 1:{y=10;}case 2,3:{y=20;}default:{y=0;}}';
        const expected = [
            'switch (x) {',
            '    case 1: {',
            '        y = 10;',
            '    }',
            '    case 2, 3: {',
            '        y = 20;',
            '    }',
            '    default: {',
            '        y = 0;',
            '    }',
            '}'
        ].join('\n');
        expect(prettify(input)).toBe(expected);
    });

    it('formats type aliases', () => {
        const input = 'type Float2=vec2<f32>;';
        const expected = 'type Float2 = vec2<f32>;';
        expect(prettify(input)).toBe(expected);
    });

    it('formats complex structs with attributes', () => {
        const input = 'struct Vertex{@location(0)position:vec3<f32>;@builtin(vertex_index)index:u32;};';
        const expected = [
            'struct Vertex {',
            '    @location(0) position: vec3<f32>;',
            '    @builtin(vertex_index) index: u32;',
            '};'
        ].join('\n');
        expect(prettify(input)).toBe(expected);
    });

    it('formats bitwise operations', () => {
        const input = 'let x=1|2&3^4;';
        const expected = 'let x = 1 | 2 & 3 ^ 4;';
        expect(prettify(input)).toBe(expected);
    });

    it('preserves empty lines and spacing', () => {
        const input = '\n// Comment 1\n\n// Comment 2\nfn main() {\n\n}';
        const expected = [
            '',
            '// Comment 1',
            '',
            '// Comment 2',
            'fn main() {',
            '',
            '}'
        ].join('\n');
        expect(prettify(input)).toBe(expected);
    });

    it('formats long lines with complex expressions', () => {
        const input = 'let result=dot(vec3<f32>(1.0,2.0,3.0),normalize(vec3<f32>(x,y,z)))+5.0*length(vec2<f32>(a,b));';
        const expected = 'let result = dot(vec3<f32>(1.0, 2.0, 3.0), normalize(vec3<f32>(x, y, z))) + 5.0 * length(vec2<f32>(a, b));';
        expect(prettify(input)).toBe(expected);
    });

	it('handles single-line comments before and inside a function', () => {
        const input = `
            // Comment before function
            // Another comment
            fn myFunc() {
                // Inside function comment
                let x = 5;
            }
        `;
        const expected = [
            '// Comment before function',
            '// Another comment',
            'fn myFunc() {',
            '    // Inside function comment',
            '    let x = 5;',
            '}'
        ].join('\n');
        expect(prettify(input)).toBe(expected);
    });

    it('handles multi-line comment before a struct', () => {
        const input = `
            /* Multi-line
               comment */
            struct MyStruct {
                a: i32,
                b: f32
            };
        `;
        const expected = [
            '/* Multi-line',
            '   comment */',
            'struct MyStruct {',
            '    a: i32,',
            '    b: f32',
            '};'
        ].join('\n');
        expect(prettify(input)).toBe(expected);
    });

    it('handles mixed comments and code in a function', () => {
        const input = `
            fn complexFunc() {
                // Single-line comment
                let x = 1;
                /* Multi-line
                   comment inside */
                var y = 2;
                // Another comment
            }
        `;
        const expected = [
            'fn complexFunc() {',
            '    // Single-line comment',
            '    let x = 1;',
            '    /* Multi-line',
            '       comment inside */',
            '    var y = 2;',
            '    // Another comment',
            '}'
        ].join('\n');
        expect(prettify(input)).toBe(expected);
    });
});