import React from 'react';
import { Chapter } from '../types/vault';
import { FileText, Trash2 } from 'lucide-react';

interface ChapterListProps {
  chapters: Chapter[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onDelete: (fileName: string) => void;
}

export const ChapterList: React.FC<ChapterListProps> = ({
  chapters,
  activeIndex,
  onSelect,
  onDelete,
}) => {
  if (chapters.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-slate-500">
        No chapters yet. Click + above to add one.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
      {chapters.map((ch, idx) => (
        <div
          key={ch.id}
          onClick={() => onSelect(idx)}
          className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition ${
            activeIndex === idx
              ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/20'
              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <FileText size={14} className={activeIndex === idx ? 'text-indigo-400' : 'text-slate-500'} />
            <span className="truncate">{ch.title}</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(ch.fileName);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  );
};