import { ElementTransformer } from '@lexical/markdown';
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

  const tokens = trimmed.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
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
      for (const textNode of child.getChildren()) {
        if ($isTextNode(textNode)) {
          let text = textNode.getTextContent();
          if (textNode.hasFormat('bold')) text = `**${text}**`;
          if (textNode.hasFormat('italic')) text = `*${text}*`;
          if (textNode.hasFormat('code')) text = `\`${text}\``;
          parts.push(text);
        } else {
          parts.push(child.getTextContent());
        }
      }
    } else {
      parts.push(child.getTextContent());
    }
  }
  return parts.join('').trim().replace(/\|/g, '\\|');
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

export function extractMarkdownTable(text: string): {
  headerCells: string[];
  dataRows: string[][];
  rawTableText: string;
} | null {
  const lines = text
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let headerIndex = -1;
  for (let i = 0; i < lines.length - 1; i++) {
    if (isTableRow(lines[i]) && isTableDelimiterRow(lines[i + 1])) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) return null;

  const headerCells = splitTableRow(lines[headerIndex]);
  const dataRows: string[][] = [];
  const tableLines: string[] = [lines[headerIndex], lines[headerIndex + 1]];

  for (let i = headerIndex + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!isTableRow(line) || isTableDelimiterRow(line)) break;
    dataRows.push(splitTableRow(line));
    tableLines.push(line);
  }

  return {
    headerCells,
    dataRows,
    rawTableText: tableLines.join('\n'),
  };
}

export const TABLE_TRANSFORMER: ElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node) => {
    if (!$isTableNode(node)) return null;
    return exportTableToMarkdown(node);
  },
  regExp: /^\|?.+\|.+\|?$/,
  replace: (parentNode, _children, _match, _isImport) => {
    const headerRowText = parentNode.getTextContent().trim();
    if (!isTableRow(headerRowText) || isTableDelimiterRow(headerRowText)) {
      return;
    }

    const nextNode = parentNode.getNextSibling();
    if (!nextNode || !$isParagraphNode(nextNode)) {
      return;
    }

    const nextText = nextNode.getTextContent().trim();
    if (!isTableDelimiterRow(nextText)) {
      return;
    }

    const headerCells = splitTableRow(headerRowText);
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
    parentNode.replace(tableNode);
    for (const n of nodesToRemove) {
      n.remove();
    }
  },
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

      const headerText = pNode.getTextContent().trim();
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
