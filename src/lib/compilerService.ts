import { supabase } from './supabase';

const TIMEOUT_MS = 10000; // 10 second timeout
const DEFAULT_INPUT = '5\n10\n15\n'; // Default input values for testing (with trailing newline)

// WebAssembly module for C/C++ compilation
let cWasmModule: WebAssembly.WebAssemblyInstantiatedSource | null = null;
let wasmInitializationError: string | null = null;
const WASM_SUPPORTED = false; // Disable WASM since it's not available

const initWasmModule = async () => {
  return false; // WASM is not supported
};

interface CompileResult {
  output: string;
  error?: string;
  executionId?: string;
}

// C/C++ execution environment using WebAssembly
const executeCCode = async (code: string, isCpp: boolean = false): Promise<CompileResult> => {
  return {
    output: '',
    error: 'C/C++ compilation is not available in this environment. Please try JavaScript, TypeScript, or Python instead.'
  };
};

// Sandbox console implementation
const createSandboxConsole = () => {
  const log: string[] = [];
  let inputIndex = 0;
  const inputs = DEFAULT_INPUT.split('\n');

  return {
    log: (...args: any[]) => {
      const formatted = args.map(arg => {
        if (arg === undefined) return 'undefined';
        if (arg === null) return 'null';
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      log.push(formatted);
    },
    error: (...args: any[]) => log.push('Error: ' + args.join(' ')),
    warn: (...args: any[]) => log.push('Warning: ' + args.join(' ')),
    input: () => {
      if (inputIndex >= inputs.length) {
        throw new Error('No more input values available');
      }
      return inputs[inputIndex++];
    },
    getLog: () => log.join('\n')
  };
};

// JavaScript/TypeScript execution environment
const executeJavaScript = async (code: string, isTypeScript = false): Promise<CompileResult> => {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Execution timed out')), TIMEOUT_MS);
    });

    const sandboxConsole = createSandboxConsole();
    
    // For TypeScript, we'll do basic type stripping
    if (isTypeScript) {
      code = code
        .replace(/:\s*(string|number|boolean|any|void|null)\s*([,)])/g, '$2') // Remove type annotations
        .replace(/<[^>]+>/g, '') // Remove generic type parameters
        .replace(/interface\s+\w+\s*\{[^}]*\}/g, '') // Remove interfaces
        .replace(/type\s+\w+\s*=\s*[^;]+;/g, ''); // Remove type aliases
    }

    const executionPromise = new Promise<string>((resolve) => {
      const sandbox = new Function(
        'console',
        'input',
        `
          "use strict";
          const prompt = input;
          let __output = undefined;
          
          try {
            __output = (function() {
              ${code}
            })();
          } catch (e) {
            if (e instanceof Error) {
              console.error(e.name + ': ' + e.message);
            } else {
              console.error('Runtime Error: ' + String(e));
            }
            return;
          }

          if (__output !== undefined) {
            console.log(__output);
          }
          
          return console.getLog();
        `
      );
      resolve(sandbox(sandboxConsole, sandboxConsole.input));
    });

    const output = await Promise.race([executionPromise, timeoutPromise]);
    const hasError = output.includes('Error:');

    return {
      output: hasError ? '' : output,
      error: hasError ? output : undefined
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'Execution timed out') {
      return {
        output: '',
        error: '⏱️ Execution Timeout: Code took too long to run. Please check for infinite loops.'
      };
    }

    return {
      output: '',
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
};

