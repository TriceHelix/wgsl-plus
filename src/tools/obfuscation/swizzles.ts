// Function to generate all swizzle combinations
function generateSwizzles(): Set<string> {
    const components = ["x", "y", "z", "w", "r", "g", "b", "a"];
    const swizzles = new Set<string>();

    // Generate swizzles of length 1 to 4
    for (let length = 1; length <= 4; length++) {
        generateCombinations(components, length, "", swizzles);
    }

    return swizzles;
}

// Helper function to generate combinations recursively
function generateCombinations(components: string[], length: number, prefix: string, result: Set<string>): void {
    if (prefix.length === length) {
        result.add(prefix);
        return;
    }

    for (const component of components) {
        generateCombinations(components, length, prefix + component, result);
    }
}

const swizzles = generateSwizzles();

export default swizzles;