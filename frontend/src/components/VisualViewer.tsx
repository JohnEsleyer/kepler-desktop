import React from 'react';
import { Visual } from '../types/vault';

export const VisualViewer: React.FC<{ visual?: Visual }> = ({ visual }) => {
  if (!visual) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-slate-500">
        No visual or simulation attached for this chapter. Place an .html or .json in the book's visuals/ directory.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800 px-3 py-2 text-xs font-semibold text-slate-300">
        Visual: {visual.title}
      </div>
      <div className="flex-1 bg-black">
        <iframe
          title={visual.title}
          srcDoc={visual.content}
          sandbox="allow-scripts"
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
};