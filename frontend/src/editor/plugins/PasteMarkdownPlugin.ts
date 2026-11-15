import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  PASTE_COMMAND,
  COMMAND_PRIORITY_HIGH,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  LexicalNode,
} from 'lexical';
import { $convertFromMarkdownString } from '@lexical/markdown';
import { $isTableNode } from '@lexical/table';
import {
  isTableRow,
  isTableDelimiterRow,
  splitTableRow,
  $createTableFromRows,
} from './TableTransformer';
import { normalizeMarkdownMath } from './MathPlugin';

function parseMarkdownContentToNodes(
  text: string,
  transformers: any[]
): LexicalNode[] {
  const lines = text.split('\n');
  const chunks: Array<
    | { type: 'markdown'; lines: string[] }
    | { type: 'table'; header: string; rows: string[] }
  > = [];

  let currentMarkdown: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : null;

    if (
      isTableRow(line) &&
      !isTableDelimiterRow(line) &&
      nextLine !== null &&
      isTableDelimiterRow(nextLine)
    ) {
      if (currentMarkdown.length > 0) {
        chunks.push({ type: 'markdown', lines: currentMarkdown });
        currentMarkdown = [];
      }

      const header = line;
      const rows: string[] = [];
      i += 2; // skip header and delimiter lines

      while (
        i < lines.length &&
        isTableRow(lines[i]) &&
        !isTableDelimiterRow(lines[i])
      ) {
        rows.push(lines[i]);
        i++;
      }

      chunks.push({ type: 'table', header, rows });
    } else {
      currentMarkdown.push(line);
      i++;
    }
  }

  if (currentMarkdown.length > 0) {
    chunks.push({ type: 'markdown', lines: currentMarkdown });
  }

  const resultNodes: LexicalNode[] = [];

  for (const chunk of chunks) {
    if (chunk.type === 'table') {
      const headerCells = splitTableRow(chunk.header);
      const dataRows = chunk.rows.map((r) => splitTableRow(r));
      const tableNode = $createTableFromRows(headerCells, dataRows);
      resultNodes.push(tableNode);
    } else {
      const mdText = chunk.lines.join('\n');
      if (!mdText.trim()) continue;
      const tempContainer = $createParagraphNode();
      const normalized = normalizeMarkdownMath(mdText);
      $convertFromMarkdownString(normalized, transformers, tempContainer);
      const children = tempContainer.getChildren();
      resultNodes.push(...children);
    }
  }

  return resultNodes;
}

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
              const nodesToInsert = parseMarkdownContentToNodes(text, transformers);
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
