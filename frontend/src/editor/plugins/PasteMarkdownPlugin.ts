import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { PASTE_COMMAND, COMMAND_PRIORITY_HIGH, $getSelection, $isRangeSelection } from 'lexical';
import { $convertFromMarkdownString } from '@lexical/markdown';

/**
 * Automatically converts pasted Markdown from clipboard into rich Lexical blocks
 * instantly without requiring navigation between chapters.
 */
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

        // If clipboard contains markdown syntax indicators (headers, lists, code fences, blockquotes, math)
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
              // Convert and replace selection with parsed elements
              $convertFromMarkdownString(text, transformers);
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
