import React, { useState } from 'react';
import { Chapter } from '../types/vault';
import { FileText, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

interface ChapterListProps {
  chapters: Chapter[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onDelete: (fileName: string) => void;
  onReorder: (newChapters: Chapter[]) => void;
}

export const ChapterList: React.FC<ChapterListProps> = ({
  chapters,
  activeIndex,
  onSelect,
  onDelete,
  onReorder,
}) => {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [targetIdx, setTargetIdx] = useState<number | null>(null);

  if (chapters.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-slate-500">
        No chapters yet. Click + above to add one.
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIdx === null || draggedIdx === index) return;
    setTargetIdx(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === dropIndex) {
      setDraggedIdx(null);
      setTargetIdx(null);
      return;
    }

    const reordered = [...chapters];
    const [moved] = reordered.splice(draggedIdx, 1);
    reordered.splice(dropIndex, 0, moved);

    setDraggedIdx(null);
    setTargetIdx(null);
    onReorder(reordered);
  };

  const moveChapter = (e: React.MouseEvent, fromIdx: number, toIdx: number) => {
    e.stopPropagation();
    if (toIdx < 0 || toIdx >= chapters.length || fromIdx === toIdx) return;
    const reordered = [...chapters];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    onReorder(reordered);
  };

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {chapters.map((ch, idx) => {
        const isDragging = draggedIdx === idx;
        const isTarget = targetIdx === idx;
        const isActive = activeIndex === idx;

        return (
          <div
            key={ch.id}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onClick={() => onSelect(idx)}
            className={`group relative flex items-center justify-between rounded-xl px-2 py-2 text-xs font-medium cursor-pointer transition select-none ${
              isActive
                ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            } ${isDragging ? 'opacity-30 border-dashed border-indigo-500' : ''} ${
              isTarget ? 'border-t-2 border-t-indigo-400 bg-indigo-950/40' : ''
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  handleDragStart(e, idx);
                }}
                onDragEnd={() => {
                  setDraggedIdx(null);
                  setTargetIdx(null);
                }}
                className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-indigo-300 p-0.5 transition"
                title="Drag up or down to reorder"
              >
                <GripVertical size={14} />
              </span>
              <span
                className={`shrink-0 font-mono text-[10px] w-4 text-right font-semibold ${
                  isActive ? 'text-indigo-400' : 'text-slate-500'
                }`}
              >
                {String(idx + 1).padStart(2, '0')}
              </span>
              <FileText size={14} className={isActive ? 'text-indigo-400 shrink-0' : 'text-slate-500 shrink-0'} />
              <span className="truncate">{ch.title}</span>
            </div>

            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
              <button
                disabled={idx === 0}
                onClick={(e) => moveChapter(e, idx, idx - 1)}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 transition"
                title="Move Up"
              >
                <ChevronUp size={13} />
              </button>
              <button
                disabled={idx === chapters.length - 1}
                onClick={(e) => moveChapter(e, idx, idx + 1)}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 transition"
                title="Move Down"
              >
                <ChevronDown size={13} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(ch.fileName);
                }}
                className="p-1 text-slate-500 hover:text-rose-400 transition"
                title="Delete chapter"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};