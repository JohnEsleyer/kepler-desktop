import React, { useEffect, useMemo, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
} from 'lexical';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $createCodeNode, $isCodeNode } from '@lexical/code';
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from '@lexical/list';
import { $setBlocksType } from '@lexical/selection';
import {
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote,
  List,
  ListOrdered,
  Calculator,
  Sigma,
} from 'lucide-react';
import { $createMathNode } from './MathPlugin';

interface CommandItem {
  id: string;
  label: string;
  description: string;
  keywords: string;
  icon: React.ReactNode;
  action: (editor: any) => void;
}

export function SlashCommandPlugin({ defaultCodeLanguage = 'javascript' }: { defaultCodeLanguage?: string }) {
  const [editor] = useLexicalComposerContext();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const commandItems: CommandItem[] = useMemo(
    () => [
      {
        id: 'h1',
        label: 'Heading 1',
        description: 'Big section heading',
        keywords: 'heading title h1',
        icon: <Heading1 size={15} />,
        action: () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode('h1'));
          }
        },
      },
      {
        id: 'h2',
        label: 'Heading 2',
        description: 'Medium section heading',
        keywords: 'heading subtitle h2',
        icon: <Heading2 size={15} />,
        action: () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode('h2'));
          }
        },
      },
      {
        id: 'h3',
        label: 'Heading 3',
        description: 'Small subsection heading',
        keywords: 'heading h3',
        icon: <Heading3 size={15} />,
        action: () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode('h3'));
          }
        },
      },
      {
        id: 'code',
        label: 'Code Block',
        description: `Code snippet (${defaultCodeLanguage})`,
        keywords: 'code snippet pre programming block',
        icon: <Code size={15} />,
        action: () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const codeNode = $createCodeNode();
            codeNode.setLanguage(defaultCodeLanguage);
            $setBlocksType(selection, () => codeNode);
            const p1 = $createParagraphNode();
            codeNode.insertAfter(p1);
            codeNode.select();
          }
        },
      },
      {
        id: 'code-js',
        label: 'Code Block (JavaScript)',
        description: 'JavaScript syntax highlighted snippet',
        keywords: 'code js javascript programming script',
        icon: <span className="font-mono text-xs text-amber-400 font-bold">JS</span>,
        action: () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const codeNode = $createCodeNode();
            codeNode.setLanguage('javascript');
            $setBlocksType(selection, () => codeNode);
            const p1 = $createParagraphNode();
            codeNode.insertAfter(p1);
            codeNode.select();
          }
        },
      },
      {
        id: 'code-ts',
        label: 'Code Block (TypeScript)',
        description: 'TypeScript syntax highlighted snippet',
        keywords: 'code ts typescript typed',
        icon: <span className="font-mono text-xs text-blue-400 font-bold">TS</span>,
        action: () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const codeNode = $createCodeNode();
            codeNode.setLanguage('typescript');
            $setBlocksType(selection, () => codeNode);
            const p1 = $createParagraphNode();
            codeNode.insertAfter(p1);
            codeNode.select();
          }
        },
      },
      {
        id: 'code-kotlin',
        label: 'Code Block (Kotlin)',
        description: 'Kotlin syntax highlighted snippet',
        keywords: 'code kt kotlin fun class android val var',
        icon: <span className="font-mono text-xs text-purple-400 font-bold">KT</span>,
        action: () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const codeNode = $createCodeNode();
            codeNode.setLanguage('kotlin');
            $setBlocksType(selection, () => codeNode);
            const p1 = $createParagraphNode();
            codeNode.insertAfter(p1);
            codeNode.select();
          }
        },
      },
      {
        id: 'code-java',
        label: 'Code Block (Java)',
        description: 'Java syntax highlighted snippet',
        keywords: 'code java jvm class public static void',
        icon: <span className="font-mono text-xs text-red-400 font-bold">JAVA</span>,
        action: () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const codeNode = $createCodeNode();
            codeNode.setLanguage('java');
            $setBlocksType(selection, () => codeNode);
            const p1 = $createParagraphNode();
            codeNode.insertAfter(p1);
            codeNode.select();
          }
        },
      },
      {
        id: 'code-python',
        label: 'Code Block (Python)',
        description: 'Python syntax highlighted snippet',
        keywords: 'code py python def class',
        icon: <span className="font-mono text-xs text-emerald-400 font-bold">PY</span>,
        action: () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const codeNode = $createCodeNode();
            codeNode.setLanguage('python');
            $setBlocksType(selection, () => codeNode);
            const p1 = $createParagraphNode();
            codeNode.insertAfter(p1);
            codeNode.select();
          }
        },
      },
      {
        id: 'code-go',
        label: 'Code Block (Go)',
        description: 'Golang syntax highlighted snippet',
        keywords: 'code go golang func',
        icon: <span className="font-mono text-xs text-cyan-400 font-bold">GO</span>,
        action: () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const codeNode = $createCodeNode();
            codeNode.setLanguage('go');
            $setBlocksType(selection, () => codeNode);
            const p1 = $createParagraphNode();
            codeNode.insertAfter(p1);
            codeNode.select();
          }
        },
      },
      {
        id: 'code-rust',
        label: 'Code Block (Rust)',
        description: 'Rust syntax highlighted snippet',
        keywords: 'code rust rs fn struct',
        icon: <span className="font-mono text-xs text-orange-400 font-bold">RS</span>,
        action: () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const codeNode = $createCodeNode();
            codeNode.setLanguage('rust');
            $setBlocksType(selection, () => codeNode);
            const p1 = $createParagraphNode();
            codeNode.insertAfter(p1);
            codeNode.select();
          }
        },
      },
      {
        id: 'code-bash',
        label: 'Code Block (Bash / Shell)',
        description: 'Terminal and bash commands',
        keywords: 'code bash sh shell terminal zsh',
        icon: <span className="font-mono text-xs text-slate-300 font-bold">$_</span>,
        action: () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const codeNode = $createCodeNode();
            codeNode.setLanguage('bash');
            $setBlocksType(selection, () => codeNode);
            const p1 = $createParagraphNode();
            codeNode.insertAfter(p1);
            codeNode.select();
          }
        },
      },
      {
        id: 'code-sql',
        label: 'Code Block (SQL)',
        description: 'SQL database queries',
        keywords: 'code sql select query table db',
        icon: <span className="font-mono text-xs text-indigo-400 font-bold">SQL</span>,
        action: () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const codeNode = $createCodeNode();
            codeNode.setLanguage('sql');
            $setBlocksType(selection, () => codeNode);
            const p1 = $createParagraphNode();
            codeNode.insertAfter(p1);
            codeNode.select();
          }
        },
      },
      {
        id: 'math',
        label: 'KaTeX Math Formula (Inline)',
        description: 'Inline LaTeX mathematical notation',
        keywords: 'math katex latex formula equation inline algebra',
        icon: <Calculator size={15} />,
        action: () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertNodes([$createMathNode('E = mc^2', false)]);
          }
        },
      },
      {
        id: 'math-block',
        label: 'KaTeX Math Block (Display)',
        description: 'Centered display-mode LaTeX formula',
        keywords: 'math katex latex formula equation block display integral',
        icon: <Sigma size={15} />,
        action: () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertNodes([$createMathNode('\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}', true)]);
          }
        },
      },
      {
        id: 'bullet',
        label: 'Bullet List',
        description: 'Standard bulleted list',
        keywords: 'bullet unordered list ul item',
        icon: <List size={15} />,
        action: (ed) => ed.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
      },
      {
        id: 'numbered',
        label: 'Numbered List',
        description: 'Ordered numbering list',
        keywords: 'numbered ordered list ol sequence',
        icon: <ListOrdered size={15} />,
        action: (ed) => ed.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
      },
      {
        id: 'quote',
        label: 'Quote',
        description: 'Capture a citation or callout',
        keywords: 'quote blockquote citation',
        icon: <Quote size={15} />,
        action: () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createQuoteNode());
          }
        },
      },
      {
        id: 'divider',
        label: 'Divider',
        description: 'Visual horizontal line',
        keywords: 'divider hr line separator',
        icon: <span className="font-mono text-xs">---</span>,
        action: () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertText('\n---\n');
          }
        },
      },
    ],
    [defaultCodeLanguage]
  );

  const filtered = commandItems.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.keywords.includes(q)
    );
  });

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) && selection.isCollapsed()) {
          const anchor = selection.anchor;
          const node = anchor.getNode();
          const parent = node.getParent();

          // Slash commands should not fire inside code blocks.
          if ($isCodeNode(parent) || $isCodeNode(node)) {
            setIsOpen(false);
            return;
          }

          const textContent = node.getTextContent();
          const offset = anchor.offset;
          const lastSlash = textContent.lastIndexOf('/', offset);
          if (lastSlash !== -1) {
            const query = textContent.slice(lastSlash + 1, offset);
            if (!query.includes(' ') && !query.includes('\n')) {
              setSearch(query);
              setSelectedIndex(0);
              setIsOpen(true);
              const domSelection = window.getSelection();
              if (domSelection && domSelection.rangeCount > 0) {
                const rect = domSelection.getRangeAt(0).getBoundingClientRect();
                const menuWidth = 264;
                const menuHeight = 320;
                setCoords({
                  top: Math.min(rect.bottom + 6, window.innerHeight - menuHeight - 8),
                  left: Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8)),
                });
              }
              return;
            }
          }
        }
        setIsOpen(false);
      });
    });
  }, [editor]);

  const executeItem = (item: CommandItem) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchor = selection.anchor;
        const node = anchor.getNode();
        if ($isTextNode(node)) {
          const text = node.getTextContent();
          const lastSlash = text.lastIndexOf('/', anchor.offset);
          if (lastSlash !== -1) {
            node.spliceText(lastSlash, anchor.offset - lastSlash, '', true);
          }
        }
      }
      item.action(editor);
    });
    setIsOpen(false);
    setSearch('');
    setSelectedIndex(0);
    editor.focus();
  };

  useEffect(() => {
    if (!isOpen) return;
    return editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      (e) => {
        e?.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
        return true;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [isOpen, filtered.length, editor]);

  useEffect(() => {
    if (!isOpen) return;
    return editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      (e) => {
        e?.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
        return true;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [isOpen, filtered.length, editor]);

  useEffect(() => {
    if (!isOpen) return;
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (e) => {
        if (filtered[selectedIndex]) {
          e?.preventDefault();
          executeItem(filtered[selectedIndex]);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedIndex, filtered, editor]);

  useEffect(() => {
    if (!isOpen) return;
    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        setIsOpen(false);
        return true;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [isOpen, editor]);

  if (!isOpen || filtered.length === 0) return null;

  return (
    <div
      style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
      className="fixed z-50 w-64 overflow-hidden rounded-xl border border-slate-700/80 bg-[#070b14] p-1.5 shadow-2xl shadow-indigo-950/60 backdrop-blur-xl"
    >
      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {search ? `Results for “${search}”` : 'Commands'}
      </div>
      <div className="max-h-60 space-y-0.5 overflow-y-auto">
        {filtered.map((item, idx) => (
          <div
            key={item.id}
            onMouseDown={(e) => {
              e.preventDefault();
              executeItem(item);
            }}
            onMouseEnter={() => setSelectedIndex(idx)}
            className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition ${
              selectedIndex === idx
                ? 'border border-indigo-500/30 bg-indigo-600/25 text-indigo-200'
                : 'text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-slate-300">
              {item.icon}
            </span>
            <div>
              <p className="font-semibold leading-tight">{item.label}</p>
              <p className="text-[10px] leading-tight text-slate-500">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
