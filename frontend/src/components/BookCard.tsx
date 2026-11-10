import React from 'react';
import { Book } from '../types/vault';
import { getCoverGradient, getCoverAccent } from '../theme/coverTheme';
import { BookOpen, Pin, Tag } from 'lucide-react';

interface BookCardProps {
  book: Book;
  onOpen: (book: Book) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onOpen }) => {
  const gradient = getCoverGradient(book.meta.coverPreset);
  const accent = getCoverAccent(book.meta.coverPreset);

  return (
    <div
      onClick={() => onOpen(book)}
      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 transition duration-200 hover:-translate-y-1 hover:border-slate-600 hover:shadow-xl hover:shadow-indigo-950/30 cursor-pointer"
      style={{ aspectRatio: '1 / 1.44' }}
    >
      {/* Background Graphic or Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-75 transition duration-300 group-hover:opacity-100`} />

      {/* Decorative Book Spine */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 opacity-80"
        style={{ backgroundColor: accent }}
      />

      {/* Top Header Information */}
      <div className="relative z-10 flex items-start justify-between">
        <span className="flex items-center gap-1 rounded bg-black/40 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-300 backdrop-blur-md">
          <BookOpen size={12} /> {book.chapters.length} Ch
        </span>
        {book.meta.isPinned && (
          <span className="rounded-full bg-amber-500/20 p-1 text-amber-300">
            <Pin size={12} />
          </span>
        )}
      </div>

      {/* Center Details */}
      <div className="relative z-10 mt-auto mb-2">
        <h3 className="line-clamp-2 text-base font-bold text-white group-hover:text-indigo-200">
          {book.meta.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs text-slate-400">
          {book.meta.description || 'No description provided.'}
        </p>
      </div>

      {/* Bottom Tags */}
      <div className="relative z-10 flex flex-wrap gap-1">
        {book.meta.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-0.5 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300"
          >
            <Tag size={9} /> {tag}
          </span>
        ))}
      </div>
    </div>
  );
};