// Python execution environment
const executePython = async (code: string): Promise<CompileResult> => {
  try {
    // Create a Python-like environment
    const env = {
      variables: new Map<string, any>(),
      output: [] as string[],
      inputIndex: 0,
      inputs: DEFAULT_INPUT.split('\n')
    };

    // Helper functions
    const getVariable = (name: string) => {
      if (!env.variables.has(name)) {
        throw new Error(`NameError: name '${name}' is not defined`);
      }
      return env.variables.get(name);
    };

    const setVariable = (name: string, value: any) => {
      env.variables.set(name, value);
    };

    const handleInput = () => {
      if (env.inputIndex >= env.inputs.length) {
        throw new Error('No more input values available');
      }
      return env.inputs[env.inputIndex++];
    };

    // Parse and execute Python code line by line
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;

      try {
        // Handle print statements
        if (line.startsWith('print(')) {
          const match = line.match(/print\((.*)\)/);
          if (match) {
            let content = match[1].trim();
            
            // Handle f-strings
            if (content.startsWith('f"') || content.startsWith("f'")) {
              content = content.slice(2, -1);
              content = content.replace(/\{([^}]+)\}/g, (_, expr) => {
                // Parse the expression
                const value = evaluatePythonExpression(expr.trim(), env);
                return String(value);
              });
              env.output.push(content);
              continue;
            }
            
            // Handle regular print
            const value = evaluatePythonExpression(content, env);
            env.output.push(String(value));
            continue;
          }
        }

        // Handle input()
        if (line.includes('input(')) {
          const match = line.match(/(\w+)\s*=\s*input\((.*)\)/);
          if (match) {
            const [_, varName] = match;
            const value = handleInput();
            setVariable(varName, value);
          }
          continue;
        }

        // Handle variable assignments
        const assignMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
        if (assignMatch) {
          const [_, varName, expr] = assignMatch;
          const value = evaluatePythonExpression(expr, env);
          setVariable(varName, value);
          continue;
        }

        // Handle other expressions
        const value = evaluatePythonExpression(line, env);
        if (value !== undefined) {
          env.output.push(String(value));
        }
      } catch (e) {
        throw new Error(`Error at line ${i + 1}: ${e.message}`);
      }
    }

    return {
      output: env.output.join('\n')
    };
  } catch (error) {
    return {
      output: '',
      error: `Python Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

// Helper function to evaluate Python expressions
function evaluatePythonExpression(expr: string, env: { variables: Map<string, any> }): any {
  // Handle basic arithmetic operations
  const arithmeticMatch = expr.match(/^(.+?)(\s*[\+\-\*\/]\s*.+)$/);
  if (arithmeticMatch) {
    const parts = expr.split(/(\+|\-|\*|\/)/);
    const values = parts.map(part => {
      part = part.trim();
      if (['+', '-', '*', '/'].includes(part)) return part;
      return evaluatePythonExpression(part, env);
    });

    // Evaluate the expression
    let result = Number(values[0]);
    for (let i = 1; i < values.length; i += 2) {
      const operator = values[i];
      const value = Number(values[i + 1]);
      switch (operator) {
        case '+': result += value; break;
        case '-': result -= value; break;
        case '*': result *= value; break;
        case '/': result /= value; break;
      }
    }
    return result;
  }

  // Handle variable references
  if (/^[a-zA-Z_]\w*$/.test(expr)) {
    return env.variables.get(expr);
  }

  // Handle numeric literals
  if (/^-?\d+(\.\d+)?$/.test(expr)) {
    return Number(expr);
  }

  // Handle string literals
  if (/^["'].*["']$/.test(expr)) {
    return expr.slice(1, -1);
  }

  throw new Error(`Invalid expression: ${expr}`);
}

export async function compileAndRun(code: string, language: string): Promise<CompileResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return {
        output: '',
        error: 'User not authenticated'
      };
    }

    if (!code || !language) {
      return {
        output: '',
        error: 'Code and language are required'
      };
    }

    let result: CompileResult;

    switch (language.toLowerCase()) {
      case 'javascript':
        result = await executeJavaScript(code, false);
        break;
      case 'typescript':
        result = await executeJavaScript(code, true);
        break;
      case 'c':
        result = await executeCCode(code, false);
        break;
      case 'cpp':
        result = await executeCCode(code, true);
        break;
      case 'python':
        result = await executePython(code);
        break;
      default:
        return {
          output: '',
          error: `Language '${language}' is not supported`
        };
    }

    // Ensure output and error are strings and not too long
    const MAX_LENGTH = 5000;
    
    // Convert output and error to strings, handling null/undefined
    const outputStr = result.output ? String(result.output).substring(0, MAX_LENGTH) : '';
    const errorStr = result.error ? String(result.error).substring(0, MAX_LENGTH) : '';

    // Store execution in Supabase with string values
    const { data: executionData, error: insertError } = await supabase
      .from('code_executions')
      .insert({
        user_id: user.id,
        language: language.toLowerCase(),
        code: code.substring(0, MAX_LENGTH),
        output: outputStr || null,  // Use empty string if null
        error: errorStr || null,    // Use empty string if null
        executed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to save code execution:', insertError);
      // Return the result even if saving failed
      return {
        ...result,
        error: result.error || 'Failed to save execution'
      };
    }

    return {
      ...result,
      executionId: executionData?.id
    };
  } catch (error) {
    console.error('Compilation error:', error);
    return {
      output: '',
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}