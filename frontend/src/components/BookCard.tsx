import React from 'react';
import { Book } from '../types/vault';
import { getCoverGradient, getCoverAccent } from '../theme/coverTheme';
import { BookOpen, Pin, Tag, Settings } from 'lucide-react';

interface BookCardProps {
  book: Book;
  onOpen: (book: Book) => void;
  onEdit: (book: Book, e: React.MouseEvent) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onOpen, onEdit }) => {
  const gradient = getCoverGradient(book.meta.coverPreset);
  const accent = getCoverAccent(book.meta.coverPreset);
  const showTitle = book.meta.showTitleOnCover !== false;

  return (
    <div
      onClick={() => onOpen(book)}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 transition duration-200 hover:-translate-y-1 hover:border-slate-600 hover:shadow-2xl hover:shadow-indigo-950/40 cursor-pointer"
      style={{ aspectRatio: '1 / 1.48' }}
    >
      {/* Background Cover Image or Gradient */}
      {book.meta.coverImage ? (
        <img
          src={book.meta.coverImage}
          alt={book.meta.title}
          className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-80 transition duration-300 group-hover:opacity-100`}
        />
      )}

      {/* Subtle overlay gradient to ensure text readable when the title is shown */}
      {showTitle && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/30" />
      )}

      {/* Book Spine Accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 opacity-90"
        style={{ backgroundColor: accent }}
      />

      {/* Top Header Information & Actions */}
      <div className="relative z-10 flex items-start justify-between">
        <span className="flex items-center gap-1 rounded border border-white/10 bg-black/60 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-300 backdrop-blur-md">
          <BookOpen size={12} /> {book.chapters.length} Ch
        </span>

        <div className="flex items-center gap-1">
          {book.meta.isPinned && (
            <span className="rounded-full bg-amber-500/20 p-1 text-amber-300 backdrop-blur-md">
              <Pin size={12} />
            </span>
          )}
          <button
            onClick={(e) => onEdit(book, e)}
            className="rounded-full bg-black/60 p-1 text-slate-400 opacity-0 backdrop-blur-md transition hover:text-white group-hover:opacity-100"
            title="Book Settings"
          >
            <Settings size={13} />
          </button>
        </div>
      </div>

      {/* Center Details - Only rendered if showTitleOnCover is enabled */}
      {showTitle && (
        <div className="relative z-10 mb-2 mt-auto">
          <h3 className="line-clamp-2 text-base font-bold text-white drop-shadow group-hover:text-indigo-200">
            {book.meta.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs text-slate-300/90 drop-shadow">
            {book.meta.description || 'No description provided.'}
          </p>
        </div>
      )}

      {/* Bottom Tags */}
      <div className={`relative z-10 flex flex-wrap gap-1 ${!showTitle ? 'mt-auto' : ''}`}>
        {book.meta.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-0.5 rounded border border-white/10 bg-black/50 px-1.5 py-0.5 text-[10px] text-slate-200 backdrop-blur-md"
          >
            <Tag size={9} /> {tag}
          </span>
        ))}
      </div>
    </div>
  );
};
