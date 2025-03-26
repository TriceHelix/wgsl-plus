import { Macro, ConditionalState } from './types.d.ts';
import { evaluateExpression } from './evaluator.ts';
import { expandMacros } from './macro-expander.ts';

/**
 * Processes a WGSL file for conditional compilation directives
 */
export function processConditionals(
  lines: string[], 
  defines: Map<string, Macro>
): string[] {
  // Track conditional inclusion state
  const conditionalStack: ConditionalState[] = [];
  
  // Result lines
  const resultLines: string[] = [];
  
  /**
   * Checks if we're currently including code based on conditional stack
   */
  const isCurrentlyIncluding = (): boolean => {
    for (const state of conditionalStack) {
      if (!state.including) {
        return false;
      }
    }
    return true;
  };
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check for preprocessor directives
    if (trimmedLine.startsWith("#")) {
      // Remove comments from the line before processing
      let directiveLine = trimmedLine;
      const commentIndex = directiveLine.indexOf("//");
      if (commentIndex >= 0) {
        directiveLine = directiveLine.substring(0, commentIndex).trim();
      }
      
      // Use regex to match directives with any whitespace pattern
      const defineMatch = directiveLine.match(/^#define\s+/);
      const undefMatch = directiveLine.match(/^#undef\s+/);
      const ifMatch = directiveLine.match(/^#if\s+/);
      const ifdefMatch = directiveLine.match(/^#ifdef\s+/);
      const ifndefMatch = directiveLine.match(/^#ifndef\s+/);
      const elifMatch = directiveLine.match(/^#elif\s+/);
      const elseMatch = directiveLine.match(/^#else(?:\s|$)/);
      const endifMatch = directiveLine.match(/^#endif(?:\s|$)/);
      
      // #define directive
      if (defineMatch) {
        if (isCurrentlyIncluding()) {
          // First check if this is a function-like macro 
          // Only match if the opening parenthesis is immediately after the macro name with possibly whitespace
          // And contains a valid parameter list (identifiers separated by commas)
          const functionLikeRegex = /^#define\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\)\s*(.*)$/;
          const functionLikeMatch = directiveLine.match(functionLikeRegex);
          
          if (functionLikeMatch) {
            const [, name, paramsStr, value] = functionLikeMatch;
            const params = paramsStr.split(",").map(param => param.trim());
            
            // Store the unexpanded value for function-like macros
            defines.set(name, { value: value || "", params });
          } else {
            // Simple macro - extract the name first
            const macroNameMatch = directiveLine.match(/^#define\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
            if (macroNameMatch) {
              const [, name] = macroNameMatch;
              // Extract the value (everything after the name)
              const valueStartIndex = directiveLine.indexOf(name) + name.length;
              let value = directiveLine.substring(valueStartIndex).trim();
              
              // For simple macros, expand any referenced macros in the value
              const expandedValue = value ? expandMacros(value, new Map(defines)) : "";
              
              defines.set(name, { value: expandedValue });
            }
          }
        }
        continue;
      }
      
      // #undef directive
      if (undefMatch) {
        if (isCurrentlyIncluding()) {
          const undefMatch = directiveLine.match(/^#undef\s+([a-zA-Z_][a-zA-Z0-9_]*)$/);
          if (undefMatch) {
            const [, name] = undefMatch;
            defines.delete(name);
          }
        }
        continue;
      }
      
      // #if directive
      if (ifMatch) {
        const expr = directiveLine.substring(ifMatch[0].length).trim();
        const result = isCurrentlyIncluding() ? evaluateExpression(expr, defines) : false;
        conditionalStack.push({
          including: result,
          hasBeenTrue: result,
          hasElse: false
        });
        continue;
      }
      
      // #ifdef directive
      if (ifdefMatch) {
        const name = directiveLine.substring(ifdefMatch[0].length).trim();
        const result = isCurrentlyIncluding() ? defines.has(name) : false;
        conditionalStack.push({
          including: result,
          hasBeenTrue: result,
          hasElse: false
        });
        continue;
      }
      
      // #ifndef directive
      if (ifndefMatch) {
        const name = directiveLine.substring(ifndefMatch[0].length).trim();
        const result = isCurrentlyIncluding() ? !defines.has(name) : false;
        conditionalStack.push({
          including: result,
          hasBeenTrue: result,
          hasElse: false
        });
        continue;
      }
      
      // #elif directive
      if (elifMatch) {
        if (conditionalStack.length === 0) {
          throw new Error("Unexpected #elif without matching #if");
        }
        
        const currentState = conditionalStack[conditionalStack.length - 1];
        
        // It's an error to have #elif after #else
        if (currentState.hasElse) {
          throw new Error("Unexpected #elif after #else");
        }
        
        // Only evaluate this branch if no previous branch in this if-chain has been true
        if (!currentState.hasBeenTrue) {
          const expr = directiveLine.substring(elifMatch[0].length).trim();
          const parentIncluding = conditionalStack.length > 1 ? 
            conditionalStack[conditionalStack.length - 2].including : true;
          
          // Only evaluate if parent conditions allow this code to be included
          if (parentIncluding) {
            const result = evaluateExpression(expr, defines);
            currentState.including = result;
            if (result) {
              currentState.hasBeenTrue = true;
            }
          } else {
            currentState.including = false;
          }
        } else {
          // A previous branch was already true, so skip this one
          currentState.including = false;
        }
        continue;
      }
      
      // #else directive
      if (elseMatch) {
        if (conditionalStack.length === 0) {
          throw new Error("Unexpected #else without matching #if");
        }
        
        const currentState = conditionalStack[conditionalStack.length - 1];
        
        // Check if we've already seen an #else for this conditional
        if (currentState.hasElse) {
          throw new Error("Multiple #else directives for the same conditional");
        }
        
        // Mark that we've seen an #else
        currentState.hasElse = true;
        
        if (!currentState.hasBeenTrue) {
          const parentIncluding = conditionalStack.length > 1 ? 
            conditionalStack[conditionalStack.length - 2].including : true;
          
          currentState.including = parentIncluding;
          currentState.hasBeenTrue = true;
        } else {
          currentState.including = false;
        }
        continue;
      }
      
      // #endif directive
      if (endifMatch) {
        if (conditionalStack.length === 0) {
          throw new Error("Unexpected #endif without matching #if");
        }
        
        conditionalStack.pop();
        continue;
      }
      
      // Custom directives (#binding, #entrypoint) or #import are passed through if we're including
      if (isCurrentlyIncluding()) {
        resultLines.push(line);
      }
      continue;
    }
    
    // Include the line if we're in an including state
    if (isCurrentlyIncluding()) {
      // Expand macros in the line
      const expandedLine = expandMacros(line, defines);
      resultLines.push(expandedLine);
    }
  }
  
  // Check for unmatched #if/#ifdef/#ifndef
  if (conditionalStack.length > 0) {
    throw new Error("Unmatched #if, #ifdef, or #ifndef");
  }
  
  return resultLines;
}