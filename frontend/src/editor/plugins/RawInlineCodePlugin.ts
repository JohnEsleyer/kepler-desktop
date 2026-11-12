import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { TextNode, $createTextNode } from 'lexical';
import { $isCodeNode } from '@lexical/code';

/**
 * Handles raw inline code enclosed in `` ... `` or ` ... `
 * Ensures that Markdown symbols inside are left untouched literally.
 */
export function RawInlineCodePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerNodeTransform(TextNode, (node) => {
      const parent = node.getParent();
      if ($isCodeNode(parent)) return;

      const text = node.getTextContent();
      // Match double backtick raw blocks ``...``
      const matchDouble = /``([^`]+)``/.exec(text);
      if (matchDouble && matchDouble.index !== undefined) {
        const full = matchDouble[0];
        const inner = matchDouble[1];
        const before = text.slice(0, matchDouble.index);
        const after = text.slice(matchDouble.index + full.length);

        const codeNode = $createTextNode(inner);
        codeNode.setFormat('code');

        if (before) node.insertBefore($createTextNode(before));
        node.insertBefore(codeNode);
        if (after) node.insertBefore($createTextNode(after));
        node.remove();
      }
    });
  }, [editor]);

  return null;
}
