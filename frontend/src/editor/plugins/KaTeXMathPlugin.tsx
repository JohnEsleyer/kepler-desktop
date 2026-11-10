import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Renders a LaTeX expression with KaTeX. Used by the Lexical math decorator
 * node and anywhere else a formula needs to be displayed.
 */
export const KaTeXMathViewer: React.FC<{ math: string; block?: boolean }> = ({ math, block }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    try {
      katex.render(math, containerRef.current, {
        displayMode: !!block,
        throwOnError: false,
        strict: false,
        trust: false,
      });
    } catch {
      containerRef.current.textContent = math;
    }
  }, [math, block]);

  return (
    <span
      ref={containerRef}
      contentEditable={false}
      className={
        block
          ? 'my-2 block w-full overflow-x-auto overflow-y-hidden text-center scrollbar-none'
          : 'mx-1 inline-block align-middle'
      }
    />
  );
};
