import React, { useEffect, useState } from 'react';
import {
  $createTextNode,
  $getNodeByKey,
  DecoratorNode,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
  TextNode,
} from 'lexical';
import { $isCodeNode } from '@lexical/code';
import { TextMatchTransformer } from '@lexical/markdown';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { KaTeXMathViewer } from './KaTeXMathPlugin';

export type SerializedMathNode = Spread<
  {
    equation: string;
    display: boolean;
  },
  SerializedLexicalNode
>;

/**
 * Interactive KaTeX math renderer allowing double-click equation editing.
 */
const InteractiveMathViewer: React.FC<{
  nodeKey: NodeKey;
  math: string;
  block: boolean;
  editor: any;
}> = ({ nodeKey, math, block, editor }) => {
  const [editing, setEditing] = useState(false);
  const [tempMath, setTempMath] = useState(math);

  const save = () => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isMathNode(node)) {
        node.setEquation(tempMath.trim());
      }
    });
    setEditing(false);
  };

  return (
    <span
      className="group relative inline-block cursor-pointer select-none"
      onDoubleClick={() => {
        setTempMath(math);
        setEditing(true);
      }}
      title="Double-click to edit LaTeX formula"
    >
      <KaTeXMathViewer math={math} block={block} />
      {editing && (
        <span
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditing(false);
          }}
        >
          <span className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#070b14] p-4 shadow-2xl">
            <span className="mb-2 block text-xs font-bold text-white">Edit LaTeX Equation</span>
            <textarea
              rows={3}
              value={tempMath}
              onChange={(e) => setTempMath(e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 p-2.5 font-mono text-xs text-indigo-200 outline-none focus:border-indigo-500"
            />
            <span className="my-2 block rounded-lg bg-black/50 p-2 text-center">
              <KaTeXMathViewer math={tempMath || '...'} block={block} />
            </span>
            <span className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Apply Formula
              </button>
            </span>
          </span>
        </span>
      )}
    </span>
  );
};

/**
 * A Lexical decorator node that renders a KaTeX expression.
 */
export class MathNode extends DecoratorNode<React.ReactElement> {
  __equation: string;
  __display: boolean;

  static getType(): string {
    return 'math';
  }

  static clone(node: MathNode): MathNode {
    return new MathNode(node.__equation, node.__display, node.__key);
  }

  constructor(equation: string, display = false, key?: NodeKey) {
    super(key);
    this.__equation = equation;
    this.__display = display;
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = this.__display ? 'math-node math-node-block' : 'math-node';
    return span;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): boolean {
    return true;
  }

  getEquation(): string {
    return this.__equation;
  }

  getDisplay(): boolean {
    return this.__display;
  }

  setEquation(equation: string): void {
    const writable = this.getWritable();
    writable.__equation = equation;
  }

  exportJSON(): SerializedMathNode {
    return {
      type: 'math',
      version: 1,
      equation: this.__equation,
      display: this.__display,
    };
  }

  static importJSON(serialized: SerializedMathNode): MathNode {
    return $createMathNode(serialized.equation, serialized.display);
  }

  decorate(editor: any): React.ReactElement {
    return (
      <InteractiveMathViewer
        nodeKey={this.__key}
        math={this.__equation}
        block={this.__display}
        editor={editor}
      />
    );
  }
}

export function $createMathNode(equation: string, display = false): MathNode {
  return new MathNode(equation, display);
}

export function $isMathNode(node: LexicalNode | null | undefined): node is MathNode {
  return node instanceof MathNode;
}

const MATH_RE = /\$\$([^$]+?)\$\$|\$([^$\n]+?)\$/;

/**
 * Markdown transformer so `$inline$` and `$$display$$` survive
 * `$convertToMarkdownString` / `$convertFromMarkdownString`.
 */
export const MATH_TRANSFORMER: TextMatchTransformer = {
  dependencies: [MathNode],
  export: (node) => {
    if (!$isMathNode(node)) return null;
    const equation = node.getEquation();
    return node.getDisplay() ? `\n$$\n${equation}\n$$\n` : `$${equation}$`;
  },
  importRegExp: MATH_RE,
  regExp: MATH_RE,
  replace: (textNode: TextNode, match: RegExpMatchArray) => {
    const full = match[0];
    const equation = (match[1] ?? match[2] ?? '').trim();
    if (!equation) return;

    const text = textNode.getTextContent();
    const index = text.indexOf(full);
    if (index === -1) return;

    const before = text.slice(0, index);
    const after = text.slice(index + full.length);
    const replacement: LexicalNode[] = [];
    if (before) replacement.push($createTextNode(before));
    replacement.push($createMathNode(equation, match[1] !== undefined));
    if (after) replacement.push($createTextNode(after));

    for (const rep of replacement) {
      textNode.insertBefore(rep);
    }
    textNode.remove();
  },
  type: 'text-match',
};

/**
 * Converts freshly typed `$...$` / `$$...$$` text into math nodes live.
 */
export function MathPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerNodeTransform(TextNode, (node) => {
      const parent = node.getParent();
      if ($isCodeNode(parent)) return;
      if (node.getMode() === 'token') return;

      const text = node.getTextContent();
      const match = MATH_RE.exec(text);
      if (!match || match.index === undefined) return;

      // Respect escaped dollars: \$5 stays literal text.
      if (match.index > 0 && text[match.index - 1] === '\\') return;

      const equation = (match[1] ?? match[2] ?? '').trim();
      if (!equation) return;

      const before = text.slice(0, match.index).replace(/\\\$/, '$');
      const after = text.slice(match.index + match[0].length);
      const replacement: LexicalNode[] = [];
      if (before) replacement.push($createTextNode(before));
      replacement.push($createMathNode(equation, match[1] !== undefined));
      if (after) replacement.push($createTextNode(after));

      for (const rep of replacement) {
        node.insertBefore(rep);
      }
      node.remove();
    });
  }, [editor]);

  return null;
}
