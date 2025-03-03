#!/usr/bin/env node

import { program } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import prettify from './prettify';
import minify from './minify';
import obfuscate from './obfuscation/obfuscate';

const VERSION = '0.0.1';

// Process a WGSL file, resolving #import directives recursively
function processFile(filePath: string, processing: Set<string>, includedLines: string[]): void {
	const absolutePath = path.resolve(filePath);

	// Detect circular dependencies
	if (processing.has(absolutePath)) {
		throw new Error(`Circular dependency detected: ${absolutePath}`);
	}

	// Check if file exists
	if (!fs.existsSync(absolutePath)) {
		throw new Error(`File not found: ${absolutePath}`);
	}

	processing.add(absolutePath);
	const content = fs.readFileSync(absolutePath, 'utf-8');
	const lines = content.split('\n');

	for (const line of lines) {
		const match = line.match(/^#import\s+"(.+)"\s*$/);
		if (match) {
			const includePath = match[1];
			const relativePath = path.resolve(path.dirname(absolutePath), includePath);
			if (!fs.existsSync(relativePath)) {
				throw new Error(`Linked file not found: ${includePath} in ${absolutePath}`);
			}
			processFile(relativePath, processing, includedLines);
		} else {
			includedLines.push(line);
		}
	}

	processing.delete(absolutePath);
}

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
	);
	
	// Rejoin the remaining lines
	return filteredLines.join('\n');
}

// Generate output content based on file extension and export type
function generateOutput(outputPath: string, content: string, exportType?: string): string {
	const ext = path.extname(outputPath);
	if (ext === '.wgsl') {
		return content;
	} else if (ext === '.ts') {
		const escapedContent = content.replace(/`/g, '\\`').replace(/\${/g, '\\${');
		return `export default \`${escapedContent}\`;`;
	} else if (ext === '.js') {
		if (!exportType) {
			exportType = 'esm';
		}
		const escapedContent = content.replace(/`/g, '\\`').replace(/\${/g, '\\${');
		if (exportType === 'esm') {
			return `export default \`${escapedContent}\`;`;
		} else if (exportType === 'commonjs') {
			return `module.exports = \`${escapedContent}\`;`;
		} else {
			throw new Error(`Invalid export type: ${exportType}. Must be 'esm' or 'commonjs'`);
		}
	} else {
		throw new Error(`Unsupported output extension: ${ext}. Must be .wgsl, .js, or .ts`);
	}
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
				const processing = new Set<string>();
				const includedLines: string[] = [];
				for (const importFile of importFiles) {
					processFile(importFile, processing, includedLines);
				}
				outputContent = includedLines.join('\n');

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

// Custom help command
program
	.command('help')
	.description('Display help information')
	.action(() => program.help());

// Additional help text
program.on('--help', () => {
	console.log('\nExamples:');
	console.log('  npx wgsl-plus input.wgsl -o output.wgsl');
	console.log('  npx wgsl-plus a.wgsl b.wgsl -o output.js --export-type esm');
	console.log('  npx wgsl-plus input.wgsl -o output.wgsl --obfuscate');
	console.log('\nNotes:');
	console.log('  • Input files must be .wgsl files.');
	console.log('  • Output file must be .wgsl, .js, or .ts.');
	console.log('  • --export-type is required for .js/.ts outputs, ignored for .wgsl.');
	console.log('  • Use one or none of --obfuscate, --prettify, or --minify to transform output.');
});

program.parse();