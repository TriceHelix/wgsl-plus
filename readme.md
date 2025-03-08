# wgsl-plus

A lightweight WGSL compiler with support for linking files via `#include` directives and outputting to multiple formats (WGSL, JS, TS). Has a built-in obfuscator, minifier, and prettifier. 

## Features

- **File Linking**: Use `#include "path"` directives to include other WGSL files.
- **Multi-Format Output**: Build to WGSL, JavaScript, or TypeScript files.
- **Export Options**: Choose between ESM (`export`) or CommonJS (`module.exports`) for JS/TS outputs.
- **Error Handling**: Prevents overwriting input files, ensures all linked files exist, and validates input/output formats.
- **Help Documentation**: Run `wgsl-plus --help` for usage instructions and examples.

## Installation

Install globally for easy access:

`npm install -g wgsl-plus`

Or use `npx` for one-off runs:

`npx wgsl-plus [options] <input files>`

## Usage

### Basic Command

`wgsl-plus <inputFiles...> -o <outputFile> [--export-type <type>]`

- `<inputFiles...>`: One or more `.wgsl` files to process.
- `-o, --output <path>`: Path to the output file (must be `.wgsl`, `.js`, or `.ts`).
- `--export-type <type>`: Export type for `.js` or `.ts` outputs (`esm` or `commonjs`).

### Examples

- **Build to WGSL**:
  `wgsl-plus input.wgsl -o output.wgsl`

- **Build to JavaScript (ESM)**:
  `wgsl-plus a.wgsl b.wgsl -o output.js --export-type esm`

- **Build to TypeScript**:
  `wgsl-plus main.wgsl -o output.ts`

### Directives

- `#include "path"`: Include another WGSL file relative to the current file.

Example:

```wgsl
#include "utils.wgsl"
@compute
fn main() {}
```

- `#binding "binding_name"`: Used to instruct the obfuscator the names of bindings. The bindings will be listed in special comments at the top of the obfuscated code, which can be interpreted by a library like simple-compute-shaders to automatically insert obfuscated binding names.

```wgsl
#binding "data"
#binding "canvas_size"
@compute
fn main() {}
```

- `#entrypoint "entry_point_name"`: tells the obfuscator what the entry point is. Entry point names will not be obfuscated. Multiple entryoints are supported. If no entry point is listed, `main` will be assumed. 

```wgsl
#entrypoint "my_entry_point"
@compute
fn my_entry_point() {}
```

## Limitations

- The minifier and prettifier are both not perfect. But they are passing all essential test cases.
- Vector swizzling poised all kinds of challenges for the obfuscator. As a result, any struct member that matches any of the >4000 swizzle name combinations (such as yz, xyz, rba, and so on) won't be obfuscated.
- WGSL-Plus can't scan your code for most errors yet with the exception of certain invalid tokens.

## See Also

Try [Simple Compute Shaders](https://www.npmjs.com/package/simple-compute-shaders) for a streamlined experience building pipelines for compute shaders and 2D fragment shaders.

## Development

To contribute or modify `wgsl-plus`:

1. Clone the repository:
   `git clone https://github.com/yourusername/wgsl-plus.git`
   `cd wgsl-plus`

2. Install dependencies:
   `npm install`

3. Build the project:
   `npm run build`

4. Link the project:
   `npm link`

5. Test:
   `wgsl-plus --help`

Pull requests are welcome but please ask permission before changing the usage significantly.

## License

MIT License.