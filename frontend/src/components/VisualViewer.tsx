import React from 'react';
import { Visual } from '../types/vault';
import { CustomWebview } from './ui/CustomWebview';

export const VisualViewer: React.FC<{
  visual?: Visual;
  onSaveVisual?: (fileName: string, content: string) => Promise<void>;
}> = ({ visual, onSaveVisual }) => {
  if (!visual) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-xs leading-relaxed text-slate-500">
        No visual or simulation attached for this chapter. Place an .html or .json file in the book's
        visuals/ directory.
      </div>
    );
  }

  return (
    <div className="h-full w-full p-2">
      <CustomWebview
        title={visual.title}
        fileName={visual.fileName}
        content={visual.content}
        kind={visual.kind as 'html' | 'json'}
        onSave={onSaveVisual}
      />
    </div>
  );
};
