import React, { useState } from 'react';
import { Book } from '../types/vault';
import { BookCard } from './BookCard';
import {
  FolderOpen, Plus, RefreshCw, Download, Search
} from 'lucide-react';

interface BookshelfProps {
  vaultPath: string;
  books: Book[];
  tags: string[];
  onOpenBook: (book: Book) => void;
  onRefresh: () => void;
  onChangeVault: () => void;
  onCreateBook: () => void;
  onExportZip: () => void;
}

export const Bookshelf: React.FC<BookshelfProps> = ({
  vaultPath,
  books,
  tags,
  onOpenBook,
  onRefresh,
  onChangeVault,
  onCreateBook,
  onExportZip,
}) => {
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

  const filteredBooks = books.filter((b) => {
    const matchTag = selectedTag === 'All' || b.meta.tags.includes(selectedTag);
    const matchSearch =
      search.trim() === '' ||
      b.meta.title.toLowerCase().includes(search.toLowerCase()) ||
      b.meta.description.toLowerCase().includes(search.toLowerCase());
    return matchTag && matchSearch;
  });

  return (
    <div className="flex h-screen w-screen flex-col bg-[#030712] text-slate-100 overflow-hidden">
      {/* Top Bar */}
      <header className="flex h-14 items-center justify-between border-b border-slate-800/80 bg-[#070b14] px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-500/30">
            E
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Esper Vault</h1>
            <p className="text-[11px] font-mono text-slate-500 truncate max-w-sm">{vaultPath}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onChangeVault}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <FolderOpen size={14} /> Open Folder
          </button>
          <button
            onClick={onRefresh}
            className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            title="Rescan Folder"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={onExportZip}
            className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            title="Export ZIP"
          >
            <Download size={14} />
          </button>
          <button
            onClick={onCreateBook}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition"
          >
            <Plus size={14} /> New Book
          </button>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/50 bg-[#050811] px-6 py-2.5">
        <div className="flex items-center gap-1 overflow-x-auto">
          {['All', ...tags].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTag(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                selectedTag === t
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search books..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 rounded-lg border border-slate-800 bg-slate-900 py-1 pl-8 pr-3 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Bookshelf Grid */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredBooks.map((b) => (
            <BookCard key={b.meta.id} book={b} onOpen={onOpenBook} />
          ))}
        </div>

        {filteredBooks.length === 0 && (
          <div className="mt-20 flex flex-col items-center justify-center text-slate-500 text-sm">
            <p>No notebooks found in this vault.</p>
            <button
              onClick={onCreateBook}
              className="mt-3 text-xs font-semibold text-indigo-400 hover:underline"
            >
              Create your first book
            </button>
          </div>
        )}
      </main>
    </div>
  );
};