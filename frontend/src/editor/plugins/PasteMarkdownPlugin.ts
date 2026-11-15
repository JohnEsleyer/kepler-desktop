import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  PASTE_COMMAND,
  COMMAND_PRIORITY_HIGH,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
} from 'lexical';
import { $isTableNode } from '@lexical/table';
import { parseMarkdownToLexicalNodes } from './TableTransformer';

export function PasteMarkdownPlugin({ transformers }: { transformers: any[] }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        const text = clipboardData.getData('text/plain');
        if (!text) return false;

        const hasMarkdownIndicators =
          /^#+\s/m.test(text) ||
          /^```/m.test(text) ||
          /^\s*[-*+]\s/m.test(text) ||
          /^\s*\d+\.\s/m.test(text) ||
          /^\s*>\s/m.test(text) ||
          /^(?:---|\*\*\*|___)\s*$/m.test(text) ||
          /\|.+\|.+\|/m.test(text) ||
          /\$\$[\s\S]+?\$\$/.test(text) ||
          /\$[^$\n]+\$/.test(text) ||
          /\[([^\]]+)\]\(kepler-page:\/\/([a-zA-Z0-9_\-]+)\)/.test(text) ||
          /(\*\*|__)(.*?)\1/.test(text) ||
          /`[^`\n]+`/.test(text);

        if (hasMarkdownIndicators) {
          event.preventDefault();
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const nodesToInsert = parseMarkdownToLexicalNodes(text, transformers);
              if (nodesToInsert.length > 0) {
                const lastNode = nodesToInsert[nodesToInsert.length - 1];
                if ($isTableNode(lastNode)) {
                  nodesToInsert.push($createParagraphNode());
                }
                selection.insertNodes(nodesToInsert);
              }
            }
          });
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_HIGH
    );
  }, [editor, transformers]);

  return null;
}
  