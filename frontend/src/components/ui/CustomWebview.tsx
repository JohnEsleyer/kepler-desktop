import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { RotateCw, Code, Play, Save, X, ShieldCheck, Wand2, Trash2 } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';

interface CustomWebviewProps {
  title: string;
  fileName?: string;
  content: string;
  kind?: 'html' | 'json';
  className?: string;
  onSave?: (fileName: string, content: string) => Promise<void>;
  onDelete?: () => void;
}

// Basic HTML formatter to format HTML strings with proper tags and indentation
function formatHtmlCode(raw: string): string {
  let formatted = '';
  let indent = 0;
  const lines = raw
    .replace(/>\s*</g, '>\n<')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (line.match(/^<\/(?!.*>)/) || line.startsWith('</')) {
      indent = Math.max(0, indent - 1);
    }
    formatted += '  '.repeat(indent) + line + '\n';
    if (
      line.match(/^<[^\/!?][^>]*[^\/]>$/) &&
      !line.startsWith('<area') &&
      !line.startsWith('<base') &&
      !line.startsWith('<br') &&
      !line.startsWith('<col') &&
      !line.startsWith('<embed') &&
      !line.startsWith('<hr') &&
      !line.startsWith('<img') &&
      !line.startsWith('<input') &&
      !line.startsWith('<link') &&
      !line.startsWith('<meta') &&
      !line.startsWith('<param') &&
      !line.startsWith('<source') &&
      !line.startsWith('<track') &&
      !line.startsWith('<wbr')
    ) {
      indent++;
    }
  }
  return formatted.trim();
}

