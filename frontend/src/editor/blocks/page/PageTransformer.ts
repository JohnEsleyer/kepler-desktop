import { TextMatchTransformer } from '@lexical/markdown';
import { LexicalNode, TextNode, $createTextNode } from 'lexical';
import { PageNode, $createPageNode, $isPageNode } from './PageNode';

export const PAGE_RE = /\[([^\]]+)\]\(kepler-page:\/\/([a-zA-Z0-9_\-]+)\)/;

export const PAGE_TRANSFORMER: TextMatchTransformer = {
  dependencies: [PageNode],
  export: (node: LexicalNode) => {
    if (!$isPageNode(node)) return null;
    return `[${node.getTitle()}](kepler-page://${node.getSubpageId()})`;
  },
  importRegExp: PAGE_RE,
  regExp: PAGE_RE,
  replace: (textNode: TextNode, match: RegExpMatchArray) => {
    const full = match[0];
    const title = match[1];
    const subpageId = match[2];

    const text = textNode.getTextContent();
    const index = text.indexOf(full);
    if (index === -1) return;

    const before = text.slice(0, index);
    const after = text.slice(index + full.length);

    const replacement: LexicalNode[] = [];
    if (before) replacement.push($createTextNode(before));
    replacement.push($createPageNode(subpageId, title));
    if (after) {
      replacement.push($createTextNode(after));
    } else {
      replacement.push($createTextNode(' '));
    }

    for (const rep of replacement) {
      textNode.insertBefore(rep);
    }
    textNode.remove();
  },
  trigger: ')',
  type: 'text-match',
};
