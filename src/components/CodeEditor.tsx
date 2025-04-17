import { useRef, useState, useEffect } from 'react';
import Editor from "@monaco-editor/react";
import { Button } from './ui/Button';
import { Play, Save, Copy, Download, Code2, RefreshCw, Check, History } from 'lucide-react';
import { compileAndRun } from '../lib/compilerService';
import { supabase } from '../lib/supabase';

interface CodeEditorProps {
  defaultLanguage?: string;
  defaultValue?: string;
  onSave?: (code: string) => void;
  readOnly?: boolean;
  theme?: 'vs-dark' | 'light';
  lessonId?: string;
}

export function CodeEditor({
  defaultLanguage = 'javascript',
  defaultValue = '',
  onSave,
  readOnly = false,
  theme = 'vs-dark',
  lessonId
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const [language, setLanguage] = useState(defaultLanguage);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState([
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'typescript', label: 'TypeScript' }
  ]);
  const [wasmError, setWasmError] = useState<string | null>(null);


  // Load saved code when lesson changes
  useEffect(() => {
    if (lessonId) {
      loadSavedCode();
    }
  }, [lessonId]);

  const loadSavedCode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First, check if a progress record exists
      const { data: existingProgress, error: progressError } = await supabase
        .from('progress')
        .select('content_progress')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (progressError) {
        console.error('Error loading progress:', progressError);
        return;
      }

      // If no progress exists, create a new progress record
      if (!existingProgress) {
        // Get the course_id from the lessons table
        const { data: lessonData, error: lessonError } = await supabase
          .from('lessons')
          .select('course_id')
          .eq('id', lessonId)
          .single();

        if (lessonError) {
          console.error('Error fetching lesson:', lessonError);
          return;
        }

        const { error: insertError } = await supabase
          .from('progress')
          .insert({
            user_id: user.id,
            lesson_id: lessonId,
            course_id: lessonData?.course_id,
            content_progress: {
              code: defaultValue,
              lastSaved: new Date().toISOString()
            }
          });

        if (insertError) {
          console.error('Error creating progress:', insertError);
          return;
        }

        if (defaultValue) {
          editorRef.current?.setValue(defaultValue);
        }
      } else if (existingProgress?.content_progress?.code) {
        editorRef.current?.setValue(existingProgress.content_progress.code);
      } else if (defaultValue) {
        editorRef.current?.setValue(defaultValue);
      }
    } catch (err) {
      console.error('Error loading saved code:', err);
    }
  };

  // Update editor language when prop changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        language: defaultLanguage
      });
    }
  }, [defaultLanguage]);

  useEffect(() => {
    if (lessonId) {
      fetchExecutionHistory();
    }
  }, [lessonId]);

  const fetchExecutionHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('code_executions')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('user_id', user.id)
        .order('executed_at', { ascending: false })
        .limit(5);

      if (data) {
        setExecutionHistory(data);
      }
    } catch (err) {
      console.error('Error fetching execution history:', err);
    }
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    
    // Load saved code after editor is mounted
    if (lessonId) {
      loadSavedCode();
    }
    
    // Configure editor theme
    editor.updateOptions({
      theme,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 14,
      lineHeight: 1.5,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      renderLineHighlight: 'all',
      occurrencesHighlight: true,
      renderIndentGuides: true,
      matchBrackets: 'always',
      automaticLayout: true,
      padding: { top: 16, bottom: 16 },
      lineNumbers: 'on',
      glyphMargin: true,
      folding: true,
      contextmenu: true,
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: true,
      wordWrap: 'on',
      bracketPairColorization: {
        enabled: true,
      },
    });
  };

  const handleSave = async () => {
    if (!onSave || !editorRef.current) return;
    
    const code = editorRef.current.getValue();
    setIsSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Get existing progress
      const { data: existingProgress, error: progressError } = await supabase
        .from('progress')
        .select('content_progress, course_id')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (progressError) {
        console.error('Error fetching progress:', progressError);
        return;
      }

      // If no progress exists, create a new record
      if (!existingProgress) {
        // Get the course_id from the lessons table
        const { data: lessonData } = await supabase
          .from('lessons')
          .select('course_id')
          .eq('id', lessonId)
          .single();

        const { error: insertError } = await supabase
          .from('progress')
          .upsert({
            user_id: user.id,
            lesson_id: lessonId,
            course_id: lessonData?.course_id,
            content_progress: {
              code,
              lastSaved: new Date().toISOString()
            }
          }, {
            onConflict: 'user_id,lesson_id'
          });

        if (insertError) {
          console.error('Error creating progress:', insertError);
          return;
        }
      } else {
        // Merge with existing progress
        const updatedProgress = {
          ...(existingProgress.content_progress || {}),
          code,
          lastSaved: new Date().toISOString()
        };

        // Update existing progress
        const { error: updateError } = await supabase
          .from('progress')
          .update({ content_progress: updatedProgress })
          .eq('user_id', user.id)
          .eq('lesson_id', lessonId);

        if (updateError) {
          console.error('Error updating progress:', updateError);
          return;
        }
      }

      // Save code execution history
      await supabase.from('code_executions').insert({
        code,
        language,
        output: output || null,
        error: error || null,
        lesson_id: lessonId,
        user_id: user.id
      });
      
      if (onSave) {
        await onSave(code);
      }
    } catch (err) {
      console.error('Error saving code:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRun = async () => {
    if (!editorRef.current) return;

    setIsRunning(true);
    setError('');
    setOutput('');

    try {
      const code = editorRef.current.getValue();
      const result = await compileAndRun(code, language);

      // Clear previous output/error
      setOutput('');
      setError('');

      if (result.error) {
        // Format error message
        const errorMessage = formatError(result.error);
        setError(errorMessage);
      } else {
        setOutput(result.output);
        // Save successful execution
        if (lessonId) { 
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get existing progress
            const { data: existingProgress, error: progressError } = await supabase
              .from('progress')
              .select('content_progress')
              .eq('user_id', user.id)
              .eq('lesson_id', lessonId)
              .maybeSingle();

            if (progressError) {
              console.error('Error fetching progress:', progressError);
              return;
            }

            // Save execution and update progress
            await supabase.from('code_executions').insert({
              code,
              output: result.output,
              language,
              lesson_id: lessonId,
              user_id: user.id
            });

            // Update progress with merged content
            if (onSave) {
              const updatedProgress = {
                ...(existingProgress?.content_progress || {}),
                code,
                lastRun: new Date().toISOString(),
                lastOutput: result.output,
                executionHistory: [
                  ...(existingProgress?.content_progress?.executionHistory || []),
                  {
                    timestamp: new Date().toISOString(),
                    success: true,
                    output: result.output
                  }
                ].slice(-5) // Keep last 5 executions
              };

              const { error: updateError } = await supabase
                .from('progress')
                .update({ content_progress: updatedProgress })
                .eq('user_id', user.id)
                .eq('lesson_id', lessonId);

              if (updateError) {
                console.error('Error updating progress:', updateError);
                return;
              }

              await onSave(code);
            }

            // Refresh execution history
            await fetchExecutionHistory();
          } catch (err) {
            console.error('Error saving execution:', err);
          }
        }
      }
    } catch (err) {
      const errorMessage = formatError(err);
      setError(errorMessage);
    } finally {
      setIsRunning(false);
    }
  };

  const formatError = (error: unknown): string => {
    if (error instanceof Error) {
      // Extract the most relevant part of the error message
      const message = error.message;
      if (message.includes('ReferenceError')) {
        return `ReferenceError: ${message.split('ReferenceError:')[1].trim()}`;
      }
      if (message.includes('SyntaxError')) {
        return `SyntaxError: ${message.split('SyntaxError:')[1].trim()}`;
      }
      if (message.includes('TypeError')) {
        return `TypeError: ${message.split('TypeError:')[1].trim()}`;
      }
      return message;
    }
    return String(error);
  };

  const handleCopy = () => {
    if (editorRef.current) {
      navigator.clipboard.writeText(editorRef.current.getValue());
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (editorRef.current) {
      const code = editorRef.current.getValue();
      const blob = new Blob([code], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `code.${language}`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const handleReset = () => {
    if (editorRef.current) {
      editorRef.current.setValue(defaultValue);
      setOutput('');
      setError('');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`glass-effect rounded-lg overflow-hidden ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center space-x-2">
          <Code2 className="h-5 w-5 text-white" />
          <select
            className="bg-gray-800 text-gray-200 rounded-md px-3 py-1.5 text-sm border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={language}
            onChange={(e) => {
              const newLang = e.target.value;
              setLanguage(newLang);
              if (editorRef.current) {
                editorRef.current.updateOptions({
                  language: newLang
                });
              }
            }}
          >
            {availableLanguages.map(lang => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>
          {wasmError && (
            <span className="text-amber-400 text-xs">
              {wasmError}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="ghost" onClick={handleCopy}>
            {isCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDownload}>
            <Download className="w-4 h-4 text-white" />
          </Button>
          {lessonId && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="w-4 h-4 text-white" />
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleReset}>
            <RefreshCw className="w-4 h-4 text-white" />
          </Button>
          {onSave && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleSave}
              isLoading={isSaving}
            >
              <Save className="w-4 h-4 mr-2 text-white" />
              Save
            </Button>
          )}
          <Button size="sm" onClick={handleRun} isLoading={isRunning}>
            <Play className="w-4 h-4 mr-2 text-white" />
            Run
          </Button>
        </div>
      </div>
      
      <div className="relative">
        <Editor
          height={isFullscreen ? "calc(100vh - 200px)" : "400px"}
          language={language}
          defaultValue={defaultValue}
          theme={theme}
          options={{
            readOnly,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 14,
            lineHeight: 1.5,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            renderLineHighlight: 'all',
            occurrencesHighlight: true,
            renderIndentGuides: true,
            matchBrackets: 'always',
            padding: { top: 16, bottom: 16 },
            wordWrap: 'on',
            bracketPairColorization: {
              enabled: true,
            },
          }}
          onMount={handleEditorDidMount}
          className="border-t border-gray-800"
        />
      </div>

      {showHistory && executionHistory.length > 0 && (
        <div className="border-t border-gray-800 bg-gray-900">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Execution History:</h3>
            <div className="space-y-2">
              {executionHistory.map((execution) => (
                <div 
                  key={execution.id}
                  className="text-sm p-2 rounded-lg bg-gray-800 hover:bg-gray-700 cursor-pointer"
                  onClick={() => {
                    if (editorRef.current) {
                      editorRef.current.setValue(execution.code);
                    }
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">
                      {new Date(execution.executed_at).toLocaleTimeString()}
                    </span>
                    {execution.error ? (
                      <span className="text-red-400 text-xs">Error</span>
                    ) : (
                      <span className="text-green-400 text-xs">Success</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(output || error) && (
        <div className="border-t border-gray-800 bg-gray-900">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">
              {error ? 'Error:' : 'Output:'}
            </h3>
            <div className="font-mono text-sm">
              {error ? (
                <pre className="text-red-400 whitespace-pre-wrap p-4 bg-red-900/20 rounded-lg flex items-start">
                  <span className="mr-2">❌</span>
                  {error}
                </pre>
              ) : (
                <pre className="text-green-400 whitespace-pre-wrap p-4 bg-green-900/20 rounded-lg flex items-start">
                  <span className="mr-2">✅</span>
                  {output}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}