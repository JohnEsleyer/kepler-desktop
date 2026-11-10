import React, { useEffect, useRef, useState, useMemo } from 'react';
import { RotateCw, Code, Play, Save, X, ShieldCheck } from 'lucide-react';
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
}

export const CustomWebview: React.FC<CustomWebviewProps> = ({
  title,
  fileName = 'simulation.html',
  content,
  kind = 'html',
  className = '',
  onSave,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [previewInEditor, setPreviewInEditor] = useState(false);
  const [code, setCode] = useState(content);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCode(content);
  }, [content]);

  const styledContent = useMemo(() => `
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
  `, [content, code, isEditorOpen]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(timer);
  }, [content, reloadKey, isEditorOpen]);

  const highlightedHtml = useMemo(() => {
    try {
      return Prism.highlight(code, Prism.languages.markup || Prism.languages.html, 'markup');
    } catch {
      return code;
    }
  }, [code]);

  const handleSave = async () => {
    if (onSave) {
      await onSave(fileName, code);
      setSavedStatus('Saved!');
      setTimeout(() => setSavedStatus(null), 2000);
    }
  };

  const insertTag = (tagText: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newCode = code.substring(0, start) + tagText + code.substring(end);
    setCode(newCode);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tagText.length, start + tagText.length);
    }, 10);
  };

  const linesCount = useMemo(() => Math.max(1, code.split('\n').length), [code]);

  return (
    <>
      {/* Standard embedded preview container */}
      <div className={`relative flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#070b14] h-full w-full ${className}`}>
        <div className="flex h-9 select-none items-center justify-between border-b border-slate-800/80 bg-[#060913] px-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="truncate text-xs font-semibold text-slate-300">{title}</span>
            <span className="flex items-center gap-1 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
              <ShieldCheck size={11} className="text-indigo-400" /> Sandboxed
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-indigo-300 transition hover:bg-slate-800"
              title="Edit HTML in Fullscreen"
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

      {/* Fullscreen HTML Code Editor (Always in fullscreen, no minimize button) */}
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
              <button
                type="button"
                onClick={() => setPreviewInEditor(!previewInEditor)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  previewInEditor
                    ? 'border border-indigo-500/30 bg-indigo-600/30 text-indigo-300'
                    : 'border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {previewInEditor ? <Code size={13} /> : <Play size={13} className="text-emerald-400" />}
                <span>{previewInEditor ? 'Show Code' : 'Preview Live'}</span>
              </button>

              {savedStatus && (
                <span className="font-mono text-xs text-emerald-400 font-semibold">{savedStatus}</span>
              )}

              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-500"
              >
                <Save size={13} />
                <span>Save</span>
              </button>
            </div>
          </div>

          {previewInEditor ? (
            <div className="flex-1 bg-black">
              <iframe
                title="Fullscreen Preview"
                srcDoc={styledContent}
                sandbox="allow-scripts allow-modals"
                className="h-full w-full border-0 bg-[#030712]"
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
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
                    onClick={() => insertTag(snip.text)}
                    className="shrink-0 rounded border border-slate-800 bg-slate-900 px-2 py-1 font-mono text-[11px] text-indigo-300 transition hover:bg-slate-800"
                  >
                    {snip.label}
                  </button>
                ))}
              </div>

              {/* Editor Workspace with Line Numbers and Syntax Highlighting */}
              <div className="relative flex flex-1 overflow-hidden bg-[#020617]">
                {/* Line Numbers Gutter */}
                <div className="w-12 select-none border-r border-slate-800/80 bg-[#050811] py-4 text-right font-mono text-xs text-slate-600 overflow-hidden pr-3">
                  {Array.from({ length: linesCount }, (_, i) => (
                    <div key={i + 1} className="leading-6">{i + 1}</div>
                  ))}
                </div>

                {/* Overlaid Highlighted Display & Transparent Input Textarea */}
                <div className="relative flex-1 overflow-auto p-4">
                  <pre
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 m-0 p-4 font-mono text-xs leading-6 text-slate-200 overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: highlightedHtml + '\n' }}
                  />
                  <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    spellCheck={false}
                    className="absolute inset-0 h-full w-full resize-none bg-transparent p-4 font-mono text-xs leading-6 text-transparent caret-indigo-400 outline-none select-text"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
  