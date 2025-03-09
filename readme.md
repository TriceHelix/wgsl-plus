# wgsl-plus

A lightweight WGSL compiler with support for file linking, preprocessing, and multiple output formats.

## Overview

WGSL-Plus extends the WebGPU Shading Language with C-style preprocessor directives and additional features to streamline shader development. It supports linking files, obfuscation, minification, and output to multiple formats.

## Features

- **File Linking**: Include other WGSL files in your shaders
- **Preprocessing**: C-like preprocessor with macros and conditional compilation
- **Multi-Format Output**: Build to WGSL, JavaScript, or TypeScript files
- **Code Optimization**: Built-in obfuscator, minifier, and prettifier
- **Export Options**: Choose between ESM (`export`) or CommonJS (`module.exports`) for JS/TS outputs
- **Error Handling**: File validation and format checking

## Installation

Install globally for easy access:

```
npm install -g wgsl-plus
```

Or use `npx` for one-off runs:

```
npx wgsl-plus [options] <input files>
```

## Basic Usage

### Command Syntax

```
wgsl-plus <inputFiles...> -o <outputFile> [--export-type <type>]
```

- `<inputFiles...>`: One or more `.wgsl` files to process
- `-o, --output <path>`: Path to the output file (must be `.wgsl`, `.js`, or `.ts`)
- `--export-type <type>`: Export type for `.js` or `.ts` outputs (`esm` or `commonjs`)

### Examples

- **Build to WGSL**:
  ```
  wgsl-plus input.wgsl -o output.wgsl
  ```

- **Build to JavaScript (ESM)**:
  ```
  wgsl-plus a.wgsl b.wgsl -o output.js --export-type esm
  ```

- **Build to TypeScript**:
  ```
  wgsl-plus main.wgsl -o output.ts
  ```

- **Get help**:
  ```
  wgsl-plus --help
  ```

## Preprocessor Directives

WGSL-Plus supports both standard C-like preprocessor directives and custom WGSL-specific directives.

### File Inclusion

```wgsl
// Include another WGSL file relative to the current file
#include "utils.wgsl"
```

### Macro Definition

```wgsl
// Simple constant macro
#define WIDTH 800
#define HEIGHT 600

// Function-like macro
#define MAX(a, b) ((a) > (b) ? (a) : (b))

// Undefine a macro
#undef WIDTH
```

### Conditional Compilation

Control which parts of the code are compiled:

```wgsl
// If-defined and if-not-defined
#ifdef ENABLE_SHADOWS
  // Code included when ENABLE_SHADOWS is defined
#endif

#ifndef MOBILE_DEVICE
  // Code included when MOBILE_DEVICE is not defined
#endif

// Complex conditions
#define VERSION 2

#if VERSION == 1
  // Code for version 1
#elif VERSION == 2
  // Code for version 2
#else
  // Code for other versions
#endif

// Using the defined() operator
#if defined(FEATURE_A) && !defined(FEATURE_B)
  // Code included when FEATURE_A is defined and FEATURE_B is not
#endif
```

### Shader Configuration Directives

These directives help with obfuscation and binding management:

```wgsl
// Specify binding names (preserved during obfuscation)
#binding "data"
#binding "canvas_size"

// Specify entry points (preserved during obfuscation)
#entrypoint "vertex_main"
#entrypoint "fragment_main"

// If no entry point is specified, "main" is assumed
```

## Usage Examples

### Feature Toggling

```wgsl
#define SHADOW_QUALITY 2  // 0=off, 1=low, 2=high

struct LightingConfig {
  #if SHADOW_QUALITY > 0
    shadowEnabled: bool,
    #if SHADOW_QUALITY > 1
      shadowResolution: f32,
      shadowCascades: u32,
    #endif
  #endif
  ambientIntensity: f32,
};
```

### Platform-Specific Code

```wgsl
#ifdef MOBILE
  #define MAX_LIGHTS 4
  #define WORKGROUP_SIZE 64
#else
  #define MAX_LIGHTS 16
  #define WORKGROUP_SIZE 128
#endif

@compute @workgroup_size(WORKGROUP_SIZE)
fn compute_lighting() {
  // Process up to MAX_LIGHTS
}
```

### Shader Variants

```wgsl
#define VARIANT_NORMAL_MAPPING
#define VARIANT_SKINNING

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  
  #ifdef VARIANT_NORMAL_MAPPING
    @location(2) tangent: vec4<f32>,
    @location(3) texcoord: vec2<f32>,
  #else
    @location(2) texcoord: vec2<f32>,
  #endif
  
  #ifdef VARIANT_SKINNING
    @location(4) joints: vec4<u32>,
    @location(5) weights: vec4<f32>,
  #endif
};

#entrypoint "vs_main"
@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  // Shader code with conditional compilation
}
```

## Notes and Limitations

- Preprocessor directives must be at the beginning of a line (with optional whitespace before the `#`)
- Macros are textually expanded before compilation, similar to the C preprocessor
- The preprocessor runs before any shader compilation, ensuring that only the selected code paths are compiled
- The minifier and prettifier are functional but not perfect
- Vector swizzling poses challenges for the obfuscator - struct members matching any of the >4000 swizzle name combinations (e.g., yz, xyz, rba) won't be obfuscated
- WGSL-Plus can't scan for most errors yet, with the exception of certain invalid tokens
- Unlike C, the WGSL preprocessor does not support `#pragma` or `#error` directives

## Development

To contribute or modify `wgsl-plus`:

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/wgsl-plus.git
   cd wgsl-plus
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the project:
   ```
   npm run build
   ```

4. Link the project:
   ```
   npm link
   ```

5. Test:
   ```
   wgsl-plus --help
   ```

Pull requests are welcome but please ask permission before changing the usage significantly.

## See Also

Try [Simple Compute Shaders](https://www.npmjs.com/package/simple-compute-shaders) for a streamlined experience building pipelines for compute shaders and 2D fragment shaders.

## License

MIT License.