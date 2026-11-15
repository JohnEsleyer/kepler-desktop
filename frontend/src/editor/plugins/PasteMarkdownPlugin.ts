import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  PASTE_COMMAND,
  COMMAND_PRIORITY_HIGH,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
} from 'lexical';
import { $convertFromMarkdownString } from '@lexical/markdown';
import { extractMarkdownTable, $createTableFromRows } from './TableTransformer';

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

        const tableData = extractMarkdownTable(text);
        if (tableData) {
          event.preventDefault();
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const tableNode = $createTableFromRows(tableData.headerCells, tableData.dataRows);
              selection.insertNodes([tableNode, $createParagraphNode()]);
            }
          });
          return true;
        }

        const hasMarkdownIndicators =
          /^#+\s/m.test(text) ||
          /^```/m.test(text) ||
          /^\s*[-*+]\s/m.test(text) ||
          /^\s*\d+\.\s/m.test(text) ||
          /^\s*>\s/m.test(text) ||
          /\$\$[\s\S]+?\$\$/.test(text) ||
          /\$[^$\n]+\$/.test(text);

        if (hasMarkdownIndicators) {
          event.preventDefault();
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const tempContainer = $createParagraphNode();
              $convertFromMarkdownString(text, transformers, tempContainer);
              const nodesToInsert = tempContainer.getChildren();
              if (nodesToInsert.length > 0) {
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
