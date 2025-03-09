import { processConditionals } from '../src/tools/preprocessing/conditional-processor';
import { evaluateExpression } from '../src/tools/preprocessing/evaluator';
import { expandMacros } from '../src/tools/preprocessing/macro-expander';
import preprocessWgsl from '../src/tools/preprocessing/preprocess-wgsl';
import { Macro } from '../src/tools/preprocessing/types';

describe('Macro Expander', () => {
	let defines: Map<string, Macro>;

	beforeEach(() => {
		defines = new Map<string, Macro>();
	});

	// Simple macro expansion tests
	describe('Simple macro expansion', () => {
		test('basic macro expansion', () => {
			const defines = new Map<string, Macro>();
			defines.set('WIDTH', { value: '800' });

			const line = 'const width: u32 = WIDTH;';
			const expected = 'const width: u32 = 800;';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		test('multiple macro expansions in one line', () => {
			const defines = new Map<string, Macro>();
			defines.set('WIDTH', { value: '800' });
			defines.set('HEIGHT', { value: '600' });

			const line = 'const resolution: vec2<u32> = vec2<u32>(WIDTH, HEIGHT);';
			const expected = 'const resolution: vec2<u32> = vec2<u32>(800, 600);';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		test('macro expansion with operators', () => {
			const defines = new Map<string, Macro>();
			defines.set('SCALE', { value: '2.0' });

			const line = 'const scaled: f32 = value * SCALE;';
			const expected = 'const scaled: f32 = value * 2.0;';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		test('macros should not expand within strings', () => {
			const defines = new Map<string, Macro>();
			defines.set('DEBUG', { value: 'true' });

			const line = 'const message: string = "DEBUG mode is active";';
			const expected = 'const message: string = "DEBUG mode is active";';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		test('macros should only expand when they are complete identifiers', () => {
			const defines = new Map<string, Macro>();
			defines.set('VAR', { value: '123' });

			const line = 'const myVARiable: u32 = 5;';
			const expected = 'const myVARiable: u32 = 5;';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		test('empty macros are expanded to empty strings', () => {
			const defines = new Map<string, Macro>();
			defines.set('EMPTY', { value: '' });

			const line = 'const value = EMPTY;';
			const expected = 'const value = ;';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		test('macros with spaces in their values', () => {
			const defines = new Map<string, Macro>();
			defines.set('COMMENT', { value: '/* This is a comment */' });

			const line = 'const value = 5; COMMENT';
			const expected = 'const value = 5; /* This is a comment */';

			expect(expandMacros(line, defines)).toBe(expected);
		});
	});

	// Function-like macro expansion tests
	describe('Function-like macro expansion', () => {
		test('basic function-like macro', () => {
			const defines = new Map<string, Macro>();
			defines.set('MIN', { value: '((a) < (b) ? (a) : (b))', params: ['a', 'b'] });

			const line = 'const minValue = MIN(x, y);';
			const expected = 'const minValue = ((x) < (y) ? (x) : (y));';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		test('function-like macro with multiple parameters', () => {
			const defines = new Map<string, Macro>();
			defines.set('CLAMP', {
				value: '((x) < (min) ? (min) : ((x) > (max) ? (max) : (x)))',
				params: ['x', 'min', 'max']
			});

			const line = 'const clampedValue = CLAMP(value, 0.0, 1.0);';
			const expected = 'const clampedValue = ((value) < (0.0) ? (0.0) : ((value) > (1.0) ? (1.0) : (value)));';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		test('function-like macro with complex arguments', () => {
			const defines = new Map<string, Macro>();
			defines.set('DOT', { value: '((a).x * (b).x + (a).y * (b).y)', params: ['a', 'b'] });

			const line = 'const dotProduct = DOT(vec1, vec2 + offset);';
			const expected = 'const dotProduct = ((vec1).x * (vec2 + offset).x + (vec1).y * (vec2 + offset).y);';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		test('function-like macro with nested parentheses in arguments', () => {
			const defines = new Map<string, Macro>();
			defines.set('APPLY', { value: 'fn((x))', params: ['x'] });

			const line = 'const result = APPLY(calculate(a, (b + c)));';
			const expected = 'const result = fn((calculate(a, (b + c))));';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		test('function-like macro with wrong number of arguments throws error', () => {
			const defines = new Map<string, Macro>();
			defines.set('FUNC', { value: 'a + b', params: ['a', 'b'] });

			const line = 'const result = FUNC(1);';

			expect(() => expandMacros(line, defines)).toThrow(/expects 2 arguments, got 1/);
		});

		test('multiple function-like macros in one line', () => {
			const defines = new Map<string, Macro>();
			defines.set('SQR', { value: '((x) * (x))', params: ['x'] });
			defines.set('ABS', { value: '((x) < 0 ? -(x) : (x))', params: ['x'] });

			const line = 'const value = SQR(ABS(x));';
			const expected = 'const value = ((((x) < 0 ? -(x) : (x))) * (((x) < 0 ? -(x) : (x))));';

			expect(expandMacros(line, defines)).toBe(expected);
		});
	});

	// Nested and recursive macro expansion tests
	describe('Nested and recursive macro expansion', () => {
		test('nested macro expansion', () => {
			const defines = new Map<string, Macro>();
			defines.set('WIDTH', { value: '800' });
			defines.set('HEIGHT', { value: '600' });
			defines.set('RESOLUTION', { value: 'vec2<f32>(WIDTH, HEIGHT)' });

			const line = 'const res = RESOLUTION;';
			const expected = 'const res = vec2<f32>(800, 600);';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		test('macro expansion in function-like macro arguments', () => {
			const defines = new Map<string, Macro>();
			defines.set('WIDTH', { value: '800' });
			defines.set('HALF', { value: '((x) / 2)', params: ['x'] });

			const line = 'const halfWidth = HALF(WIDTH);';
			const expected = 'const halfWidth = ((800) / 2);';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		test('recursive macro expansion should terminate', () => {
			const defines = new Map<string, Macro>();
			defines.set('A', { value: 'B' });
			defines.set('B', { value: 'A' });

			const line = 'const value = A;';

			// This should complete without infinite recursion
			expect(() => expandMacros(line, defines)).not.toThrow();
		});

		test('complex nested macro expansion', () => {
			const defines = new Map<string, Macro>();
			defines.set('PI', { value: '3.14159' });
			defines.set('SQUARE', { value: '((x) * (x))', params: ['x'] });
			defines.set('CIRCLE_AREA', { value: 'PI * SQUARE(r)', params: ['r'] });

			const line = 'const area = CIRCLE_AREA(radius);';
			const expected = 'const area = 3.14159 * ((radius) * (radius));';

			expect(expandMacros(line, defines)).toBe(expected);
		});
	});

	// Edge cases and special handling
	describe('Edge cases and special handling', () => {
		test('single-letter macro names should not expand within words', () => {
			const defines = new Map<string, Macro>();
			defines.set('A', { value: '1' });
			defines.set('B', { value: '2' });

			const line = 'const Apples and Bananas = A + B;';
			const expected = 'const Apples and Bananas = 1 + 2;';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		test('single-letter macros should only expand when standalone', () => {
			const defines = new Map<string, Macro>();
			defines.set('A', { value: '1' });

			const line = 'A is defined and A + A = 2A';
			const expected = '1 is defined and 1 + 1 = 21';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		test('macro expansion with whitespace in names', () => {
			const defines = new Map<string, Macro>();
			defines.set('MACRO_NAME', { value: 'expanded' });

			const line = 'const value = MACRO_NAME ;';
			const expected = 'const value = expanded ;';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		test('no macros defined', () => {
			const defines = new Map<string, Macro>();

			const line = 'const value = 5;';
			const expected = 'const value = 5;';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		test('case sensitivity in macro names', () => {
			const defines = new Map<string, Macro>();
			defines.set('VALUE', { value: '123' });

			const line = 'const x = VALUE; const y = value;';
			const expected = 'const x = 123; const y = value;';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		// New tests for the special handling of "X is defined" pattern
		test('preserves macro name in "X is defined" pattern', () => {
			const defines = new Map<string, Macro>();
			defines.set('A', { value: '100' });
			defines.set('B', { value: '200' });

			const line = 'A is defined';
			const expected = 'A is defined';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		test('correctly expands macros in "X is defined" lines with values', () => {
			const defines = new Map<string, Macro>();
			defines.set('A', { value: '100' });
			defines.set('B', { value: '200' });
			defines.set('C', { value: '300' });

			const input = `A is defined
		B is defined
		C is defined`;
			const expected = `100 is defined
		200 is defined
		300 is defined`;

			expect(expandMacros(input, defines)).toBe(expected);
		});

		test('only preserves exact "X is defined" pattern', () => {
			const defines = new Map<string, Macro>();
			defines.set('A', { value: '100' });
			defines.set('DEBUG', { value: 'true' });

			const input = `A is defined
A is something else
DEBUG is activated
const x = A;`;
			const expected = `100 is defined
100 is something else
true is activated
const x = 100;`;

			expect(expandMacros(input, defines)).toBe(expected);
		});

		test('handles whitespace in "X is defined" pattern', () => {
			const defines = new Map<string, Macro>();
			defines.set('A', { value: '100' });

			const inputs = [
				'A is defined',
				'  A is defined',
				'A  is defined',
				'A is  defined'
			];

			inputs.forEach(input => {
				expect(expandMacros(input, defines)).toBe(input);
			});
		});

		test('regular macro expansion still works alongside "X is defined" pattern', () => {
			const defines = new Map<string, Macro>();
			defines.set('A', { value: '100' });
			defines.set('B', { value: '200' });

			const input = `A is defined
const sum = A + B;`;
			const expected = `100 is defined
const sum = 100 + 200;`;

			expect(expandMacros(input, defines)).toBe(expected);
		});

		test('consistently expands macros in comments and code', () => {
			const defines = new Map<string, Macro>();
			defines.set('FEATURE', { value: 'enabled' });
			defines.set('VERSION', { value: '2.0' });

			const input = `/* 
		 * FEATURE is defined in version VERSION
		 * This means:
		 * FEATURE is defined
		 */
		if (true) {
		  // VERSION is defined as 2.0
		  FEATURE is defined here
		  const version = VERSION;
		}`;
			const expected = `/* 
		 * enabled is defined in version 2.0
		 * This means:
		 * enabled is defined
		 */
		if (true) {
		  // 2.0 is defined as 2.0
		  enabled is defined here
		  const version = 2.0;
		}`;

			expect(expandMacros(input, defines)).toBe(expected);
		});
	});

	// Real-world examples
	describe('Real-world examples', () => {
		test('shader constants example', () => {
			const defines = new Map<string, Macro>();
			defines.set('MAX_LIGHTS', { value: '4' });
			defines.set('SHADOW_QUALITY', { value: '2' });
			defines.set('SHADOW_MAP_SIZE', { value: '1024 << SHADOW_QUALITY' });

			const line = 'const shadowMapSize: u32 = SHADOW_MAP_SIZE; const maxLights: u32 = MAX_LIGHTS;';
			const expected = 'const shadowMapSize: u32 = 1024 << 2; const maxLights: u32 = 4;';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		test('math utilities example', () => {
			const defines = new Map<string, Macro>();
			defines.set('SQR', { value: '((x) * (x))', params: ['x'] });
			defines.set('CUBE', { value: '((x) * (x) * (x))', params: ['x'] });
			defines.set('POW2', { value: 'SQR(x)', params: ['x'] });
			defines.set('DISTANCE', { value: 'sqrt(SQR(a.x - b.x) + SQR(a.y - b.y))', params: ['a', 'b'] });

			const line = 'const d = DISTANCE(p1, p2); const p = POW2(x) + CUBE(y);';
			const expected = 'const d = sqrt(((p1.x - p2.x) * (p1.x - p2.x)) + ((p1.y - p2.y) * (p1.y - p2.y))); const p = ((x) * (x)) + ((y) * (y) * (y));';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		test('WGSL shader example', () => {
			const defines = new Map<string, Macro>();
			defines.set('WORKGROUP_SIZE', { value: '64' });
			defines.set('PI', { value: '3.14159' });
			defines.set('TO_RADIANS', { value: '((deg) * PI / 180.0)', params: ['deg'] });

			const line = `
@compute @workgroup_size(WORKGROUP_SIZE)
fn compute_main(@builtin(global_invocation_id) id: vec3<u32>) {
  let angle = TO_RADIANS(45.0);
}`;
			const expected = `
@compute @workgroup_size(64)
fn compute_main(@builtin(global_invocation_id) id: vec3<u32>) {
  let angle = ((45.0) * 3.14159 / 180.0);
}`;

			expect(expandMacros(line, defines)).toBe(expected);
		});

		test('multi-level expansion with builtins', () => {
			const defines = new Map<string, Macro>();
			defines.set('VEC3', { value: 'vec3<f32>', });
			defines.set('NORMALIZE', { value: 'normalize', });
			defines.set('NORMAL_VEC', { value: 'NORMALIZE(VEC3(x, y, z))', params: ['x', 'y', 'z'] });

			const line = 'let normal = NORMAL_VEC(0.0, 1.0, 0.0);';
			const expected = 'let normal = normalize(vec3<f32>(0.0, 1.0, 0.0));';

			expect(expandMacros(line, defines)).toBe(expected);
		});

		// New test for nested conditional use case
		test('preprocessor directive comments example', () => {
			const defines = new Map<string, Macro>();
			defines.set('A', { value: '' });
			defines.set('B', { value: '' });
			defines.set('C', { value: '' });

			const input = `
#ifdef A
A is defined
#ifdef B
B is defined
#ifdef C
C is defined
#endif
#endif
#endif
`;
			const expected = `
#ifdef 
 is defined
#ifdef 
 is defined
#ifdef 
 is defined
#endif
#endif
#endif
`;

			expect(expandMacros(input, defines)).toBe(expected);
		});
	});

	describe('Basic macro expansion', () => {
		test('simple macro expansion', () => {
			defines.set('WIDTH', { value: '800' });
			defines.set('HEIGHT', { value: '600' });

			const input = 'var<private> resolution = vec2<f32>(WIDTH, HEIGHT);';
			const expected = 'var<private> resolution = vec2<f32>(800, 600);';

			expect(expandMacros(input, defines)).toBe(expected);
		});

		test('macro with no replacement value', () => {
			defines.set('DEBUG', { value: '' });

			const input = 'var<private> isDebug = DEBUG == 1;';
			const expected = 'var<private> isDebug =  == 1;';

			expect(expandMacros(input, defines)).toBe(expected);
		});

		test('macros with single letter names', () => {
			defines.set('X', { value: '10.0' });
			defines.set('Y', { value: '20.0' });

			const input = 'var<private> position = vec2<f32>(X, Y);';
			const expected = 'var<private> position = vec2<f32>(10.0, 20.0);';

			expect(expandMacros(input, defines)).toBe(expected);
		});
	});

	describe('Nested macro expansion', () => {
		test('nested macro expansion', () => {
			defines.set('WIDTH', { value: '800' });
			defines.set('HEIGHT', { value: '600' });
			defines.set('RESOLUTION', { value: 'vec2<f32>(WIDTH, HEIGHT)' });

			const input = 'var<private> resolution = RESOLUTION;';
			const expected = 'var<private> resolution = vec2<f32>(800, 600);';

			expect(expandMacros(input, defines)).toBe(expected);
		});

		test('complex nested macros', () => {
			defines.set('WIDTH', { value: '800' });
			defines.set('HEIGHT', { value: '600' });
			defines.set('RESOLUTION', { value: 'vec2<f32>(WIDTH, HEIGHT)' });
			defines.set('ASPECT_RATIO', { value: '(float(WIDTH) / float(HEIGHT))' });
			defines.set('FOV', { value: '45.0' });
			defines.set('CAMERA_SETTINGS', { value: 'vec4<f32>(ASPECT_RATIO, FOV, 0.1, 100.0)' });

			const input = 'var<private> cameraSettings = CAMERA_SETTINGS;';
			const expected = 'var<private> cameraSettings = vec4<f32>((float(800) / float(600)), 45.0, 0.1, 100.0);';

			expect(expandMacros(input, defines)).toBe(expected);
		});

		test('deeply nested macros', () => {
			defines.set('A', { value: 'B' });
			defines.set('B', { value: 'C' });
			defines.set('C', { value: 'D' });
			defines.set('D', { value: 'E' });
			defines.set('E', { value: 'final value' });

			const input = 'var<private> result = A;';
			const expected = 'var<private> result = final value;';

			expect(expandMacros(input, defines)).toBe(expected);
		});

		test('macros in arithmetic expressions', () => {
			defines.set('WIDTH', { value: '800' });
			defines.set('HALF_WIDTH', { value: 'WIDTH / 2' });
			defines.set('QUARTER_WIDTH', { value: 'HALF_WIDTH / 2' });

			const input = 'var<private> size = QUARTER_WIDTH;';
			const expected = 'var<private> size = 800 / 2 / 2;';

			expect(expandMacros(input, defines)).toBe(expected);
		});
	});

	describe('Function-like macros', () => {
		test('simple function-like macro', () => {
			defines.set('MIN', { value: '((a) < (b) ? (a) : (b))', params: ['a', 'b'] });

			const input = 'var<private> minValue = MIN(5, 10);';
			const expected = 'var<private> minValue = ((5) < (10) ? (5) : (10));';

			expect(expandMacros(input, defines)).toBe(expected);
		});

		test('function-like macro with complex arguments', () => {
			defines.set('VEC2', { value: 'vec2<f32>(x, y)', params: ['x', 'y'] });

			const input = 'var<private> pos = VEC2(10.0 + 5.0, HEIGHT / 2);';
			const expected = 'var<private> pos = vec2<f32>(10.0 + 5.0, HEIGHT / 2);';

			expect(expandMacros(input, defines)).toBe(expected);
		});

		test('nested function-like macros', () => {
			defines.set('WIDTH', { value: '800' });
			defines.set('HEIGHT', { value: '600' });
			defines.set('VEC2', { value: 'vec2<f32>(x, y)', params: ['x', 'y'] });
			defines.set('SCREEN_POS', { value: 'VEC2(WIDTH * pos, HEIGHT * pos)', params: ['pos'] });

			const input = 'var<private> screenPos = SCREEN_POS(0.5);';
			const expected = 'var<private> screenPos = vec2<f32>(800 * 0.5, 600 * 0.5);';

			expect(expandMacros(input, defines)).toBe(expected);
		});

		test('function-like macro with another macro in body', () => {
			defines.set('PI', { value: '3.14159' });
			defines.set('CIRCLE_AREA', { value: 'PI * radius * radius', params: ['radius'] });

			const input = 'var<private> area = CIRCLE_AREA(5.0);';
			const expected = 'var<private> area = 3.14159 * 5.0 * 5.0;';

			expect(expandMacros(input, defines)).toBe(expected);
		});
	});

	describe('String literal protection', () => {
		test('macros are not expanded in string literals', () => {
			defines.set('WIDTH', { value: '800' });
			defines.set('HEIGHT', { value: '600' });

			const input = 'const message = "Screen size: WIDTH x HEIGHT";';
			const expected = 'const message = "Screen size: WIDTH x HEIGHT";';

			expect(expandMacros(input, defines)).toBe(expected);
		});

		test('handles escaped quotes in strings', () => {
			defines.set('MSG', { value: 'Hello' });

			const input = 'const str = "This has \\"MSG\\" inside quotes";';
			const expected = 'const str = "This has \\"MSG\\" inside quotes";';

			expect(expandMacros(input, defines)).toBe(expected);
		});

		test('handles mixed string literals and macro expansion', () => {
			defines.set('WIDTH', { value: '800' });

			const input = 'const msg = "Width: " + WIDTH + "px";';
			const expected = 'const msg = "Width: " + 800 + "px";';

			expect(expandMacros(input, defines)).toBe(expected);
		});
	});

	describe('Edge cases and error handling', () => {
		test('handles recursive macros with iteration limit', () => {
			// This would cause infinite recursion without a limit
			defines.set('RECURSIVE', { value: 'RECURSIVE + 1' });

			const input = 'var<private> x = RECURSIVE;';

			// The exact result may vary depending on MAX_ITERATIONS, but it should stop eventually
			const result = expandMacros(input, defines);
			expect(result).not.toBe(input); // Should have done some expansion
			expect(result.includes('RECURSIVE')).toBeTruthy(); // But eventually stops
		});

		test('handles macro expansion in partial words', () => {
			defines.set('VAR', { value: 'variable' });

			const input = 'var<private> myVARiable = 10;';
			const expected = 'var<private> myVARiable = 10;'; // Should not expand within a word

			expect(expandMacros(input, defines)).toBe(expected);
		});

		test('handles multiple macro expansions in one line', () => {
			defines.set('X', { value: '10' });
			defines.set('Y', { value: '20' });
			defines.set('Z', { value: '30' });

			const input = 'var<private> sum = X + Y + Z;';
			const expected = 'var<private> sum = 10 + 20 + 30;';

			expect(expandMacros(input, defines)).toBe(expected);
		});

		test('handles the "is defined" pattern correctly', () => {
			defines.set('DEBUG', { value: '1' });

			const input = 'DEBUG is defined';

			// This should not be expanded because it's a special pattern
			expect(expandMacros(input, defines)).toBe(input);
		});

		test('handles sequential expansions correctly', () => {
			defines.set('A', { value: 'B' });
			defines.set('B', { value: 'C' });
			defines.set('AB', { value: 'combined' });

			// We should expand A to B first, then check for macros again
			// rather than looking for the nonexistent AB macro
			const input = 'var<private> result = A;';
			const expected = 'var<private> result = C;';

			expect(expandMacros(input, defines)).toBe(expected);
		});

		test('function-like macro with wrong argument count throws error', () => {
			defines.set('MIN', { value: '((a) < (b) ? (a) : (b))', params: ['a', 'b'] });

			const input = 'var<private> minValue = MIN(5);'; // Missing one argument

			expect(() => expandMacros(input, defines)).toThrow();
		});
	});

	describe('Regression tests', () => {
		test('original failing test case - CAMERA_SETTINGS expansion', () => {
			defines.set('WIDTH', { value: '800' });
			defines.set('HEIGHT', { value: '600' });
			defines.set('ASPECT_RATIO', { value: '(float(WIDTH) / float(HEIGHT))' });
			defines.set('FOV', { value: '45.0' });
			defines.set('CAMERA_SETTINGS', { value: 'vec4<f32>(ASPECT_RATIO, FOV, 0.1, 100.0)' });

			const input = 'var<private> cameraSettings = CAMERA_SETTINGS;';
			const expected = 'var<private> cameraSettings = vec4<f32>((float(800) / float(600)), 45.0, 0.1, 100.0);';

			expect(expandMacros(input, defines)).toBe(expected);
		});

		test('nested macros with string literal handling', () => {
			defines.set('WIDTH', { value: '800' });
			defines.set('RES_INFO', { value: '"Width is " + WIDTH' });

			const input = 'var<private> info = RES_INFO;';
			const expected = 'var<private> info = "Width is " + 800;';

			expect(expandMacros(input, defines)).toBe(expected);
		});

		test('expansion in function-like macro argument', () => {
			defines.set('SIZE', { value: '100' });
			defines.set('SCALE', { value: 'size * factor', params: ['size', 'factor'] });

			const input = 'var<private> result = SCALE(SIZE, 2.0);';
			const expected = 'var<private> result = 100 * 2.0;';

			expect(expandMacros(input, defines)).toBe(expected);
		});
	});
});

describe('Preprocessor Expression Evaluator', () => {
	// Setup for all tests
	let defines: Map<string, Macro>;

	beforeEach(() => {
		defines = new Map<string, Macro>();
		// Set up some common defines for testing
		defines.set('TRUE', { value: '1' });
		defines.set('FALSE', { value: '0' });
		defines.set('VERSION', { value: '2' });
		defines.set('ZERO', { value: '0' });
		defines.set('EMPTY', { value: '' });
		defines.set('PLATFORM', { value: '3' });
	});

	// Basic numeric literal evaluation
	describe('Numeric literal evaluation', () => {
		test('non-zero numbers evaluate to true', () => {
			expect(evaluateExpression('1', defines)).toBe(true);
			expect(evaluateExpression('42', defines)).toBe(true);
			expect(evaluateExpression('-1', defines)).toBe(true);
		});

		test('zero evaluates to false', () => {
			expect(evaluateExpression('0', defines)).toBe(false);
		});

		test('numbers with whitespace', () => {
			expect(evaluateExpression(' 1 ', defines)).toBe(true);
			expect(evaluateExpression(' 0 ', defines)).toBe(false);
		});
	});

	// Comparisons
	describe('Comparison operators', () => {
		test('equal comparison', () => {
			expect(evaluateExpression('1 == 1', defines)).toBe(true);
			expect(evaluateExpression('1 == 2', defines)).toBe(false);
			expect(evaluateExpression('VERSION == 2', defines)).toBe(true);
			expect(evaluateExpression('VERSION == 3', defines)).toBe(false);
		});

		test('not equal comparison', () => {
			expect(evaluateExpression('1 != 2', defines)).toBe(true);
			expect(evaluateExpression('1 != 1', defines)).toBe(false);
			expect(evaluateExpression('VERSION != 3', defines)).toBe(true);
			expect(evaluateExpression('VERSION != 2', defines)).toBe(false);
		});

		test('greater than comparison', () => {
			expect(evaluateExpression('2 > 1', defines)).toBe(true);
			expect(evaluateExpression('1 > 2', defines)).toBe(false);
			expect(evaluateExpression('VERSION > 1', defines)).toBe(true);
			expect(evaluateExpression('VERSION > 2', defines)).toBe(false);
		});

		test('less than comparison', () => {
			expect(evaluateExpression('1 < 2', defines)).toBe(true);
			expect(evaluateExpression('2 < 1', defines)).toBe(false);
			expect(evaluateExpression('VERSION < 3', defines)).toBe(true);
			expect(evaluateExpression('VERSION < 2', defines)).toBe(false);
		});

		test('greater than or equal comparison', () => {
			expect(evaluateExpression('2 >= 1', defines)).toBe(true);
			expect(evaluateExpression('2 >= 2', defines)).toBe(true);
			expect(evaluateExpression('1 >= 2', defines)).toBe(false);
			expect(evaluateExpression('VERSION >= 2', defines)).toBe(true);
			expect(evaluateExpression('VERSION >= 3', defines)).toBe(false);
		});

		test('less than or equal comparison', () => {
			expect(evaluateExpression('1 <= 2', defines)).toBe(true);
			expect(evaluateExpression('2 <= 2', defines)).toBe(true);
			expect(evaluateExpression('2 <= 1', defines)).toBe(false);
			expect(evaluateExpression('VERSION <= 2', defines)).toBe(true);
			expect(evaluateExpression('VERSION <= 1', defines)).toBe(false);
		});
	});

	// Boolean logic
	describe('Boolean logic operators', () => {
		test('logical AND', () => {
			expect(evaluateExpression('1 && 1', defines)).toBe(true);
			expect(evaluateExpression('1 && 0', defines)).toBe(false);
			expect(evaluateExpression('0 && 1', defines)).toBe(false);
			expect(evaluateExpression('0 && 0', defines)).toBe(false);
			expect(evaluateExpression('TRUE && TRUE', defines)).toBe(true);
			expect(evaluateExpression('TRUE && FALSE', defines)).toBe(false);
		});

		test('logical OR', () => {
			expect(evaluateExpression('1 || 1', defines)).toBe(true);
			expect(evaluateExpression('1 || 0', defines)).toBe(true);
			expect(evaluateExpression('0 || 1', defines)).toBe(true);
			expect(evaluateExpression('0 || 0', defines)).toBe(false);
			expect(evaluateExpression('TRUE || FALSE', defines)).toBe(true);
			expect(evaluateExpression('FALSE || FALSE', defines)).toBe(false);
		});

		test('logical NOT', () => {
			expect(evaluateExpression('!0', defines)).toBe(true);
			expect(evaluateExpression('!1', defines)).toBe(false);
			expect(evaluateExpression('!TRUE', defines)).toBe(false);
			expect(evaluateExpression('!FALSE', defines)).toBe(true);
		});

		test('parenthesized expressions', () => {
			expect(evaluateExpression('(1 && 0) || 1', defines)).toBe(true);
			expect(evaluateExpression('1 && (0 || 1)', defines)).toBe(true);
			expect(evaluateExpression('!(1 && 0)', defines)).toBe(true);
			expect(evaluateExpression('!(TRUE && FALSE)', defines)).toBe(true);
		});
	});

	// defined() operator
	describe('defined() operator', () => {
		test('defined() with defined macros', () => {
			expect(evaluateExpression('defined(VERSION)', defines)).toBe(true);
			expect(evaluateExpression('defined(TRUE)', defines)).toBe(true);
		});

		test('defined() with undefined macros', () => {
			expect(evaluateExpression('defined(UNDEFINED)', defines)).toBe(false);
			expect(evaluateExpression('defined(MISSING)', defines)).toBe(false);
		});

		test('defined() with whitespace', () => {
			expect(evaluateExpression('defined( VERSION )', defines)).toBe(true);
			expect(evaluateExpression('defined( UNDEFINED )', defines)).toBe(false);
		});

		test('defined() with logical operators', () => {
			expect(evaluateExpression('defined(VERSION) && defined(TRUE)', defines)).toBe(true);
			expect(evaluateExpression('defined(VERSION) && defined(UNDEFINED)', defines)).toBe(false);
			expect(evaluateExpression('defined(VERSION) || defined(UNDEFINED)', defines)).toBe(true);
			expect(evaluateExpression('defined(UNDEFINED) || defined(MISSING)', defines)).toBe(false);
		});

		test('defined() with NOT operator', () => {
			expect(evaluateExpression('!defined(UNDEFINED)', defines)).toBe(true);
			expect(evaluateExpression('!defined(VERSION)', defines)).toBe(false);
		});
	});

	// Complex expressions
	describe('Complex expressions', () => {
		test('mixed comparison and logical operators', () => {
			expect(evaluateExpression('VERSION > 1 && VERSION < 3', defines)).toBe(true);
			expect(evaluateExpression('VERSION > 2 || VERSION < 1', defines)).toBe(false);
			expect(evaluateExpression('VERSION == 2 && defined(PLATFORM)', defines)).toBe(true);
		});

		test('complex nested expressions', () => {
			expect(evaluateExpression('(VERSION > 1 && VERSION < 3) || defined(UNDEFINED)', defines)).toBe(true);
			expect(evaluateExpression('VERSION == 2 && (PLATFORM == 3 || defined(UNDEFINED))', defines)).toBe(true);
			expect(evaluateExpression('(VERSION != 2 || !defined(PLATFORM)) && (ZERO || TRUE)', defines)).toBe(false);
		});

		test('real-world like expressions', () => {
			// Shader feature check
			expect(evaluateExpression('VERSION >= 2 && defined(PLATFORM) && PLATFORM == 3', defines)).toBe(true);

			// Version compatibility check
			defines.set('MIN_VERSION', { value: '1' });
			defines.set('MAX_VERSION', { value: '3' });
			expect(evaluateExpression('VERSION >= MIN_VERSION && VERSION <= MAX_VERSION', defines)).toBe(true);

			// Feature flags
			defines.set('ENABLE_SHADOWS', { value: '1' });
			defines.set('SHADOW_QUALITY', { value: '2' });
			expect(evaluateExpression('defined(ENABLE_SHADOWS) && SHADOW_QUALITY >= 2', defines)).toBe(true);
		});
	});

	// Edge cases
	describe('Edge cases', () => {
		test('empty expression handling', () => {
			expect(evaluateExpression('', defines)).toBe(false);
			expect(evaluateExpression(' ', defines)).toBe(false);
		});

		test('evaluating empty macros', () => {
			// Empty macros typically evaluate to 0 in C preprocessors
			expect(evaluateExpression('EMPTY', defines)).toBe(false);
			expect(evaluateExpression('EMPTY == 0', defines)).toBe(true);
		});

		test('evaluating function-like macros', () => {
			defines.set('FUNC', { value: 'value', params: ['x'] });
			// Function-like macros without arguments should not be expanded
			expect(evaluateExpression('defined(FUNC)', defines)).toBe(true);
			expect(evaluateExpression('FUNC', defines)).toBe(false); // Treated as 0 since it's not expanded
		});

		test('macros that evaluate to expressions', () => {
			defines.set('EXPR', { value: '1 + 2' });
			// This should evaluate to 3, which is truthy
			expect(evaluateExpression('EXPR', defines)).toBe(true);
			expect(evaluateExpression('EXPR == 3', defines)).toBe(true);
		});

		test('handling of invalid expressions', () => {
			// The evaluator should return false for invalid expressions rather than throwing
			expect(evaluateExpression('VERSION ==', defines)).toBe(false);
			expect(evaluateExpression('&&', defines)).toBe(false);
			expect(evaluateExpression('(VERSION', defines)).toBe(false);

			// Test more complex invalid expressions
			expect(evaluateExpression('VERSION == && PLATFORM', defines)).toBe(false);
			expect(evaluateExpression('(VERSION > 2', defines)).toBe(false);
			expect(evaluateExpression('VERSION > < 2', defines)).toBe(false);
		});
	});

	// Advanced use cases
	describe('Advanced use cases', () => {
		test('platform detection expression', () => {
			defines.set('WINDOWS', { value: '1' });
			defines.set('MACOS', { value: '0' });
			defines.set('LINUX', { value: '0' });

			const platformExpr = 'WINDOWS || MACOS || LINUX';
			expect(evaluateExpression(platformExpr, defines)).toBe(true);

			defines.set('WINDOWS', { value: '0' });
			expect(evaluateExpression(platformExpr, defines)).toBe(false);
		});

		test('feature flag combinations', () => {
			defines.set('OPENGL', { value: '1' });
			defines.set('OPENGL_VERSION', { value: '450' });
			defines.set('REQUIRE_COMPUTE', { value: '1' });

			const featureExpr = '(OPENGL && OPENGL_VERSION >= 430) || (VULKAN && defined(VULKAN_VERSION))';
			expect(evaluateExpression(featureExpr, defines)).toBe(true);

			defines.set('OPENGL_VERSION', { value: '330' });
			expect(evaluateExpression(featureExpr, defines)).toBe(false);

			defines.set('VULKAN', { value: '1' });
			defines.set('VULKAN_VERSION', { value: '11' });
			expect(evaluateExpression(featureExpr, defines)).toBe(true);
		});

		test('version range detection', () => {
			defines.set('API_VERSION', { value: '202' });

			// Check if version is within a specific range
			expect(evaluateExpression('API_VERSION >= 200 && API_VERSION < 300', defines)).toBe(true);
			expect(evaluateExpression('API_VERSION >= 300 || API_VERSION < 100', defines)).toBe(false);

			// Version comparison with multiple conditions
			const versionExpr = '(API_VERSION >= 200 && API_VERSION < 300) || (API_VERSION >= 400 && defined(EXPERIMENTAL))';
			expect(evaluateExpression(versionExpr, defines)).toBe(true);

			defines.set('API_VERSION', { value: '450' });
			defines.set('EXPERIMENTAL', { value: '1' });
			expect(evaluateExpression(versionExpr, defines)).toBe(true);

			defines.set('API_VERSION', { value: '450' });
			defines.delete('EXPERIMENTAL');
			expect(evaluateExpression(versionExpr, defines)).toBe(false);
		});

		// New test cases for C preprocessor token comparison behavior
		test('C preprocessor token comparison behavior', () => {
			// Case 1: RENDERER == VULKAN where RENDERER='VULKAN' and VULKAN is undefined
			defines.set('RENDERER', { value: 'VULKAN' });
			expect(evaluateExpression('RENDERER == VULKAN', defines)).toBe(true);

			// Case 2: Reversed order (VULKAN == RENDERER)
			expect(evaluateExpression('VULKAN == RENDERER', defines)).toBe(true);

			// Case 3: Using the pattern in a more complex expression
			defines.set('ENABLE_FEATURE', { value: '1' });
			expect(evaluateExpression('RENDERER == VULKAN && ENABLE_FEATURE', defines)).toBe(true);

			// Case 4: When there are multiple paths
			defines.set('GRAPHICS_API', { value: 'VULKAN' });
			expect(evaluateExpression('RENDERER == VULKAN || GRAPHICS_API == METAL', defines)).toBe(true);

			// Case 5: With different values (should be false)
			defines.set('RENDERER', { value: 'VULKAN' });
			expect(evaluateExpression('RENDERER == METAL', defines)).toBe(false);

			// Case 6: When both sides are defined with matching values
			defines.set('RENDERER', { value: 'VULKAN' });
			defines.set('API', { value: 'VULKAN' });
			expect(evaluateExpression('RENDERER == API', defines)).toBe(true);

			// Case 7: With a real-world config test
			defines.clear();
			defines.set('RENDERER', { value: 'VULKAN' });
			defines.set('ENABLE_SHADOWS', { value: '1' });
			defines.set('SHADOW_QUALITY', { value: '2' });

			// This is the exact condition from the test that was failing
			expect(evaluateExpression('RENDERER == VULKAN', defines)).toBe(true);
		});
	});
});

describe('Conditional Processor', () => {
	// Setup for all tests
	let defines: Map<string, Macro>;

	beforeEach(() => {
		defines = new Map<string, Macro>();
	});

	// Basic conditional directive processing
	describe('Basic conditional directives', () => {
		test('#if with true condition', () => {
			defines.set('VERSION', { value: '2' });

			const lines = [
				'#if VERSION > 1',
				'include this line',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['include this line']);
		});

		test('#if with false condition', () => {
			defines.set('VERSION', { value: '1' });

			const lines = [
				'#if VERSION > 1',
				'do not include this line',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual([]);
		});

		test('#ifdef with defined macro', () => {
			defines.set('FEATURE', { value: '1' });

			const lines = [
				'#ifdef FEATURE',
				'feature is enabled',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['feature is enabled']);
		});

		test('#ifdef with undefined macro', () => {
			const lines = [
				'#ifdef UNDEFINED_FEATURE',
				'feature is not defined',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual([]);
		});

		test('#ifndef with defined macro', () => {
			defines.set('FEATURE', { value: '1' });

			const lines = [
				'#ifndef FEATURE',
				'feature is not defined',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual([]);
		});

		test('#ifndef with undefined macro', () => {
			const lines = [
				'#ifndef UNDEFINED_FEATURE',
				'feature is not defined',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['feature is not defined']);
		});
	});

	// Else and elif branches
	describe('Else and elif branches', () => {
		test('basic #if-#else structure', () => {
			defines.set('VERSION', { value: '1' });

			const lines = [
				'#if VERSION > 1',
				'if branch',
				'#else',
				'else branch',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['else branch']);
		});

		test('#if-#elif-#else with first branch true', () => {
			defines.set('VERSION', { value: '2' });

			const lines = [
				'#if VERSION == 2',
				'version 2',
				'#elif VERSION == 1',
				'version 1',
				'#else',
				'other version',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['version 2']);
		});

		test('#if-#elif-#else with second branch true', () => {
			defines.set('VERSION', { value: '1' });

			const lines = [
				'#if VERSION == 2',
				'version 2',
				'#elif VERSION == 1',
				'version 1',
				'#else',
				'other version',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['version 1']);
		});

		test('#if-#elif-#else with neither branch true', () => {
			defines.set('VERSION', { value: '3' });

			const lines = [
				'#if VERSION == 2',
				'version 2',
				'#elif VERSION == 1',
				'version 1',
				'#else',
				'other version',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['other version']);
		});

		test('multiple #elif branches', () => {
			defines.set('VERSION', { value: '2' });

			const lines = [
				'#if VERSION == 1',
				'version 1',
				'#elif VERSION == 2',
				'version 2',
				'#elif VERSION == 3',
				'version 3',
				'#else',
				'other version',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['version 2']);
		});

		test('only first true branch is included with multiple #elif', () => {
			defines.set('VALUE', { value: '5' });

			const lines = [
				'#if VALUE > 10',
				'greater than 10',
				'#elif VALUE > 5',
				'greater than 5',
				'#elif VALUE >= 5',
				'greater than or equal to 5',
				'#else',
				'less than 5',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['greater than or equal to 5']);
		});
	});

	// Macro definition and undefinition
	describe('Macro definition and undefinition', () => {
		test('basic #define and usage', () => {
			const lines = [
				'#define WIDTH 800',
				'#define HEIGHT 600',
				'resolution: vec2<f32> = vec2<f32>(WIDTH, HEIGHT);'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['resolution: vec2<f32> = vec2<f32>(800, 600);']);
			expect(defines.has('WIDTH')).toBe(true);
			expect(defines.has('HEIGHT')).toBe(true);
		});

		test('#define within conditional block', () => {
			defines.set('FEATURE', { value: '1' });

			const lines = [
				'#ifdef FEATURE',
				'#define WIDTH 800',
				'width: u32 = WIDTH;',
				'#endif',
				'height: u32 = 600;'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['width: u32 = 800;', 'height: u32 = 600;']);
			expect(defines.has('WIDTH')).toBe(true);
		});

		test('#undef removes macro definition', () => {
			defines.set('FEATURE', { value: '1' });

			const lines = [
				'feature: bool = FEATURE;',
				'#undef FEATURE',
				'#ifdef FEATURE',
				'should not include this',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['feature: bool = 1;']);
			expect(defines.has('FEATURE')).toBe(false);
		});

		test('redefining macros', () => {
			const lines = [
				'#define VERSION 1',
				'version: u32 = VERSION;',
				'#undef VERSION',
				'#define VERSION 2',
				'updated version: u32 = VERSION;'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['version: u32 = 1;', 'updated version: u32 = 2;']);
			expect(defines.get('VERSION')?.value).toBe('2');
		});

		test('function-like macro definition and usage', () => {
			const lines = [
				'#define MAX(a, b) ((a) > (b) ? (a) : (b))',
				'max_value: f32 = MAX(10.0, 5.0);'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['max_value: f32 = ((10.0) > (5.0) ? (10.0) : (5.0));']);
			expect(defines.has('MAX')).toBe(true);
			expect(defines.get('MAX')?.params).toEqual(['a', 'b']);
		});
	});

	// Nested conditionals
	describe('Nested conditionals', () => {
		test('basic nested conditionals', () => {
			defines.set('OUTER', { value: '1' });
			defines.set('INNER', { value: '1' });

			const lines = [
				'#ifdef OUTER',
				'outer start',
				'#ifdef INNER',
				'inner content',
				'#endif',
				'outer end',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['outer start', 'inner content', 'outer end']);
		});

		test('nested conditionals with inner branch excluded', () => {
			defines.set('OUTER', { value: '1' });

			const lines = [
				'#ifdef OUTER',
				'outer start',
				'#ifdef INNER',
				'inner content',
				'#endif',
				'outer end',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['outer start', 'outer end']);
		});

		test('nested conditionals with outer branch excluded', () => {
			defines.set('INNER', { value: '1' });

			const lines = [
				'#ifdef OUTER',
				'outer start',
				'#ifdef INNER',
				'inner content',
				'#endif',
				'outer end',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual([]);
		});

		test('multiple levels of nesting', () => {
			defines.set('LEVEL1', { value: '1' });
			defines.set('LEVEL2', { value: '1' });
			defines.set('LEVEL3', { value: '1' });

			const lines = [
				'#ifdef LEVEL1',
				'level 1 start',
				'#ifdef LEVEL2',
				'level 2 start',
				'#ifdef LEVEL3',
				'level 3 content',
				'#endif',
				'level 2 end',
				'#endif',
				'level 1 end',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual([
				'level 1 start',
				'level 2 start',
				'level 3 content',
				'level 2 end',
				'level 1 end'
			]);
		});

		test('nested conditionals with mixed directive types', () => {
			defines.set('OUTER', { value: '1' });
			defines.set('VALUE', { value: '5' });

			const lines = [
				'#ifdef OUTER',
				'outer start',
				'#if VALUE > 3',
				'value is greater than 3',
				'#else',
				'value is not greater than 3',
				'#endif',
				'outer end',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual([
				'outer start',
				'value is greater than 3',
				'outer end'
			]);
		});

		test('nested if-elif-else constructs', () => {
			defines.set('OUTER', { value: '2' });
			defines.set('INNER', { value: '3' });

			const lines = [
				'#if OUTER == 1',
				'outer is 1',
				'#elif OUTER == 2',
				'outer is 2',
				'#if INNER == 1',
				'inner is 1',
				'#elif INNER == 2',
				'inner is 2',
				'#elif INNER == 3',
				'inner is 3',
				'#endif',
				'#else',
				'outer is neither 1 nor 2',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual([
				'outer is 2',
				'inner is 3'
			]);
		});
	});

	// Custom directives
	describe('Custom directives preservation', () => {
		test('custom directives are preserved', () => {
			const lines = [
				'#binding "data"',
				'#entrypoint "main"',
				'@compute',
				'fn main() {}'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual([
				'#binding "data"',
				'#entrypoint "main"',
				'@compute',
				'fn main() {}'
			]);
		});

		test('custom directives inside included conditional blocks', () => {
			defines.set('FEATURE', { value: '1' });

			const lines = [
				'#ifdef FEATURE',
				'#binding "feature_data"',
				'#entrypoint "feature_main"',
				'fn feature_main() {}',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual([
				'#binding "feature_data"',
				'#entrypoint "feature_main"',
				'fn feature_main() {}'
			]);
		});

		test('custom directives inside excluded conditional blocks', () => {
			const lines = [
				'#ifdef UNDEFINED_FEATURE',
				'#binding "feature_data"',
				'#entrypoint "feature_main"',
				'fn feature_main() {}',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual([]);
		});
	});

	// Error handling
	describe('Error handling', () => {
		test('unmatched #endif throws error', () => {
			const lines = [
				'line 1',
				'#endif',
				'line 2'
			];

			expect(() => processConditionals(lines, defines)).toThrow(/Unexpected #endif/);
		});

		test('unmatched #else throws error', () => {
			const lines = [
				'line 1',
				'#else',
				'line 2'
			];

			expect(() => processConditionals(lines, defines)).toThrow(/Unexpected #else/);
		});

		test('unmatched #elif throws error', () => {
			const lines = [
				'line 1',
				'#elif VALUE > 0',
				'line 2'
			];

			expect(() => processConditionals(lines, defines)).toThrow(/Unexpected #elif/);
		});

		test('missing #endif throws error', () => {
			const lines = [
				'#ifdef FEATURE',
				'line 1'
				// Missing #endif
			];

			expect(() => processConditionals(lines, defines)).toThrow(/Unmatched #if/);
		});
	});

	// Complex real-world scenarios
	describe('Complex real-world scenarios', () => {
		test('shader variant generation', () => {
			defines.set('VARIANT', { value: '2' });

			const lines = [
				'struct VertexOutput {',
				'  @builtin(position) position: vec4<f32>,',
				'  @location(0) uv: vec2<f32>,',
				'#if VARIANT == 1',
				'  @location(1) color: vec3<f32>,',
				'#elif VARIANT == 2',
				'  @location(1) color: vec4<f32>,',
				'  @location(2) normal: vec3<f32>,',
				'#elif VARIANT == 3',
				'  @location(1) color: vec4<f32>,',
				'  @location(2) normal: vec3<f32>,',
				'  @location(3) tangent: vec4<f32>,',
				'#endif',
				'};',
				'',
				'@fragment',
				'fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {',
				'  var output: vec4<f32>;',
				'  ',
				'#if VARIANT == 1',
				'  output = vec4<f32>(input.color, 1.0);',
				'#elif VARIANT == 2',
				'  output = input.color * calculateLighting(input.normal);',
				'#elif VARIANT == 3',
				'  let normalMap = textureSample(normalTexture, normalSampler, input.uv);',
				'  let worldNormal = calculateTBN(input.normal, input.tangent) * normalMap.xyz;',
				'  output = input.color * calculateLighting(worldNormal);',
				'#endif',
				'',
				'  return output;',
				'}'
			];

			const result = processConditionals(lines, defines);
			expect(result).toContain('  @location(1) color: vec4<f32>,');
			expect(result).toContain('  @location(2) normal: vec3<f32>,');
			expect(result).toContain('  output = input.color * calculateLighting(input.normal);');
			expect(result).not.toContain('  @location(3) tangent: vec4<f32>,');
			expect(result).not.toContain('  output = vec4<f32>(input.color, 1.0);');
		});

		test('platform-specific code with nested defines', () => {
			defines.set('MOBILE', { value: '1' });

			const lines = [
				'#ifdef DESKTOP',
				'#define MAX_LIGHTS 16',
				'#define SHADOW_RESOLUTION 2048',
				'#elif defined(MOBILE)',
				'#define MAX_LIGHTS 4',
				'#define SHADOW_RESOLUTION 1024',
				'#else',
				'#define MAX_LIGHTS 8',
				'#define SHADOW_RESOLUTION 1024',
				'#endif',
				'',
				'const maxLights: u32 = MAX_LIGHTS;',
				'const shadowResolution: u32 = SHADOW_RESOLUTION;',
				'',
				'#ifdef MOBILE',
				'#if MAX_LIGHTS > 4',
				'#error Mobile platforms only support up to 4 lights',
				'#endif',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toContain('const maxLights: u32 = 4;');
			expect(result).toContain('const shadowResolution: u32 = 1024;');
			expect(result).not.toContain('#error');
		});

		test('feature configuration with nested conditionals', () => {
			defines.set('RENDERER', { value: 'VULKAN' });
			defines.set('ENABLE_SHADOWS', { value: '1' });
			defines.set('SHADOW_QUALITY', { value: '2' });

			const lines = [
				'// Renderer configuration',
				'#if RENDERER == VULKAN',
				'#define MAX_BINDLESS_RESOURCES 1000000',
				'#elif RENDERER == METAL',
				'#define MAX_BINDLESS_RESOURCES 500000',
				'#else',
				'#define MAX_BINDLESS_RESOURCES 32',
				'#endif',
				'',
				'// Shadow configuration',
				'#ifdef ENABLE_SHADOWS',
				'#if SHADOW_QUALITY == 0',
				'#define SHADOW_MAP_SIZE 512',
				'#define SHADOW_CASCADES 1',
				'#elif SHADOW_QUALITY == 1',
				'#define SHADOW_MAP_SIZE 1024',
				'#define SHADOW_CASCADES 2',
				'#else // SHADOW_QUALITY >= 2',
				'#define SHADOW_MAP_SIZE 2048',
				'#define SHADOW_CASCADES 4',
				'#endif',
				'#else // !ENABLE_SHADOWS',
				'#define SHADOW_MAP_SIZE 0',
				'#define SHADOW_CASCADES 0',
				'#endif',
				'',
				'const maxBindlessResources: u32 = MAX_BINDLESS_RESOURCES;',
				'const shadowMapSize: u32 = SHADOW_MAP_SIZE;',
				'const shadowCascades: u32 = SHADOW_CASCADES;'
			];

			const result = processConditionals(lines, defines);
			expect(result).toContain('const maxBindlessResources: u32 = 1000000;');
			expect(result).toContain('const shadowMapSize: u32 = 2048;');
			expect(result).toContain('const shadowCascades: u32 = 4;');
		});
	});

	// Tests for improved error handling
	describe('Error handling for invalid directive patterns', () => {
		test('multiple #else directives', () => {
			const lines = [
				'#if 1',
				'var<private> value: u32 = 1;',
				'#else',
				'var<private> value: u32 = 2;',
				'#else',
				'var<private> value: u32 = 3;',
				'#endif'
			];

			// Implementation should throw an error for multiple #else directives
			expect(() => processConditionals(lines, defines)).toThrow(/Multiple #else directives/);
		});

		test('#elif after #else', () => {
			const lines = [
				'#if 1',
				'var<private> value: u32 = 1;',
				'#else',
				'var<private> value: u32 = 2;',
				'#elif 0',
				'var<private> value: u32 = 3;',
				'#endif'
			];

			// Implementation should throw an error for #elif after #else
			expect(() => processConditionals(lines, defines)).toThrow(/Unexpected #elif after #else/);
		});

		test('nested errors bubble up correctly', () => {
			const lines = [
				'#ifdef OUTER',
				'outer start',
				'#if 1',
				'inner content',
				'#else',
				'other content',
				'#else',
				'invalid content',
				'#endif',
				'outer end',
				'#endif'
			];

			defines.set('OUTER', { value: '1' });

			// Even when nested, the error should still be detected
			expect(() => processConditionals(lines, defines)).toThrow(/Multiple #else directives/);
		});
	});

	// Tests for whitespace handling
	describe('Whitespace handling in directives', () => {
		test('various whitespace patterns in directives', () => {
			const lines = [
				'#define  SPACE_AFTER_DEFINE  123',
				'#define\tTAB_AFTER_DEFINE\t456',
				'#define NO_SPACE(x) x+1',
				'#if\tSPACE_AFTER_DEFINE\t==\t123',
				'this should be included',
				'#endif',
				'#ifdef\tTAB_AFTER_DEFINE',
				'this should also be included',
				'#endif',
				'var<private> result: u32 = NO_SPACE(42);'
			];

			const result = processConditionals(lines, defines);
			expect(result).toContain('this should be included');
			expect(result).toContain('this should also be included');
			expect(result).toContain('var<private> result: u32 = 42+1;');
		});

		test('mixed whitespace in complex directives', () => {
			const lines = [
				'#define\tMIXED_WHITESPACE   \t   100',
				'#if\t \t MIXED_WHITESPACE\t>\t50\t \t',
				'condition is true',
				'#elif\t\tMIXED_WHITESPACE\t<\t50',
				'condition is false',
				'#else \t ',
				'condition is neither',
				'#endif\t'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['condition is true']);
		});
	});

	// Tests for token comparison semantics (RENDERER == VULKAN case)
	describe('Token comparison semantics', () => {
		test('macro expanding to its identifier', () => {
			defines.set('RENDERER', { value: 'VULKAN' });

			const lines = [
				'#if RENDERER == VULKAN',
				'renderer is vulkan',
				'#else',
				'renderer is not vulkan',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['renderer is vulkan']);
		});

		test('reverse comparison (identifier == macro)', () => {
			defines.set('RENDERER', { value: 'VULKAN' });

			const lines = [
				'#if VULKAN == RENDERER',
				'vulkan is the renderer',
				'#else',
				'vulkan is not the renderer',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['vulkan is the renderer']);
		});

		test('macro comparison with multiple tokens', () => {
			defines.set('API', { value: 'VULKAN' });
			defines.set('RENDERER', { value: 'VULKAN' });

			const lines = [
				'#if API == RENDERER',
				'API matches renderer',
				'#else',
				'API does not match renderer',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['VULKAN matches renderer']);
		});

		test('token comparison with complex expressions', () => {
			defines.set('API', { value: 'VULKAN' });
			defines.set('VERSION', { value: '2' });

			const lines = [
				'#if API == VULKAN && VERSION == 2',
				'right version of vulkan',
				'#elif API == VULKAN',
				'wrong version of vulkan',
				'#else',
				'not vulkan',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['right version of vulkan']);
		});
	});

	// Tests for comment handling in directives
	describe('Comment handling in directives', () => {
		test('comments after directives', () => {
			defines.set('FEATURE', { value: '1' });

			const lines = [
				'#ifdef FEATURE // This is a comment',
				'feature is enabled',
				'#else // This is another comment',
				'feature is disabled',
				'#endif // End of feature check'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['feature is enabled']);
		});

		test('complex comments in directives', () => {
			defines.set('QUALITY', { value: '2' });

			const lines = [
				'#if QUALITY >= 2 // High quality settings',
				'#define TEXTURE_SIZE 2048 // Large textures',
				'#elif QUALITY == 1 // Medium quality',
				'#define TEXTURE_SIZE 1024 // Medium textures',
				'#else // Low quality or undefined',
				'#define TEXTURE_SIZE 512 // Small textures',
				'#endif // End of quality settings',
				'',
				'const textureSize: u32 = TEXTURE_SIZE;'
			];

			const result = processConditionals(lines, defines);
			expect(result).toContain('const textureSize: u32 = 2048;');
		});
	});

	// Tests for common macro patterns
	describe('Common macro patterns', () => {
		test('macros with default values in conditional branches', () => {
			defines.set('MOBILE', { value: '1' });

			const lines = [
				'#ifndef MAX_LIGHTS',
				'#ifdef MOBILE',
				'#define MAX_LIGHTS 4',
				'#else',
				'#define MAX_LIGHTS 16',
				'#endif',
				'#endif',
				'',
				'const maxLights: u32 = MAX_LIGHTS;'
			];

			const result = processConditionals(lines, defines);
			expect(result).toContain('const maxLights: u32 = 4;');
		});

		test('macro redefinition in different branches', () => {
			defines.set('PLATFORM', { value: '2' });

			const lines = [
				'#if PLATFORM == 1 // Windows',
				'#define PLATFORM_STRING "Windows"',
				'#define MAX_INSTANCES 1024',
				'#elif PLATFORM == 2 // MacOS',
				'#define PLATFORM_STRING "MacOS"',
				'#define MAX_INSTANCES 512',
				'#else // Linux or other',
				'#define PLATFORM_STRING "Other"',
				'#define MAX_INSTANCES 256',
				'#endif',
				'',
				'const platform: string = PLATFORM_STRING;',
				'const maxInstances: u32 = MAX_INSTANCES;'
			];

			const result = processConditionals(lines, defines);
			expect(result).toContain('const platform: string = "MacOS";');
			expect(result).toContain('const maxInstances: u32 = 512;');
		});
	});

	// Tests for edge cases in conditional evaluation
	describe('Edge cases in conditional evaluation', () => {
		test('numeric expressions in conditionals', () => {
			defines.set('VALUE', { value: '10' });

			const lines = [
				'#if 20 > VALUE',
				'twenty is greater than value',
				'#else',
				'twenty is not greater than value',
				'#endif',
				'',
				'#if (VALUE * 2) > 15',
				'value times 2 is greater than 15',
				'#else',
				'value times 2 is not greater than 15',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toContain('twenty is greater than value');
			expect(result).toContain('value times 2 is greater than 15');
		});

		test('complex expressions with parentheses', () => {
			defines.set('A', { value: '5' });
			defines.set('B', { value: '3' });

			const lines = [
				'#if (A > B) && (A < 10)',
				'condition met',
				'#endif',
				'',
				'#if (A * B) == 15',
				'product is 15',
				'#else',
				'product is not 15',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toContain('condition met');
			expect(result).toContain('product is 15');
		});

		test('evaluation of zero and empty values', () => {
			defines.set('ZERO', { value: '0' });
			defines.set('EMPTY', { value: '' });

			const lines = [
				'#if ZERO',
				'zero is truthy',
				'#else',
				'zero is falsy',
				'#endif',
				'',
				'#if EMPTY',
				'empty is truthy',
				'#else',
				'empty is falsy',
				'#endif',
				'',
				'#if defined(ZERO)',
				'zero is defined',
				'#else',
				'zero is not defined',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toContain('zero is falsy');
			expect(result).toContain('empty is falsy');
			expect(result).toContain('zero is defined');
		});
	});

	describe('Macro expansion in definitions', () => {
		test('basic macro expansion in definitions', () => {
			const lines = [
				'#define BASE_VALUE 100',
				'#define DOUBLED BASE_VALUE * 2',
				'var<private> result = DOUBLED;'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['var<private> result = 100 * 2;']);
		});

		test('nested macro expansion in definitions', () => {
			const lines = [
				'#define WIDTH 800',
				'#define HEIGHT 600',
				'#define RESOLUTION vec2<f32>(WIDTH, HEIGHT)',
				'#define ASPECT_RATIO (float(WIDTH) / float(HEIGHT))',
				'#define FOV 45.0',
				'#define CAMERA_SETTINGS vec4<f32>(ASPECT_RATIO, FOV, 0.1, 100.0)',
				'var<private> resolution = RESOLUTION;',
				'var<private> cameraSettings = CAMERA_SETTINGS;'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual([
				'var<private> resolution = vec2<f32>(800, 600);',
				'var<private> cameraSettings = vec4<f32>((float(800) / float(600)), 45.0, 0.1, 100.0);'
			]);
		});

		test('chain of macros expansion', () => {
			const lines = [
				'#define A 10',
				'#define B A + 5',
				'#define C B * 2',
				'#define D C - 15',
				'var<private> result = D;'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['var<private> result = 10 + 5 * 2 - 15;']);
		});

		test('redefining macros with expansions', () => {
			const lines = [
				'#define VALUE 100',
				'#define RESULT VALUE + 50',
				'var<private> before = RESULT;',
				'#define VALUE 200',  // Redefine VALUE
				'#define RESULT VALUE + 50',  // Redefine RESULT using new VALUE
				'var<private> after = RESULT;'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual([
				'var<private> before = 100 + 50;',
				'var<private> after = 200 + 50;'
			]);
		});

		test('function-like macros with expanded parameters', () => {
			const lines = [
				'#define WIDTH 800',
				'#define HEIGHT 600',
				'#define SCALED_VEC(factor) vec2<f32>(WIDTH * factor, HEIGHT * factor)',
				'var<private> halfRes = SCALED_VEC(0.5);'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['var<private> halfRes = vec2<f32>(800 * 0.5, 600 * 0.5);']);
		});

		test('function-like macros using other macros in body', () => {
			const lines = [
				'#define WIDTH 800',
				'#define HEIGHT 600',
				'#define ASPECT (float(WIDTH) / float(HEIGHT))',
				'#define PERSPECTIVE(fov) vec4<f32>(ASPECT, fov, 0.1, 100.0)',
				'var<private> perspective = PERSPECTIVE(45.0);'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual([
				'var<private> perspective = vec4<f32>((float(800) / float(600)), 45.0, 0.1, 100.0);'
			]);
		});
	});

	describe('Comments and whitespace in macro definitions', () => {
		test('macros with comments in definition', () => {
			const lines = [
				'#define WIDTH 800 // Screen width',
				'#define HEIGHT 600 // Screen height',
				'#define RESOLUTION vec2<f32>(WIDTH, HEIGHT) // Screen resolution',
				'var<private> resolution = RESOLUTION;'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['var<private> resolution = vec2<f32>(800, 600);']);
		});

		test('macros with trailing whitespace in definition', () => {
			const lines = [
				'#define WIDTH 800    ',
				'#define HEIGHT 600    ',
				'#define RESOLUTION vec2<f32>(WIDTH, HEIGHT)    ',
				'var<private> resolution = RESOLUTION;'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['var<private> resolution = vec2<f32>(800, 600);']);
		});

		test('macros with mixed comments after directives', () => {
			const lines = [
				'#define WIDTH 800 // Width value',
				'#define HEIGHT 600 // Height value',
				'#define ASPECT_RATIO (float(WIDTH) / float(HEIGHT)) // Calculate aspect ratio',
				'#ifdef WIDTH // Check if WIDTH is defined',
				'  var<private> aspectRatio = ASPECT_RATIO;',
				'#else // WIDTH not defined',
				'  var<private> aspectRatio = 1.0;',
				'#endif // End of conditional'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['  var<private> aspectRatio = (float(800) / float(600));']);
		});
	});

	describe('Edge cases for macro expansion in definitions', () => {
		test('macro expansion with string literals', () => {
			const lines = [
				'#define WIDTH 800',
				'#define HEIGHT 600',
				'#define RESOLUTION_STR "Resolution: WIDTHxHEIGHT"', // Shouldn't expand in quotes
				'#define INFO "Size: " + WIDTH + "x" + HEIGHT',      // Should expand outside quotes
				'var<private> info = INFO;'
			];

			const result = processConditionals(lines, defines);
			// WIDTH and HEIGHT should only be expanded outside of string literals
			expect(result).toEqual(['var<private> info = "Size: " + 800 + "x" + 600;']);
		});

		test('recursively defined macros are handled', () => {
			const lines = [
				'#define VERSION 1',
				'#define VERSION_INFO VERSION',    // Linear reference
				'#define VERSION 2',               // Redefine VERSION
				'#define VERSION_STR VERSION_INFO', // Could cause recursive processing
				'var<private> version = VERSION_STR;'
			];

			// This tests that we don't get into infinite recursion
			const result = processConditionals(lines, defines);
			expect(result).toEqual(['var<private> version = 1;']);
		});

		test('macro expansion in conditionals', () => {
			const lines = [
				'#define PLATFORM 1',
				'#define DESKTOP 1',
				'#define MOBILE 2',
				'#if PLATFORM == DESKTOP',
				'  var<private> isMobile = false;',
				'#elif PLATFORM == MOBILE',
				'  var<private> isMobile = true;',
				'#endif'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual(['  var<private> isMobile = false;']);
		});

		test('original failing test case - complex nested expansions', () => {
			const lines = [
				'#define WIDTH 800',
				'#define HEIGHT 600',
				'#define RESOLUTION vec2<f32>(WIDTH, HEIGHT)',
				'#define ASPECT_RATIO (float(WIDTH) / float(HEIGHT))',
				'#define FOV 45.0',
				'#define CAMERA_SETTINGS vec4<f32>(ASPECT_RATIO, FOV, 0.1, 100.0)',
				'',
				'var<private> resolution = RESOLUTION;',
				'var<private> cameraSettings = CAMERA_SETTINGS;'
			];

			const result = processConditionals(lines, defines);
			expect(result).toEqual([
				'',
				'var<private> resolution = vec2<f32>(800, 600);',
				'var<private> cameraSettings = vec4<f32>((float(800) / float(600)), 45.0, 0.1, 100.0);'
			]);
		});

		test('macro redefinition with expanded values', () => {
			const lines = [
				'#define BASE 100',
				'#define VALUE BASE + 50',
				'#undef BASE',             // Undefine BASE
				'#define BASE 200',        // Redefine BASE with different value
				'#define RESULT VALUE * 2', // VALUE should still contain the old, expanded value
				'var<private> result = RESULT;'
			];

			const result = processConditionals(lines, defines);
			// VALUE should have been expanded to "100 + 50" when it was defined
			expect(result).toEqual(['var<private> result = 100 + 50 * 2;']);
		});
	});
});

describe('WGSL Preprocessor', () => {
	// Test basic macro definition and expansion
	describe('Basic #define and expansion', () => {
		test('simple macro expansion', () => {
			const code = `
#define WIDTH 800
#define HEIGHT 600
var<private> resolution: vec2<f32> = vec2<f32>(WIDTH, HEIGHT);
`;
			const expected = `
var<private> resolution: vec2<f32> = vec2<f32>(800, 600);
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('macro without value', () => {
			const code = `
#define ENABLE_FEATURE
#ifdef ENABLE_FEATURE
var<private> featureEnabled: bool = true;
#endif
`;
			const expected = `
var<private> featureEnabled: bool = true;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('macro expansion in expressions', () => {
			const code = `
#define PI 3.14159
#define RADIUS 5.0
var<private> area: f32 = PI * RADIUS * RADIUS;
`;
			const expected = `
var<private> area: f32 = 3.14159 * 5.0 * 5.0;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('multiple macro references in a single line', () => {
			const code = `
#define X 10
#define Y 20
#define Z 30
var<private> sum: i32 = X + Y + Z;
`;
			const expected = `
var<private> sum: i32 = 10 + 20 + 30;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});
	});

	// Test function-like macros
	describe('Function-like macros', () => {
		test('basic function-like macro', () => {
			const code = `
#define MAX(a, b) ((a) > (b) ? (a) : (b))
var<private> maxValue: f32 = MAX(10.0, 5.0);
`;
			const expected = `
var<private> maxValue: f32 = ((10.0) > (5.0) ? (10.0) : (5.0));
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('function-like macro with multiple parameters', () => {
			const code = `
#define CLAMP(x, min, max) ((x) < (min) ? (min) : ((x) > (max) ? (max) : (x)))
var<private> clampedValue: f32 = CLAMP(value, 0.0, 1.0);
`;
			const expected = `
var<private> clampedValue: f32 = ((value) < (0.0) ? (0.0) : ((value) > (1.0) ? (1.0) : (value)));
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('nested function-like macros', () => {
			const code = `
#define SQR(x) ((x) * (x))
#define DIST(x, y) sqrt(SQR(x) + SQR(y))
var<private> distance: f32 = DIST(3.0, 4.0);
`;
			const expected = `
var<private> distance: f32 = sqrt(((3.0) * (3.0)) + ((4.0) * (4.0)));
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('function-like macros with complex arguments', () => {
			const code = `
#define LERP(a, b, t) ((a) * (1.0 - (t)) + (b) * (t))
var<private> lerpResult: f32 = LERP(start + offset, end - offset, time * 0.5);
`;
			const expected = `
var<private> lerpResult: f32 = ((start + offset) * (1.0 - (time * 0.5)) + (end - offset) * (time * 0.5));
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('wrong number of arguments in function-like macro', () => {
			const code = `
#define FUNC(a, b) a + b
var<private> result = FUNC(1, 2, 3);
`;
			expect(() => preprocessWgsl(code)).toThrow(/expects 2 arguments, got 3/);
		});
	});

	// Test #ifdef, #ifndef conditionals
	describe('#ifdef and #ifndef conditionals', () => {
		test('basic #ifdef inclusion', () => {
			const code = `
#define ENABLE_FEATURE
#ifdef ENABLE_FEATURE
var<private> featureEnabled: bool = true;
#endif
`;
			const expected = `
var<private> featureEnabled: bool = true;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('basic #ifdef exclusion', () => {
			const code = `
#ifdef UNDEFINED_FEATURE
var<private> featureEnabled: bool = true;
#endif
`;
			const expected = ``;
			expect(preprocessWgsl(code).trim()).toBe(expected);
		});

		test('basic #ifndef inclusion', () => {
			const code = `
#ifndef UNDEFINED_FEATURE
var<private> featureDisabled: bool = true;
#endif
`;
			const expected = `
var<private> featureDisabled: bool = true;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('basic #ifndef exclusion', () => {
			const code = `
#define DEFINED_FEATURE
#ifndef DEFINED_FEATURE
var<private> featureDisabled: bool = true;
#endif
`;
			const expected = ``;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('#ifdef with macros defined after usage', () => {
			const code = `
#ifdef LATER_DEFINED_FEATURE
var<private> shouldNotBeIncluded: bool = true;
#endif

#define LATER_DEFINED_FEATURE
#ifdef LATER_DEFINED_FEATURE
var<private> shouldBeIncluded: bool = true;
#endif
`;
			const expected = `

var<private> shouldBeIncluded: bool = true;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});
	});

	// Test #if conditionals
	describe('#if conditionals', () => {
		test('basic #if with true condition', () => {
			const code = `
#define VERSION 2
#if VERSION > 1
var<private> newFeatureEnabled: bool = true;
#endif
`;
			const expected = `
var<private> newFeatureEnabled: bool = true;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('basic #if with false condition', () => {
			const code = `
#define VERSION 1
#if VERSION > 1
var<private> newFeatureEnabled: bool = true;
#endif
`;
			const expected = ``;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('#if with complex expression', () => {
			const code = `
#define VERSION 2
#define PLATFORM 1
#if VERSION > 1 && PLATFORM == 1
var<private> platformSpecificFeature: bool = true;
#endif
`;
			const expected = `
var<private> platformSpecificFeature: bool = true;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('#if with defined() operator', () => {
			const code = `
#define FEATURE_X
#if defined(FEATURE_X) && !defined(FEATURE_Y)
var<private> featureConfig: u32 = 1;
#endif
`;
			const expected = `
var<private> featureConfig: u32 = 1;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('#if with numeric expressions', () => {
			const code = `
#define WIDTH 800
#define HEIGHT 600
#if WIDTH / HEIGHT < 2
var<private> aspectRatio: f32 = f32(WIDTH) / f32(HEIGHT);
#endif
`;
			const expected = `
var<private> aspectRatio: f32 = f32(800) / f32(600);
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('#if with zero value is false', () => {
			const code = `
#if 0
var<private> shouldNotBeIncluded: bool = true;
#else
var<private> shouldBeIncluded: bool = true;
#endif
`;
			const expected = `
var<private> shouldBeIncluded: bool = true;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('#if with nonzero value is true', () => {
			const code = `
#if 1
var<private> shouldBeIncluded: bool = true;
#else
var<private> shouldNotBeIncluded: bool = true;
#endif
`;
			const expected = `
var<private> shouldBeIncluded: bool = true;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});
	});

	// Test #elif and #else
	describe('#elif and #else branches', () => {
		test('basic #if-#else structure', () => {
			const code = `
#define VERSION 1
#if VERSION > 1
var<private> newFeature: bool = true;
#else
var<private> legacyFeature: bool = true;
#endif
`;
			const expected = `
var<private> legacyFeature: bool = true;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('complete #if-#elif-#else structure', () => {
			const code = `
#define VERSION 2
#if VERSION == 1
var<private> version1Feature: bool = true;
#elif VERSION == 2
var<private> version2Feature: bool = true;
#else
var<private> fallbackFeature: bool = true;
#endif
`;
			const expected = `
var<private> version2Feature: bool = true;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('multiple #elif branches', () => {
			const code = `
#define PLATFORM 3
#if PLATFORM == 1
var<private> platform: u32 = 1; // Desktop
#elif PLATFORM == 2
var<private> platform: u32 = 2; // Mobile
#elif PLATFORM == 3
var<private> platform: u32 = 3; // Web
#else
var<private> platform: u32 = 0; // Unknown
#endif
`;
			const expected = `
var<private> platform: u32 = 3; // Web
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('only first true branch is included', () => {
			const code = `
#define VALUE 5
#if VALUE > 10
var<private> result: u32 = 1;
#elif VALUE > 5
var<private> result: u32 = 2;
#elif VALUE >= 5 // This is true but should not be included as the evaluation stops
var<private> result: u32 = 3;
#else
var<private> result: u32 = 4;
#endif
`;
			const expected = `
var<private> result: u32 = 3;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('trailing #else with no previous true branches', () => {
			const code = `
#define VALUE 3
#if VALUE > 10
var<private> result: u32 = 1;
#elif VALUE > 5
var<private> result: u32 = 2;
#else
var<private> result: u32 = 3;
#endif
`;
			const expected = `
var<private> result: u32 = 3;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});
	});

	// Test #undef
	describe('#undef directive', () => {
		test('basic #undef', () => {
			const code = `
#define FEATURE
#ifdef FEATURE
var<private> beforeUndefining: bool = true;
#endif
#undef FEATURE
#ifdef FEATURE
var<private> afterUndefining: bool = true;
#endif
`;
			const expected = `
var<private> beforeUndefining: bool = true;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('#undef with redefinition', () => {
			const code = `
#define VALUE 1
var<private> value1: u32 = VALUE;
#undef VALUE
#define VALUE 2
var<private> value2: u32 = VALUE;
`;
			const expected = `
var<private> value1: u32 = 1;
var<private> value2: u32 = 2;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('#undef of undefined macro', () => {
			const code = `
#undef UNDEFINED_MACRO
var<private> testValue: u32 = 1;
`;
			const expected = `
var<private> testValue: u32 = 1;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('#undef of function-like macro', () => {
			const code = `
#define FUNC(x) (x * 2)
var<private> before: u32 = FUNC(5);
#undef FUNC
// This should error or not expand, depending on implementation
`;
			const result = preprocessWgsl(code);
			expect(result).toContain("var<private> before: u32 = (5 * 2);");
			// After undefining, the macro shouldn't be available
		});
	});

	// Test nested conditionals
	describe('Nested conditionals', () => {
		test('basic nested conditionals', () => {
			const code = `
#define OUTER
#define INNER
#ifdef OUTER
outer_start
#ifdef INNER
inner_content
#endif
outer_end
#endif
`;
			const expected = `
outer_start
inner_content
outer_end
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('nested conditionals with some branches excluded', () => {
			const code = `
#define LEVEL 2
#if LEVEL > 0
level_greater_than_0
#if LEVEL > 1
level_greater_than_1
#if LEVEL > 2
level_greater_than_2
#endif
level_greater_than_1_end
#endif
level_greater_than_0_end
#endif
`;
			const expected = `
level_greater_than_0
level_greater_than_1
level_greater_than_1_end
level_greater_than_0_end
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('nested conditionals with mixed directive types', () => {
			const code = `
#define FEATURE_X
#ifdef FEATURE_X
feature_x_defined
#if defined(FEATURE_Y)
feature_y_also_defined
#else
feature_y_not_defined
#ifdef FEATURE_X
still_inside_feature_x
#endif
feature_x_block_end
#endif
feature_x_outer_end
#endif
`;
			const expected = `
feature_x_defined
feature_y_not_defined
still_inside_feature_x
feature_x_block_end
feature_x_outer_end
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('deeply nested conditionals', () => {
			const code = `
#define A
#define B
#define C
#ifdef A
A is defined
#ifdef B
B is defined
#ifdef C
C is defined
#endif
#endif
#endif
`;
			const expected = `
A is defined
B is defined
C is defined
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});
	});

	// Test error handling
	describe('Error handling', () => {
		test('unmatched #endif', () => {
			const code = `
code_start
#endif
code_end
`;
			expect(() => preprocessWgsl(code)).toThrow(/Unexpected #endif/);
		});

		test('unmatched #else', () => {
			const code = `
code_start
#else
code_end
`;
			expect(() => preprocessWgsl(code)).toThrow(/Unexpected #else/);
		});

		test('unmatched #elif', () => {
			const code = `
code_start
#elif CONDITION
code_end
`;
			expect(() => preprocessWgsl(code)).toThrow(/Unexpected #elif/);
		});

		test('missing #endif', () => {
			const code = `
#ifdef FEATURE
code_inside_ifdef
// Missing #endif
`;
			expect(() => preprocessWgsl(code)).toThrow(/Unmatched #if/);
		});

		test('multiple #else directives', () => {
			const code = `
#if 1
var<private> value: u32 = 1;
#else
var<private> value: u32 = 2;
#else
var<private> value: u32 = 3;
#endif
`;
			// Implementation could throw various errors here
			expect(() => preprocessWgsl(code)).toThrow();
		});
	});

	// Test advanced and edge cases
	describe('Advanced cases', () => {
		test('protection against recursive macros', () => {
			const code = `
#define A B
#define B A
var<private> recursive = A;
`;
			// This should complete without hanging, but exact result depends on implementation
			expect(() => preprocessWgsl(code)).not.toThrow();
		});

		test('directives in comments are ignored', () => {
			const code = `
// #define COMMENTED_OUT 123
/* #define ALSO_COMMENTED 456 */
#ifdef COMMENTED_OUT
var<private> shouldNotBeIncluded: u32 = 1;
#endif
`;
			const expected = `// #define COMMENTED_OUT 123
/* #define ALSO_COMMENTED 456 */`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('various whitespace patterns in macros', () => {
			const code = `
#define  SPACE_AFTER_DEFINE  123
#define\tTAB_AFTER_DEFINE\t456
#define NO_SPACE(x) x+1
var<private> values: vec2<u32> = vec2<u32>(SPACE_AFTER_DEFINE, TAB_AFTER_DEFINE);
var<private> result: u32 = NO_SPACE(42);
`;
			const expected = `
var<private> values: vec2<u32> = vec2<u32>(123, 456);
var<private> result: u32 = 42+1;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('empty conditional blocks', () => {
			const code = `
#if 0
#endif
var<private> afterEmptyBlock: bool = true;
`;
			const expected = `
var<private> afterEmptyBlock: bool = true;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('skipping multiple levels of conditionals', () => {
			const code = `
#if 0
#if 1
This should be skipped
#endif
This should also be skipped
#endif
var<private> afterSkippedBlocks: bool = true;
`;
			const expected = `
var<private> afterSkippedBlocks: bool = true;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});
	});

	// Test complex real-world scenarios
	describe('Complex scenarios', () => {
		test('complex conditional nesting with multiple features', () => {
			const code = `
#define RENDERER_VULKAN
#define SHADOW_QUALITY 2
#define USE_ASYNC_COMPUTE

// Common code
struct Globals {
  resolution: vec2<f32>,
};

// Renderer-specific code
#ifdef RENDERER_VULKAN
const MAX_BINDLESS_RESOURCES: u32 = 1000000;
#elif defined(RENDERER_METAL)
const MAX_BINDLESS_RESOURCES: u32 = 500000;
#else
const MAX_BINDLESS_RESOURCES: u32 = 32;
#endif

// Shadow quality settings
#if SHADOW_QUALITY == 0
const SHADOW_MAP_SIZE: u32 = 512;
const SHADOW_CASCADES: u32 = 1;
#elif SHADOW_QUALITY == 1
const SHADOW_MAP_SIZE: u32 = 1024;
const SHADOW_CASCADES: u32 = 2;
#else
const SHADOW_MAP_SIZE: u32 = 2048;
const SHADOW_CASCADES: u32 = 4;
#endif

// Compute settings
#ifdef USE_ASYNC_COMPUTE
// Async compute features
#if defined(RENDERER_VULKAN) || defined(RENDERER_METAL)
const WORKGROUP_SIZE: u32 = 64;
#else
const WORKGROUP_SIZE: u32 = 32;
#endif
#endif
`;
			const expected = `
// Common code
struct Globals {
  resolution: vec2<f32>,
};

// Renderer-specific code
const MAX_BINDLESS_RESOURCES: u32 = 1000000;

// Shadow quality settings
const SHADOW_MAP_SIZE: u32 = 2048;
const SHADOW_CASCADES: u32 = 4;

// Compute settings
// Async compute features
const WORKGROUP_SIZE: u32 = 64;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('macro expansion in other macros', () => {
			const code = `
#define WIDTH 800
#define HEIGHT 600
#define RESOLUTION vec2<f32>(WIDTH, HEIGHT)
#define ASPECT_RATIO (float(WIDTH) / float(HEIGHT))
#define FOV 45.0
#define CAMERA_SETTINGS vec4<f32>(ASPECT_RATIO, FOV, 0.1, 100.0)

var<private> resolution = RESOLUTION;
var<private> cameraSettings = CAMERA_SETTINGS;
`;
			const expected = `
var<private> resolution = vec2<f32>(800, 600);
var<private> cameraSettings = vec4<f32>((float(800) / float(600)), 45.0, 0.1, 100.0);
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('platform-specific shader configuration', () => {
			const code = `
#define PLATFORM_MOBILE
#define VERSION 2

// Base shader configuration
struct ShaderConfig {
#ifdef PLATFORM_MOBILE
  maxLights: u32,
  #if VERSION >= 2
  shadowEnabled: bool,
  #endif
#else
  maxLights: u32,
  shadowEnabled: bool,
  reflectionsEnabled: bool,
#endif
  commonSetting: f32,
};

// Feature flags
#ifdef PLATFORM_MOBILE
#define MAX_LIGHTS 4
#if VERSION >= 2
#define ENABLE_SHADOWS
#endif
#else
#define MAX_LIGHTS 16
#define ENABLE_SHADOWS
#define ENABLE_REFLECTIONS
#endif

// Instantiate config
var<private> config: ShaderConfig;
`;
			const expected = `
// Base shader configuration
struct ShaderConfig {
  maxLights: u32,
  shadowEnabled: bool,
  commonSetting: f32,
};

// Feature flags

// Instantiate config
var<private> config: ShaderConfig;
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('shader variant generation', () => {
			const code = `
#define VARIANT 2

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
#if VARIANT == 1
  @location(1) color: vec3<f32>,
#elif VARIANT == 2
  @location(1) color: vec4<f32>,
  @location(2) normal: vec3<f32>,
#elif VARIANT == 3
  @location(1) color: vec4<f32>,
  @location(2) normal: vec3<f32>,
  @location(3) tangent: vec4<f32>,
#endif
};

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  var output: vec4<f32>;
  
#if VARIANT == 1
  output = vec4<f32>(input.color, 1.0);
#elif VARIANT == 2
  output = input.color * calculateLighting(input.normal);
#elif VARIANT == 3
  let normalMap = textureSample(normalTexture, normalSampler, input.uv);
  let worldNormal = calculateTBN(input.normal, input.tangent) * normalMap.xyz;
  output = input.color * calculateLighting(worldNormal);
#endif

  return output;
}
`;
			const expected = `
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) color: vec4<f32>,
  @location(2) normal: vec3<f32>,
};

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  var output: vec4<f32>;
  
  output = input.color * calculateLighting(input.normal);

  return output;
}
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});
	});

	// Test custom directives preservation
	describe('Custom directives preservation', () => {
		test('basic #binding directive preservation', () => {
			const code = `
#binding "data"
#binding "canvas_size"
@compute
fn main() {}
`;
			const expected = `
#binding "data"
#binding "canvas_size"
@compute
fn main() {}
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('basic #entrypoint directive preservation', () => {
			const code = `
#entrypoint "my_entry_point"
@compute
fn my_entry_point() {}
`;
			const expected = `
#entrypoint "my_entry_point"
@compute
fn my_entry_point() {}
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('custom directives inside included conditional blocks', () => {
			const code = `
#define FEATURE_ENABLED

#ifdef FEATURE_ENABLED
#binding "feature_data"
#entrypoint "feature_main"
@compute
fn feature_main() {}
#endif
`;
			const expected = `

#binding "feature_data"
#entrypoint "feature_main"
@compute
fn feature_main() {}
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('custom directives inside excluded conditional blocks', () => {
			const code = `
#ifdef UNDEFINED_FEATURE
#binding "feature_data"
#entrypoint "feature_main"
@compute
fn feature_main() {}
#endif

#binding "default_data"
@compute
fn main() {}
`;
			const expected = `
#binding "default_data"
@compute
fn main() {}
`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('custom directives with macro expansion in surrounding code', () => {
			const code = `
#define WORKGROUP_SIZE 64
#define DATA_TYPE f32

#binding "simulation_data"
#entrypoint "simulate"

@compute @workgroup_size(WORKGROUP_SIZE)
fn simulate(
  @builtin(global_invocation_id) id: vec3<u32>
) {
  var value: DATA_TYPE = 0.0;
}
`;
			const expected = `
#binding "simulation_data"
#entrypoint "simulate"

@compute @workgroup_size(64)
fn simulate(
  @builtin(global_invocation_id) id: vec3<u32>
) {
  var value: f32 = 0.0;
}`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});

		test('multiple custom directives with interspersed preprocessor directives', () => {
			const code = `#define GPU_COMPUTE
#define WORKGROUP_SIZE 64

#binding "pos_buffer"
#binding "vel_buffer"

#ifdef GPU_COMPUTE
#entrypoint "update_particles"
@compute @workgroup_size(WORKGROUP_SIZE)
fn update_particles() {}
#else
fn update_particles() {}
#endif

#undef GPU_COMPUTE
#define RENDER_PATH

#binding "render_target"
#ifdef RENDER_PATH
#entrypoint "render"
fn render() {}
#endif`;
			const expected = `
#binding "pos_buffer"
#binding "vel_buffer"

#entrypoint "update_particles"
@compute @workgroup_size(64)
fn update_particles() {}

#binding "render_target"
#entrypoint "render"
fn render() {}`;
			expect(preprocessWgsl(code).trim()).toBe(expected.trim());
		});
	});
});