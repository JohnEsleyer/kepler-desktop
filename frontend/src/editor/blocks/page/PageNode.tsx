import React from 'react';
import {
  DecoratorNode,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import { FileText } from 'lucide-react';

export type SerializedPageNode = Spread<
  {
    subpageId: string;
    title: string;
  },
  SerializedLexicalNode
>;

const InlinePageReference: React.FC<{
  subpageId: string;
  title: string;
}> = ({ subpageId, title }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent('kepler:open-subpage', { detail: { subpageId, title } })
    );
  };

  return (
    <span
      contentEditable={false}
      onClick={handleClick}
      className="group mx-1 inline-flex cursor-pointer select-none items-baseline gap-1 rounded-md px-1 py-0.5 font-medium text-indigo-400 decoration-indigo-400/50 decoration-1 underline-offset-4 transition hover:text-indigo-300 hover:decoration-indigo-300 hover:underline"
      title={`Open page: ${title || 'Untitled Page'}`}
    >
      <FileText
        size={13}
        className="inline-block self-center text-indigo-400 transition-colors group-hover:text-indigo-300"
      />
      <span className="underline decoration-indigo-400/60 decoration-1 underline-offset-4 group-hover:decoration-indigo-300">
        {title || 'Untitled Page'}
      </span>
    </span>
  );
};

export class PageNode extends DecoratorNode<React.ReactElement> {
  __subpageId: string;
  __title: string;

  static getType(): string {
    return 'kepler-page';
  }

  static clone(node: PageNode): PageNode {
    return new PageNode(node.__subpageId, node.__title, node.__key);
  }

  constructor(subpageId: string, title = 'Untitled Page', key?: NodeKey) {
    super(key);
    this.__subpageId = subpageId;
    this.__title = title;
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'kepler-inline-page-wrapper inline-block align-baseline';
    span.setAttribute('contenteditable', 'false');
    return span;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): boolean {
    return true;
  }

  getSubpageId(): string {
    return this.__subpageId;
  }

  getTitle(): string {
    return this.__title;
  }

  setTitle(title: string): void {
    const writable = this.getWritable();
    writable.__title = title;
  }

  exportJSON(): SerializedPageNode {
    return {
      type: 'kepler-page',
      version: 1,
      subpageId: this.__subpageId,
      title: this.__title,
    };
  }

  static importJSON(serialized: SerializedPageNode): PageNode {
    return $createPageNode(serialized.subpageId, serialized.title);
  }

  decorate(): React.ReactElement {
    return <InlinePageReference subpageId={this.__subpageId} title={this.__title} />;
  }
}

export function $createPageNode(subpageId: string, title = 'Untitled Page'): PageNode {
  return new PageNode(subpageId, title);
}

export function $isPageNode(node: LexicalNode | null | undefined): node is PageNode {
  return node instanceof PageNode;
}
