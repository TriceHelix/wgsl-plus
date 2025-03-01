#!/usr/bin/env node

import { program } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

const VERSION = '0.0.1';

// Process a WGSL file, resolving #input directives recursively
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
		const match = line.match(/^#input\s+"(.+)"\s*$/);
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

// Generate output content based on file extension and export type
function generateOutput(outputPath: string, content: string, exportType?: string): string {
	const ext = path.extname(outputPath);
	if (ext === '.wgsl') {
		return content;
	} else if (ext === '.js' || ext === '.ts') {
		if (!exportType) {
			throw new Error('Export type must be specified for .js and .ts outputs');
		}
		const escapedContent = content.replace(/`/g, '\\`').replace(/\${/g, '\\${');
		if (exportType === 'esm') {
			return `export const shader = \`${escapedContent}\`;`;
		} else if (exportType === 'commonjs') {
			return `module.exports = { shader: \`${escapedContent}\` };`;
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
	.arguments('<inputFiles...>')
	.requiredOption('-o, --output <path>', 'Specify the output file path')
	.option('--export-type <type>', 'Export type for .js/.ts outputs (esm or commonjs)')
	.action((inputFiles: string[], options: { output: string; exportType?: string }) => {
		try {
			// Validate input files
			for (const file of inputFiles) {
				if (!fs.existsSync(file)) {
					throw new Error(`Input file not found: ${file}`);
				}
				if (path.extname(file) !== '.wgsl') {
					throw new Error(`Input file must be .wgsl: ${file}`);
				}
			}

			// Validate output file
			const outputPath = path.resolve(options.output);
			const outputExt = path.extname(outputPath);
			const inputPaths = inputFiles.map(file => path.resolve(file));
			if (inputPaths.includes(outputPath)) {
				throw new Error(`Output file cannot be one of the input files: ${options.output}`);
			}
			if (!['.wgsl', '.js', '.ts'].includes(outputExt)) {
				throw new Error(`Output file must be .wgsl, .js, or .ts: ${options.output}`);
			}

			// Validate export-type flag
			if (outputExt === '.wgsl') {
				if (options.exportType) {
					throw new Error('Export type should not be specified for .wgsl outputs');
				}
			} else if (outputExt === '.js' || outputExt === '.ts') {
				if (!options.exportType) {
					throw new Error('Export type must be specified for .js and .ts outputs');
				}
				if (!['esm', 'commonjs'].includes(options.exportType)) {
					throw new Error(`Invalid export type: ${options.exportType}. Must be 'esm' or 'commonjs'`);
				}
			}

			// Process all input files
			const processing = new Set<string>();
			const includedLines: string[] = [];
			for (const inputFile of inputFiles) {
				processFile(inputFile, processing, includedLines);
			}
			const outputContent = includedLines.join('\n');

			// Generate and write output
			const finalOutput = generateOutput(options.output, outputContent, options.exportType);
			const outputDir = path.dirname(outputPath);
			fs.mkdirSync(outputDir, { recursive: true });
			fs.writeFileSync(outputPath, finalOutput);
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
	console.log('\nNotes:');
	console.log('  • Input files must be .wgsl files.');
	console.log('  • Output file must be .wgsl, .js, or .ts.');
	console.log('  • --export-type is required for .js/.ts outputs, ignored for .wgsl.');
});

program.parse();