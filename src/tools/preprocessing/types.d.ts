/**
 * Type definition for a macro
 */
export type Macro = {
	value: string;
	params?: string[];  // For function-like macros
};

/**
 * Type for tracking conditional inclusion state
 */
export type ConditionalState = {
	including: boolean;  // Are we currently including code?
	hasBeenTrue: boolean;  // Has any branch in this if-chain been true?
	hasElse: boolean;       // Has an #else directive been seen for this conditional?
};