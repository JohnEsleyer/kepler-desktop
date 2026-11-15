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
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-java';

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
  $convertToMarkdownString,
} from '@lexical/markdown';
import {
  FORMAT_TEXT_COMMAND,
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  $getRoot,
  $createParagraphNode,
  TextNode,
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { TableNode, TableCellNode, TableRowNode, $isTableNode } from '@lexical/table';
import { ListItemNode, ListNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from '@lexical/list';
import { CodeHighlightNode, CodeNode, registerCodeHighlighting, $isCodeNode, $createCodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { HR_TRANSFORMER } from './plugins/HorizontalRuleTransformer';
import { TABLE_TRANSFORMER, TableMarkdownPlugin, parseMarkdownToLexicalNodes } from './plugins/TableTransformer';
import { SlashCommandPlugin } from './plugins/SlashCommandPlugin';
import { MathPlugin, MathNode, MATH_TRANSFORMER } from './plugins/MathPlugin';
import { PageNode, $createPageNode } from './blocks/page/PageNode';
import { PAGE_TRANSFORMER, PAGE_RE } from './blocks/page/PageTransformer';
import { PasteMarkdownPlugin } from './plugins/PasteMarkdownPlugin';
import { RawInlineCodePlugin } from './plugins/RawInlineCodePlugin';
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
  Loader2,
} from 'lucide-react';

const CODE_LANGUAGES = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Kotlin', value: 'kotlin' },
  { label: 'Java', value: 'java' },
  { label: 'Python', value: 'python' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'Bash', value: 'bash' },
  { label: 'JSON', value: 'json' },
  { label: 'HTML', value: 'markup' },
  { label: 'CSS', value: 'css' },
  { label: 'SQL', value: 'sql' },
  { label: 'C', value: 'c' },
  { label: 'C++', value: 'cpp' },
  { label: 'Markdown', value: 'markdown' },
];

const EDITOR_TRANSFORMERS = [TABLE_TRANSFORMER, PAGE_TRANSFORMER, HR_TRANSFORMER, MATH_TRANSFORMER, ...TRANSFORMERS];

const editorTheme = {
  paragraph: 'editor-paragraph',
  heading: {
    h1: 'editor-h1',
    h2: 'editor-h2',
    h3: 'editor-h3',
  },
  list: {
    ul: 'editor-ul',
    ol: 'editor-ol',
    listitem: 'editor-listitem',
    nested: {
      listitem: 'editor-nested-listitem',
    },
  },
  hr: 'editor-hr',
  quote: 'editor-quote',
  code: 'editor-code',
  table: 'editor-table',
  tableRow: 'editor-table-row',
  tableCell: 'editor-table-cell',
  tableCellHeader: 'editor-table-cell-header',
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
  onSave: (markdown: string) => Promise<void> | void;
  chapterTitle: string;
}

function EditorBridge({
  initialContent,
  onSave,
  chapterTitle,
}: EditorProps) {
  const [editor] = useLexicalComposerContext();
  const [savedStatus, setSavedStatus] = useState<string>('Ready');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [selectedLang, setSelectedLang] = useState<string>('javascript');
  const [isRawView, setIsRawView] = useState<boolean>(false);
  const [rawText, setRawText] = useState<string>('');
  const autosaveTimer = useRef<number | null>(null);
  const statusTimer = useRef<number | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Register Prism syntax highlighting for code blocks.
  useEffect(() => {
    return registerCodeHighlighting(editor);
  }, [editor]);

  // Hydrate the editor from normalized Markdown once per chapter on mount.
  const isInitializedRef = useRef(false);
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        const nodes = parseMarkdownToLexicalNodes(initialContent, EDITOR_TRANSFORMERS);
        if (nodes.length > 0) {
          root.append(...nodes);
          const last = nodes[nodes.length - 1];
          if ($isTableNode(last)) {
            root.append($createParagraphNode());
          }
        } else {
          root.append($createParagraphNode());
        }
      });
    }
  }, [editor, initialContent]);

  const flashStatus = useCallback((status: string) => {
    setSavedStatus(status);
    if (statusTimer.current) window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setSavedStatus('Ready'), 2000);
  }, []);

  const handleManualSave = useCallback(async (contentOverride?: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const markdown = contentOverride !== undefined
        ? contentOverride
        : editor.getEditorState().read(() => $convertToMarkdownString(EDITOR_TRANSFORMERS));
      await Promise.resolve(onSaveRef.current(markdown));
      flashStatus('Saved!');
    } catch (err) {
      console.error('Failed to save:', err);
      flashStatus('Error saving');
    } finally {
      setIsSaving(false);
    }
  }, [editor, flashStatus, isSaving]);

  // Keyboard shortcut: Ctrl+S / Cmd+S for manual save without browser dialog.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave(isRawView ? rawText : undefined);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave, isRawView, rawText]);

  // Debounced real-time autosave
  useEffect(() => {
    const removeListener = editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
      if (isRawView) return;
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);

      setSavedStatus('Saving...');
      autosaveTimer.current = window.setTimeout(async () => {
        try {
          const markdown = editorState.read(() => $convertToMarkdownString(EDITOR_TRANSFORMERS));
          await Promise.resolve(onSaveRef.current(markdown));
          flashStatus('Saved in real-time');
        } catch (err) {
          console.error('Autosave failed:', err);
          flashStatus('Autosave error');
        }
      }, 350);
    });

    return () => {
      removeListener();
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
      if (statusTimer.current) window.clearTimeout(statusTimer.current);
    };
  }, [editor, flashStatus, isRawView]);

  // Flush pending edits when chapter is switched.
  useEffect(() => {
    return () => {
      if (isRawView) {
        onSaveRef.current(rawText);
      } else {
        const markdown = editor.getEditorState().read(() => $convertToMarkdownString(EDITOR_TRANSFORMERS));
        onSaveRef.current(markdown);
      }
    };
  }, [editor, isRawView, rawText]);

  // Transform LinkNode or TextNode containing kepler-page:// into PageNode
  useEffect(() => {
    const removeLinkTransform = editor.registerNodeTransform(LinkNode, (linkNode) => {
      const url = linkNode.getURL();
      if (url && url.startsWith('kepler-page://')) {
        const subpageId = url.replace('kepler-page://', '');
        const title = linkNode.getTextContent() || 'Untitled Page';
        const pageNode = $createPageNode(subpageId, title);
        linkNode.replace(pageNode);
      }
    });

    const removeTextTransform = editor.registerNodeTransform(TextNode, (textNode) => {
      const text = textNode.getTextContent();
      const match = PAGE_RE.exec(text);
      if (match && match.index !== undefined) {
        const full = match[0];
        const title = match[1];
        const subpageId = match[2];
        const before = text.slice(0, match.index);
        const after = text.slice(match.index + full.length);

        if (before) textNode.insertBefore($createTextNode(before));
        textNode.insertBefore($createPageNode(subpageId, title));
        if (after) textNode.insertBefore($createTextNode(after));
        textNode.remove();
      }
    });

    return () => {
      removeLinkTransform();
      removeTextTransform();
    };
  }, [editor]);

  // Listen for direct subpage insertion command from Slash menu
  useEffect(() => {
    const handleInsertPageNode = (e: Event) => {
      const ce = e as CustomEvent<{ subpageId: string; title: string }>;
      const { subpageId, title } = ce.detail;
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const pageNode = $createPageNode(subpageId, title);
          selection.insertNodes([pageNode, $createTextNode(' ')]);
        }
      });
    };

    window.addEventListener('kepler:insert-page-node', handleInsertPageNode);
    return () => {
      window.removeEventListener('kepler:insert-page-node', handleInsertPageNode);
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

  const toggleRawView = () => {
    if (!isRawView) {
      const markdown = editor.getEditorState().read(() => $convertToMarkdownString(EDITOR_TRANSFORMERS));
      setRawText(markdown);
      setIsRawView(true);
    } else {
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        const nodes = parseMarkdownToLexicalNodes(rawText, EDITOR_TRANSFORMERS);
        if (nodes.length > 0) {
          root.append(...nodes);
          const last = nodes[nodes.length - 1];
          if ($isTableNode(last)) {
            root.append($createParagraphNode());
          }
        } else {
          root.append($createParagraphNode());
        }
      });
      setIsRawView(false);
      handleManualSave(rawText);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#030712]">
      <div className="flex select-none flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-[#060913] px-4 py-2">
        <div className={`flex items-center gap-1 transition ${isRawView ? 'opacity-30 pointer-events-none' : ''}`}>
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

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleRawView}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
              isRawView
                ? 'border-indigo-500 bg-indigo-600/30 text-indigo-200 shadow-sm'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
            title="Toggle between Visual Editor and Raw Markdown source"
          >
            <Code2 size={13} className={isRawView ? 'text-indigo-400' : 'text-slate-400'} />
            <span>{isRawView ? 'Visual Mode' : 'Raw Markdown'}</span>
          </button>

          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            {savedStatus.includes('Saved') ? (
              <CheckCircle size={13} className="text-emerald-400" />
            ) : savedStatus.includes('Saving') ? (
              <Loader2 size={13} className="animate-spin text-indigo-400" />
            ) : null}
            {savedStatus}
          </span>
          <button
            onClick={() => handleManualSave(isRawView ? rawText : undefined)}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-75"
          >
            {isSaving ? (
              <>
                <Loader2 size={13} className="animate-spin text-white" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={13} />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Content Area / Raw Source View */}
      {isRawView ? (
        <div className="flex flex-1 flex-col overflow-hidden p-4 bg-[#020617]">
          <textarea
            value={rawText}
            onChange={(e) => {
              const val = e.target.value;
              setRawText(val);
              if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
              setSavedStatus('Saving...');
              autosaveTimer.current = window.setTimeout(async () => {
                try {
                  await Promise.resolve(onSaveRef.current(val));
                  flashStatus('Saved in real-time');
                } catch (err) {
                  flashStatus('Autosave error');
                }
              }, 350);
            }}
            placeholder="Raw Markdown source..."
            className="h-full w-full resize-none rounded-xl border border-slate-800 bg-[#030712] p-4 font-mono text-xs leading-relaxed text-slate-200 outline-none focus:border-indigo-500"
          />
        </div>
      ) : (
        <div className="relative w-full flex-1 overflow-y-auto px-6 py-6 pb-[60vh]">
          <RichTextPlugin
            contentEditable={<ContentEditable className="editor-input min-h-[70vh] w-full pb-[40vh] outline-none" />}
            placeholder={
              <div className="pointer-events-none absolute text-sm text-slate-600">
                Type '/' for commands, or $latex$ for formulas...
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <ListPlugin />
          <LinkPlugin />
          <HorizontalRulePlugin />
          <TablePlugin />
          <TableMarkdownPlugin />
          <TabIndentationPlugin />
          <MarkdownShortcutPlugin transformers={EDITOR_TRANSFORMERS} />
          <SlashCommandPlugin defaultCodeLanguage={selectedLang} />
          <MathPlugin />
          <PasteMarkdownPlugin transformers={EDITOR_TRANSFORMERS} />
          <RawInlineCodePlugin />
        </div>
      )}
    </div>
  );
}

export function LexicalMarkdownEditor({ initialContent, onSave, chapterTitle }: EditorProps) {
  const initialConfig = {
    namespace: 'KeplerEditor',
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
      HorizontalRuleNode,
      MathNode,
      PageNode,
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
  