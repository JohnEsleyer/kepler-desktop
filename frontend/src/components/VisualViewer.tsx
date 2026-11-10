import React from 'react';
import { Visual } from '../types/vault';
import { CustomWebview } from './ui/CustomWebview';
import { Sparkles, Plus } from 'lucide-react';

interface VisualViewerProps {
  chapterNumber: number;
  chapterTitle: string;
  visual?: Visual;
  onSaveVisual?: (fileName: string, content: string) => Promise<void>;
  onCreateVisual?: () => void;
  onDeleteVisual?: (fileName: string) => void;
}

export const VisualViewer: React.FC<VisualViewerProps> = ({
  chapterNumber,
  chapterTitle,
  visual,
  onSaveVisual,
  onCreateVisual,
  onDeleteVisual,
}) => {
  if (!visual) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 text-slate-500 shadow-inner">
          <Sparkles size={22} className="text-indigo-400" />
        </div>
        <h3 className="mt-3 text-xs font-bold text-slate-200">
          No Companion Visual for Chapter {chapterNumber}
        </h3>
        <p className="mt-1 max-w-[240px] text-[11px] leading-relaxed text-slate-500">
          Visual companions are interactive HTML/JS canvases or simulations attached specifically to this chapter.
        </p>
        {onCreateVisual && (
          <button
            onClick={onCreateVisual}
            className="mt-4 flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-500"
          >
            <Plus size={14} /> Add Companion for Ch {chapterNumber}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col p-2">
      <CustomWebview
        title={`Ch ${chapterNumber}: ${visual.title}`}
        fileName={visual.fileName}
        content={visual.content}
        kind={visual.kind as 'html' | 'json'}
        onSave={onSaveVisual}
        onDelete={onDeleteVisual ? () => onDeleteVisual(visual.fileName) : undefined}
      />
    </div>
  );
};