export const CustomWebview: React.FC<CustomWebviewProps> = ({
  title,
  fileName = 'simulation.html',
  content,
  kind = 'html',
  className = '',
  onSave,
  onDelete,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorViewMode, setEditorViewMode] = useState<'split' | 'code' | 'preview'>('split');
  const [code, setCode] = useState(content);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const autosaveTimer = useRef<number | null>(null);

  useEffect(() => {
    setCode(content);
  }, [content]);

  const styledContent = useMemo(
    () => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 999px; }
          ::-webkit-scrollbar-thumb:hover { background: #334155; }
          body {
            margin: 0;
            padding: 0;
            background: #030712;
            color: #e2e8f0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow: auto;
          }
        </style>
      </head>
      <body>
        ${isEditorOpen ? code : content}
      </body>
    </html>
  `,
    [content, code, isEditorOpen]
  );

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 150);
    return () => clearTimeout(timer);
  }, [content, reloadKey, isEditorOpen]);

  const highlightedHtml = useMemo(() => {
    try {
      return Prism.highlight(code, Prism.languages.markup || Prism.languages.html, 'markup');
    } catch {
      return code;
    }
  }, [code]);

  const handleSave = useCallback(
    async (textToSave?: string) => {
      const finalContent = textToSave !== undefined ? textToSave : code;
      if (onSave) {
        await onSave(fileName, finalContent);
        setSavedStatus('Saved!');
        setTimeout(() => setSavedStatus(null), 2000);
      }
    },
    [fileName, code, onSave]
  );

  // Debounced real-time save while typing HTML
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      handleSave(newCode);
    }, 600);
  };

  const handleFormat = () => {
    const formatted = formatHtmlCode(code);
    setCode(formatted);
    handleSave(formatted);
  };

  // Support Tab key for 2-space indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = el.value;
      const next = val.substring(0, start) + '  ' + val.substring(end);
      handleCodeChange(next);
      setTimeout(() => {
        el.setSelectionRange(start + 2, start + 2);
      }, 0);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const insertSnippet = (snippetText: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newCode = code.substring(0, start) + snippetText + code.substring(end);
    handleCodeChange(newCode);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + snippetText.length, start + snippetText.length);
    }, 10);
  };

  const linesCount = useMemo(() => Math.max(1, code.split('\n').length), [code]);

  return (
    <>
      {/* Standard embedded preview container */}
      <div className={`relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#070b14] ${className}`}>
        <div className="flex h-9 select-none items-center justify-between border-b border-slate-800/80 bg-[#060913] px-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="truncate text-xs font-semibold text-slate-300">{title}</span>
            <span className="flex items-center gap-1 rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
              <ShieldCheck size={11} className="text-indigo-400" /> HTML
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-indigo-300 transition hover:bg-slate-800"
              title="Open HTML Code Editor"
            >
              <Code size={13} />
              <span>Edit HTML</span>
            </button>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title="Reload canvas"
            >
              <RotateCw size={13} />
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg p-1 text-slate-500 transition hover:bg-rose-950/40 hover:text-rose-400"
                title="Remove Companion Visual"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="relative flex-1 bg-[#030712]">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#030712]/70 backdrop-blur-xs">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
            </div>
          )}

          <iframe
            key={reloadKey}
            ref={iframeRef}
            title={title}
            srcDoc={styledContent}
            sandbox="allow-scripts allow-modals"
            className="h-full w-full border-0 bg-[#030712]"
          />
        </div>
      </div>

      {/* HTML Code Editor with Syntax Highlighting and Split Preview */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-[120] flex flex-col bg-[#030712] text-slate-100">
          {/* Top Bar */}
          <div className="flex h-12 items-center justify-between border-b border-slate-800 bg-[#070b14] px-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditorOpen(false)}
                className="flex items-center gap-1.5 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                title="Close Editor"
              >
                <X size={16} />
              </button>
              <div className="h-4 w-[1px] bg-slate-800" />
              <div>
                <h2 className="text-xs font-bold text-white">{title}</h2>
                <p className="font-mono text-[10px] text-slate-500">{fileName} · HTML Text Editor</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View mode toggle: Split, Code Only, Preview Only */}
              <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setEditorViewMode('code')}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    editorViewMode === 'code' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Code
                </button>
                <button
                  type="button"
                  onClick={() => setEditorViewMode('split')}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    editorViewMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Split
                </button>
                <button
                  type="button"
                  onClick={() => setEditorViewMode('preview')}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    editorViewMode === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Preview
                </button>
              </div>

              <button
                type="button"
                onClick={handleFormat}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
                title="Format HTML Code"
              >
                <Wand2 size={13} className="text-amber-400" />
                <span>Format</span>
              </button>

              {savedStatus && (
                <span className="font-mono text-xs font-semibold text-emerald-400">{savedStatus}</span>
              )}

              <button
                type="button"
                onClick={() => handleSave()}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-500"
              >
                <Save size={13} />
                <span>Save</span>
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Left: Code Editor (shown in 'code' or 'split') */}
            {editorViewMode !== 'preview' && (
              <div className={`flex flex-col overflow-hidden border-r border-slate-800 ${editorViewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
                {/* HTML Snippet Toolbar */}
                <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-800/80 bg-[#060913] px-4 py-2 scrollbar-none">
                  {[
                    { label: '<div>', text: '<div></div>' },
                    { label: '<canvas>', text: '<canvas id="c" width="400" height="400"></canvas>' },
                    { label: '<script>', text: '<script>\n  \n</script>' },
                    { label: '<style>', text: '<style>\n  \n</style>' },
                    { label: '</>', text: '</div>' },
                    { label: 'class=""', text: 'class=""' },
                    { label: 'id=""', text: 'id=""' },
                  ].map((snip) => (
                    <button
                      key={snip.label}
                      type="button"
                      onClick={() => insertSnippet(snip.text)}
                      className="shrink-0 rounded border border-slate-800 bg-slate-900 px-2 py-1 font-mono text-[11px] text-indigo-300 transition hover:bg-slate-800"
                    >
                      {snip.label}
                    </button>
                  ))}
                </div>

                {/* Editor Workspace with Line Numbers and Syntax Highlighting */}
                <div className="relative flex flex-1 overflow-hidden bg-[#020617]">
                  {/* Line Numbers Gutter */}
                  <div
                    ref={gutterRef}
                    className="w-12 select-none overflow-hidden border-r border-slate-800/80 bg-[#050811] py-4 pr-3 text-right font-mono text-xs text-slate-600"
                  >
                    {Array.from({ length: linesCount }, (_, i) => (
                      <div key={i + 1} className="leading-6">
                        {i + 1}
                      </div>
                    ))}
                  </div>

                  {/* Overlaid Highlighted Display & Transparent Input Textarea */}
                  <div className="relative flex-1 overflow-auto">
                    <pre
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 m-0 p-4 font-mono text-xs leading-6 text-slate-200 overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: highlightedHtml + '\n' }}
                    />
                    <textarea
                      ref={textareaRef}
                      value={code}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onScroll={handleScroll}
                      spellCheck={false}
                      className="absolute inset-0 h-full w-full resize-none bg-transparent p-4 font-mono text-xs leading-6 text-transparent caret-indigo-400 outline-none select-text"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Right: Live Preview (shown in 'preview' or 'split') */}
            {editorViewMode !== 'code' && (
              <div className={`relative flex flex-col bg-[#030712] ${editorViewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
                <div className="flex h-8 items-center justify-between border-b border-slate-800 bg-[#060913] px-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                    <Play size={12} className="text-emerald-400" /> Live Interactive Preview
                  </div>
                  <button
                    onClick={() => setReloadKey((k) => k + 1)}
                    className="rounded p-1 text-slate-400 hover:text-white"
                    title="Reload Preview"
                  >
                    <RotateCw size={12} />
                  </button>
                </div>
                <iframe
                  key={reloadKey}
                  title="Fullscreen Live Preview"
                  srcDoc={styledContent}
                  sandbox="allow-scripts allow-modals"
                  className="h-full w-full border-0 bg-[#030712]"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
