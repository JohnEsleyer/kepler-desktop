import React, { useState } from 'react';
import { Chapter } from '../types/vault';
import { FileText, Trash2, GripVertical } from 'lucide-react';

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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (chapters.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-slate-500">
        No chapters yet. Click + above to add one.
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setHoverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setHoverIndex(null);
      return;
    }

    const reordered = [...chapters];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    setDraggedIndex(null);
    setHoverIndex(null);
    onReorder(reordered);
  };

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {chapters.map((ch, idx) => {
        const isDragging = draggedIndex === idx;
        const isHovered = hoverIndex === idx;
        const isActive = activeIndex === idx;

        return (
          <div
            key={ch.id}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={() => {
              setDraggedIndex(null);
              setHoverIndex(null);
            }}
            onClick={() => onSelect(idx)}
            className={`group relative flex items-center justify-between rounded-xl px-2 py-2 text-xs font-medium cursor-pointer transition select-none ${
              isActive
                ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            } ${isDragging ? 'opacity-30 border-dashed border-indigo-500' : ''} ${
              isHovered ? 'ring-2 ring-indigo-500/60 bg-indigo-950/30' : ''
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span
                className="cursor-grab active:cursor-grabbing text-slate-600 opacity-0 group-hover:opacity-100 transition"
                title="Drag to reorder chapter"
              >
                <GripVertical size={13} />
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

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(ch.fileName);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition"
              title="Delete chapter"
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
};