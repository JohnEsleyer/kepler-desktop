import { ElementTransformer, $convertFromMarkdownString } from '@lexical/markdown';
import {
  $createParagraphNode,
  $createTextNode,
  $isParagraphNode,
  $isRootNode,
  $isTextNode,
  LexicalNode,
  ParagraphNode,
} from 'lexical';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isCodeNode } from '@lexical/code';
import { normalizeMarkdownMath, $createMathNode, $isMathNode } from './MathPlugin';

export function splitTableRow(rowText: string): string[] {
  let trimmed = rowText.trim();
  if (trimmed.startsWith('|')) {
    trimmed = trimmed.substring(1);
  }
  if (trimmed.endsWith('|')) {
    trimmed = trimmed.substring(0, trimmed.length - 1);
  }

  const cells: string[] = [];
  let current = '';
  let escaped = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === '\\' && !escaped) {
      escaped = true;
      current += char;
    } else if (char === '|' && !escaped) {
      cells.push(current.trim());
      current = '';
    } else {
      escaped = false;
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

export function isTableDelimiterRow(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.includes('-')) return false;
  const cells = splitTableRow(trimmed);
  if (cells.length < 2) return false;
  return cells.every((cell) => /^:?-+:?$/.test(cell.trim()));
}

export function isTableRow(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.includes('|')) return false;
  const cells = splitTableRow(trimmed);
  return cells.length >= 2;
}

export function createCellParagraph(cellText: string): ParagraphNode {
  const p = $createParagraphNode();
  const trimmed = cellText.trim();
  if (!trimmed) {
    p.append($createTextNode(''));
    return p;
  }

  const tokens = trimmed.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\$[^\$\n]+\$)/g);
  for (const token of tokens) {
    if (!token) continue;
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      const node = $createTextNode(token.slice(2, -2));
      node.setFormat('bold');
      p.append(node);
    } else if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      const node = $createTextNode(token.slice(1, -1));
      node.setFormat('code');
      p.append(node);
    } else if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      const node = $createTextNode(token.slice(1, -1));
      node.setFormat('italic');
      p.append(node);
    } else if (token.startsWith('$') && token.endsWith('$') && token.length >= 2) {
      p.append($createMathNode(token.slice(1, -1), false));
    } else {
      p.append($createTextNode(token));
    }
  }
  return p;
}

export function getCellMarkdown(cellNode: TableCellNode): string {
  const parts: string[] = [];
  for (const child of cellNode.getChildren()) {
    if ($isParagraphNode(child)) {
      for (const inner of child.getChildren()) {
        if ($isTextNode(inner)) {
          let text = inner.getTextContent();
          if (inner.hasFormat('bold')) text = `**${text}**`;
          if (inner.hasFormat('italic')) text = `*${text}*`;
          if (inner.hasFormat('code')) text = `\`${text}\``;
          parts.push(text);
        } else if ($isMathNode(inner)) {
          parts.push(`$${inner.getEquation()}$`);
        } else {
          parts.push(inner.getTextContent());
        }
      }
    } else if ($isMathNode(child)) {
      parts.push(`$${child.getEquation()}$`);
    } else {
      parts.push(child.getTextContent());
    }
  }
  return parts.join('').trim().replace(/\\\|/g, '|').replace(/\|/g, '\\|');
}

export function exportTableToMarkdown(tableNode: TableNode): string {
  const rows = tableNode.getChildren();
  const tableData: string[][] = [];

  for (const rowNode of rows) {
    if (!$isTableRowNode(rowNode)) continue;
    const rowCells: string[] = [];
    for (const cellNode of rowNode.getChildren()) {
      if (!$isTableCellNode(cellNode)) continue;
      rowCells.push(getCellMarkdown(cellNode));
    }
    tableData.push(rowCells);
  }

  if (tableData.length === 0) return '';

  const maxCols = Math.max(...tableData.map((r) => r.length));
  if (maxCols === 0) return '';

  for (const r of tableData) {
    while (r.length < maxCols) r.push('');
  }

  const lines: string[] = [];
  lines.push(`| ${tableData[0].join(' | ')} |`);
  lines.push(`| ${new Array(maxCols).fill('---').join(' | ')} |`);
  for (let i = 1; i < tableData.length; i++) {
    lines.push(`| ${tableData[i].join(' | ')} |`);
  }

  return lines.join('\n');
}

export function $createTableFromRows(headerCells: string[], dataRows: string[][]): TableNode {
  const tableNode = $createTableNode();

  const headerRowNode = $createTableRowNode();
  for (const h of headerCells) {
    const cell = $createTableCellNode(TableCellHeaderStates.ROW);
    cell.append(createCellParagraph(h));
    headerRowNode.append(cell);
  }
  tableNode.append(headerRowNode);

  for (const rowData of dataRows) {
    const rowNode = $createTableRowNode();
    for (let i = 0; i < headerCells.length; i++) {
      const cellText = rowData[i] !== undefined ? rowData[i] : '';
      const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
      cell.append(createCellParagraph(cellText));
      rowNode.append(cell);
    }
    tableNode.append(rowNode);
  }

  return tableNode;
}

export function parseMarkdownToLexicalNodes(
  text: string,
  transformers: any[]
): LexicalNode[] {
  if (!text || !text.trim()) {
    return [];
  }
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
      i += 2;

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

export const TABLE_TRANSFORMER: ElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node) => {
    if (!$isTableNode(node)) return null;
    return exportTableToMarkdown(node);
  },
  // Regex configured to avoid intercepting and swallowing markdown lines during $convertFromMarkdownString
  regExp: /^a{1000}$/,
  replace: () => {},
  type: 'element',
};

export function TableMarkdownPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerNodeTransform(ParagraphNode, (pNode) => {
      const parent = pNode.getParent();
      if (!$isRootNode(parent) || $isTableCellNode(parent) || $isCodeNode(parent)) {
        return;
      }

      const text = pNode.getTextContent();
      if (text.includes('\n')) {
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length >= 2 && isTableRow(lines[0]) && isTableDelimiterRow(lines[1])) {
          const headerCells = splitTableRow(lines[0]);
          const dataRows = lines.slice(2).filter(isTableRow).map(splitTableRow);
          const tableNode = $createTableFromRows(headerCells, dataRows);
          pNode.replace(tableNode);
          return;
        }
      }

      const headerText = text.trim();
      if (!isTableRow(headerText) || isTableDelimiterRow(headerText)) {
        return;
      }

      const nextNode = pNode.getNextSibling();
      if (!nextNode || !$isParagraphNode(nextNode)) {
        return;
      }

      const nextText = nextNode.getTextContent().trim();
      if (!isTableDelimiterRow(nextText)) {
        return;
      }

      const headerCells = splitTableRow(headerText);
      const dataRows: string[][] = [];
      const nodesToRemove: LexicalNode[] = [nextNode];

      let sibling: LexicalNode | null = nextNode.getNextSibling();
      while (sibling && $isParagraphNode(sibling)) {
        const lineText = sibling.getTextContent().trim();
        if (!lineText || !isTableRow(lineText) || isTableDelimiterRow(lineText)) {
          break;
        }
        dataRows.push(splitTableRow(lineText));
        nodesToRemove.push(sibling);
        sibling = sibling.getNextSibling();
      }

      const tableNode = $createTableFromRows(headerCells, dataRows);
      pNode.replace(tableNode);
      for (const n of nodesToRemove) {
        n.remove();
      }
    });
  }, [editor]);

  return null;
}
  