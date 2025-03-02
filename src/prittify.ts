export default function prettify(code: string): string {
    // Split the code into lines (keeping empty lines for consistency)
    const lines: string[] = code.split('\n');
    const formattedLines: string[] = [];
    let currentLevel: number = 0;
    let inMultiLineComment: boolean = false;

    for (const line of lines) {
        const trimmedLine: string = line.trim();

        // Handle multi-line comment start
        if (!inMultiLineComment && trimmedLine.startsWith('/*')) {
            inMultiLineComment = true;
        }

        // Handle multi-line comment end
        if (inMultiLineComment && trimmedLine.endsWith('*/')) {
            inMultiLineComment = false;
            formattedLines.push('\t'.repeat(currentLevel) + trimmedLine);
            continue;
        }

        // If in a multi-line comment, just indent and skip brace logic
        if (inMultiLineComment) {
            formattedLines.push('\t'.repeat(currentLevel) + trimmedLine);
            continue;
        }

        // Handle single-line comments
        if (trimmedLine.startsWith('//')) {
            formattedLines.push('\t'.repeat(currentLevel) + trimmedLine);
            continue;
        }

        // Process code lines
        if (trimmedLine.startsWith('}')) {
            currentLevel = Math.max(currentLevel - 1, 0);
        }

        const indentedLine: string = '\t'.repeat(currentLevel) + trimmedLine;
        formattedLines.push(indentedLine);

        if (trimmedLine.endsWith('{')) {
            currentLevel += 1;
        }
    }

    return formattedLines.join('\n');
}