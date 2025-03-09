#!/usr/bin/env node

import { program } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import prettify from './tools/prettify';
import minify from './tools/minify';
import obfuscate from './tools/obfuscation/obfuscate';
import link from './tools/link';
import generateOutput from './tools/generate-output';
import preprocessWgsl from './tools/preprocessing/preprocess-wgsl';

const VERSION = '1.0.1';

/**
 * Removes #binding directives from WGSL code.
 * @param code The WGSL source code as a string.
 * @returns The code with all #binding directives removed.
 */
function removeBindingDirectives(code: string): string {
	// Split the code into lines
	const lines = code.split('\n');
	
	// Filter out lines that match the #binding directive pattern
	const filteredLines = lines.filter(line => 
	  !/^\s*#binding\s+"[^"]+"\s*(\/\/.*)?$/.test(line)
	  && !/^\s*#entrypoint\s+"[^"]+"\s*(\/\/.*)?$/.test(line)
	);
	
	// Rejoin the remaining lines
	return filteredLines.join('\n');
}

// CLI setup
program
	.name('wgsl-plus')
	.description('A WGSL compiler with linking and multi-format output')
	.version(VERSION)
	.arguments('<importFiles...>')
	.requiredOption('-o, --output <path>', 'Specify the output file path')
	.option('-t, --export-type <type>', 'Export type for .js outputs (esm or commonjs)')
	.option('-b, --obfuscate', 'Obfuscate variable names in the output')
	.option('-m, --minify', 'Minify the output')
	.option('-p, --prettify', 'Prettify the output')
	.action((importFiles: string[], options: { 
		output: string; 
		exportType?: string,
		obfuscate?: boolean,
		minify?: boolean,
		prettify?: boolean
	}) => {
		try {
			let outputPath = "";
			{ // Validation
				// Validate import files
				for (const file of importFiles) {
					if (!fs.existsSync(file)) {
						throw new Error(`Import file not found: ${file}`);
					}
					if (path.extname(file) !== '.wgsl') {
						throw new Error(`Import file must be .wgsl: ${file}`);
					}
				}

				// Validate output file
				outputPath = path.resolve(options.output);
				const outputExt = path.extname(outputPath);
				const importPaths = importFiles.map(file => path.resolve(file));
				if (importPaths.includes(outputPath)) {
					throw new Error(`Output file cannot be one of the import files: ${options.output}`);
				}
				if (!['.wgsl', '.js', '.ts'].includes(outputExt)) {
					throw new Error(`Output file must be .wgsl, .js, or .ts: ${options.output}`);
				}

				// Validate export-type flag
				if (outputExt === '.js') {
					if (!options.exportType) {
						// Default to ESM.
						options.exportType = 'esm';
					}
					if (!['esm', 'commonjs'].includes(options.exportType)) {
						throw new Error(`Invalid export type: ${options.exportType}. Must be 'esm' or 'commonjs'`);
					}
				}
				else{
					if (options.exportType) {
						throw new Error('Export type should not be specified for non-js outputs');
					}
				}

				// Make sure only one of --obfuscate, --minify, or --prettify is used
				const transformFlags = ['obfuscate', 'minify', 'prettify'];
				const usedTransformFlags = transformFlags.filter(flag => options[flag]);
				if (usedTransformFlags.length > 1) {
					throw new Error(`Only one of ${transformFlags.join(', ')} can be used`);
				}
			}

			let outputContent = "";
			{ // Process all import files
				outputContent = link(importFiles);

				// Handle define statements.
				outputContent = preprocessWgsl(outputContent);

				// Remove the binding directives if obfuscate mode isn't being used.
				if(!options.obfuscate) outputContent = removeBindingDirectives(outputContent);

				if(options.prettify) outputContent = prettify(outputContent);
				else if(options.minify) outputContent = minify(outputContent);
				else if(options.obfuscate) outputContent = obfuscate(outputContent);
			}

			{ // Generate and write output
				const finalOutput = generateOutput(options.output, outputContent, options.exportType);
				const outputDir = path.dirname(outputPath);
				fs.mkdirSync(outputDir, { recursive: true });
				fs.writeFileSync(outputPath, finalOutput);
			}
		} catch (error) {
			console.error(`Error: ${error.message}`);
			process.exit(1);
		}
	});

// Additional help text
program.on('--help', () => {
	console.log('\nExamples:');
	console.log('  npx wgsl-plus input.wgsl -o output.wgsl');
	console.log('  npx wgsl-plus a.wgsl b.wgsl -o output.js --export-type esm');
	console.log('  npx wgsl-plus input.wgsl -o output.wgsl --obfuscate');
	console.log('\nNotes:');
	console.log('  • Input files must be .wgsl files.');
	console.log('  • Output file must be .wgsl, .js, or .ts.');
	console.log('  • --export-type is optional for .js outputs. Use commonjs or esm. Default is esm.');
	console.log('  • Use one or none of --obfuscate, --prettify, or --minify to transform output.');
});

program.parse();