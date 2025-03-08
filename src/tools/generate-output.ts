import path from "path";

export default // Generate output content based on file extension and export type
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