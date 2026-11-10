import { useEffect, useState, useCallback } from 'react';import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { TRANSFORMERS, $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  Bold, Italic, Code, List, Save, CheckCircle
} from 'lucide-react';

const editorTheme = {
  paragraph: 'editor-paragraph',
  heading: {
    h1: 'editor-h1',
    h2: 'editor-h2',
    h3: 'editor-h3',
  },
  list: {
    ul: 'list-disc ml-6 my-2 text-slate-300',
    ol: 'list-decimal ml-6 my-2 text-slate-300',
    listitem: 'my-1',
  },
  quote: 'editor-quote',
  code: 'editor-code',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    code: 'editor-text-code',
  },
};

interface EditorProps {
  initialContent: string;
  onSave: (markdown: string) => void;
  chapterTitle: string;
}

// Controller to synchronize external chapter switches & toolbar commands
function EditorBridge({ initialContent, onSave }: { initialContent: string; onSave: (md: string) => void }) {
  const [editor] = useLexicalComposerContext();
  const [savedStatus, setSavedStatus] = useState<string>('Ready');

  useEffect(() => {
    editor.update(() => {
      $convertFromMarkdownString(initialContent, TRANSFORMERS);
    });
  }, [initialContent, editor]);

  const handleManualSave = useCallback(() => {
    editor.getEditorState().read(() => {
      const markdown = $convertToMarkdownString(TRANSFORMERS);
      onSave(markdown);
      setSavedStatus('Saved!');
      setTimeout(() => setSavedStatus('Ready'), 2000);
    });
  }, [editor, onSave]);

  // Debounced Auto-Save
  useEffect(() => {
    const removeListener = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const markdown = $convertToMarkdownString(TRANSFORMERS);
        onSave(markdown);
      });
    });
    return () => removeListener();
  }, [editor, onSave]);

  return (
    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4 py-2">
      <div className="flex items-center gap-1">
        <button
          onClick={() => editor.update(() => editor.dispatchCommand(undefined as any, undefined))}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" title="Italic">
          <Italic size={16} />
        </button>
        <button className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" title="Code">
          <Code size={16} />
        </button>
        <div className="mx-2 h-4 w-[1px] bg-slate-700" />
        <button className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" title="List">
          <List size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 flex items-center gap-1">
          {savedStatus === 'Saved!' && <CheckCircle size={13} className="text-emerald-400" />}
          {savedStatus}
        </span>
        <button
          onClick={handleManualSave}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-600 transition"
        >
          <Save size={13} /> Save
        </button>
      </div>
    </div>
  );
}

export function LexicalMarkdownEditor({ initialContent, onSave, chapterTitle }: EditorProps) {
  const initialConfig = {
    namespace: 'EsperEditor',
    theme: editorTheme,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
    ],
    onError: (error: Error) => console.error(error),
  };

  return (
    <div className="flex h-full flex-col bg-[#030712] overflow-hidden">
      <LexicalComposer initialConfig={initialConfig}>
        <EditorBridge initialContent={initialContent} onSave={onSave} />
        <div className="flex-1 overflow-y-auto px-8 py-6 max-w-4xl w-full mx-auto">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="editor-input min-h-[400px] outline-none" />
            }
            placeholder={
              <div className="pointer-events-none absolute text-slate-600 text-sm">
                Start typing or paste Markdown...
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <ListPlugin />
          <LinkPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        </div>
      </LexicalComposer>
    </div>
  );
}