import { useCallback, useEffect, useRef, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-sql';

// Expose Prism globally for @lexical/code highlighter
if (typeof window !== 'undefined') {
  (window as any).Prism = Prism;
}

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import {
  TRANSFORMERS,
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from '@lexical/markdown';
import {
  FORMAT_TEXT_COMMAND,
  $getSelection,
  $isRangeSelection,
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from '@lexical/list';
import { CodeHighlightNode, CodeNode, registerCodeHighlighting, $isCodeNode, $createCodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { SlashCommandPlugin } from './plugins/SlashCommandPlugin';
import { MathPlugin, MathNode, MATH_TRANSFORMER } from './plugins/MathPlugin';
import 'katex/dist/katex.min.css';
import { CustomSelect } from '../components/ui/CustomUI';
import {
  Bold,
  Italic,
  Strikethrough,
  Code2,
  Braces,
  List,
  ListOrdered,
  Quote,
  Save,
  CheckCircle,
} from 'lucide-react';

const CODE_LANGUAGES = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Python', value: 'python' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'Bash', value: 'bash' },
  { label: 'JSON', value: 'json' },
  { label: 'HTML', value: 'markup' },
  { label: 'CSS', value: 'css' },
];

const EDITOR_TRANSFORMERS = [...TRANSFORMERS, MATH_TRANSFORMER];

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
  codeHighlight: {
    atrule: 'token-atrule',
    attr: 'token-attr',
    boolean: 'token-boolean',
    builtin: 'token-builtin',
    cdata: 'token-cdata',
    char: 'token-char',
    class: 'token-class',
    'class-name': 'token-class-name',
    comment: 'token-comment',
    constant: 'token-constant',
    deleted: 'token-deleted',
    doctype: 'token-doctype',
    entity: 'token-entity',
    function: 'token-function',
    important: 'token-important',
    inserted: 'token-inserted',
    keyword: 'token-keyword',
    number: 'token-number',
    operator: 'token-operator',
    prolog: 'token-prolog',
    property: 'token-property',
    punctuation: 'token-punctuation',
    regex: 'token-regex',
    selector: 'token-selector',
    string: 'token-string',
    symbol: 'token-symbol',
    tag: 'token-tag',
    url: 'token-url',
    variable: 'token-variable',
  },
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    code: 'editor-text-code',
  },
};

interface EditorProps {
  initialContent: string;
  onSave: (markdown: string) => void;
  chapterTitle: string;
}

function EditorBridge({
  initialContent,
  onSave,
  chapterTitle,
}: EditorProps) {
  const [editor] = useLexicalComposerContext();
  const [savedStatus, setSavedStatus] = useState<string>('Ready');
  const [selectedLang, setSelectedLang] = useState<string>('javascript');
  const autosaveTimer = useRef<number | null>(null);
  const statusTimer = useRef<number | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Register Prism syntax highlighting for code blocks.
  useEffect(() => {
    return registerCodeHighlighting(editor);
  }, [editor]);

  // Hydrate the editor from Markdown once per chapter.
  useEffect(() => {
    editor.update(() => {
      $convertFromMarkdownString(initialContent, EDITOR_TRANSFORMERS);
    });
  }, [initialContent, editor]);

  const flashStatus = useCallback((status: string) => {
    setSavedStatus(status);
    if (statusTimer.current) window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setSavedStatus('Ready'), 1800);
  }, []);

  const handleManualSave = useCallback(() => {
    editor.getEditorState().read(() => {
      const markdown = $convertToMarkdownString(EDITOR_TRANSFORMERS);
      onSaveRef.current(markdown);
      flashStatus('Saved!');
    });
  }, [editor, flashStatus]);

  // Debounced autosave.
  useEffect(() => {
    const removeListener = editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
      autosaveTimer.current = window.setTimeout(() => {
        editorState.read(() => {
          const markdown = $convertToMarkdownString(EDITOR_TRANSFORMERS);
          onSaveRef.current(markdown);
        });
        flashStatus('Autosaved');
      }, 500);
    });
    return () => {
      removeListener();
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
      if (statusTimer.current) window.clearTimeout(statusTimer.current);
    };
  }, [editor, flashStatus]);

  // Flush pending edits when chapter is switched.
  useEffect(() => {
    return () => {
      const markdown = editor.getEditorState().read(() => $convertToMarkdownString(EDITOR_TRANSFORMERS));
      onSaveRef.current(markdown);
    };
  }, [editor]);

  const applyCodeLanguage = (lang: string) => {
    setSelectedLang(lang);
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      let node = selection.anchor.getNode();
      while (node) {
        if ($isCodeNode(node)) {
          node.setLanguage(lang);
          return;
        }
        const parent = node.getParent();
        if (!parent) return;
        node = parent;
      }
    });
  };

  const setBlock = (kind: 'h1' | 'h2' | 'quote' | 'code') => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      if (kind === 'h1') $setBlocksType(selection, () => $createHeadingNode('h1'));
      else if (kind === 'h2') $setBlocksType(selection, () => $createHeadingNode('h2'));
      else if (kind === 'quote') $setBlocksType(selection, () => $createQuoteNode());
      else {
        $setBlocksType(selection, () => {
          const node = $createCodeNode();
          node.setLanguage(selectedLang);
          return node;
        });
      }
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#030712]">
      <div className="flex select-none flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-[#060913] px-4 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
            className="rounded p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Bold"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
            className="rounded p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Italic"
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
            className="rounded p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Strikethrough"
          >
            <Strikethrough size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
            className="rounded p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Inline code"
          >
            <Code2 size={15} />
          </button>
          <div className="mx-1 h-4 w-[1px] bg-slate-800" />
          <button
            type="button"
            onClick={() => setBlock('code')}
            className="rounded p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Code block"
          >
            <Braces size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
            className="rounded p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Bullet list"
          >
            <List size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
            className="rounded p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Numbered list"
          >
            <ListOrdered size={15} />
          </button>
          <button
            type="button"
            onClick={() => setBlock('quote')}
            className="rounded p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Quote"
          >
            <Quote size={15} />
          </button>
          <div className="mx-1 h-4 w-[1px] bg-slate-800" />
          <CustomSelect value={selectedLang} options={CODE_LANGUAGES} onChange={applyCodeLanguage} />
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-slate-400">
            {savedStatus === 'Saved!' || savedStatus === 'Autosaved' ? (
              <CheckCircle size={13} className="text-emerald-400" />
            ) : null}
            {savedStatus}
          </span>
          <button
            onClick={handleManualSave}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600/80 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-600"
          >
            <Save size={13} /> Save
          </button>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-8 py-6 pb-[60vh]">
        <RichTextPlugin
          contentEditable={<ContentEditable className="editor-input min-h-[70vh] pb-[40vh] outline-none" />}
          placeholder={
            <div className="pointer-events-none absolute text-sm text-slate-600">
              Type '/' for commands or start typing notes...
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <AutoFocusPlugin />
        <ListPlugin />
        <LinkPlugin />
        <MarkdownShortcutPlugin transformers={EDITOR_TRANSFORMERS} />
        <SlashCommandPlugin defaultCodeLanguage={selectedLang} />
        <MathPlugin />
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
      MathNode,
    ],
    onError: (error: Error) => console.error(error),
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#030712]">
      <LexicalComposer initialConfig={initialConfig}>
        <EditorBridge initialContent={initialContent} onSave={onSave} chapterTitle={chapterTitle} />
      </LexicalComposer>
    </div>
  );
}
