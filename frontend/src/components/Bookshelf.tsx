import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Book } from '../types/vault';
import { BookCard } from './BookCard';
import { Folder, FolderOpen, Plus, RefreshCw, Download, ChevronLeft, ChevronRight, X, Tag as TagIcon, Check } from 'lucide-react';
import { SearchInput } from './ui/CustomUI';

interface BookshelfProps {
  vaultPath: string;
  books: Book[];
  tags: string[];
  onOpenBook: (book: Book) => void;
  onEditBook: (book: Book) => void;
  onRefresh: () => void;
  onChangeVault: () => void;
  onCreateBook: () => void;
  onExportZip: () => void;
}

const PAGE_SIZE = 12;

export const Bookshelf: React.FC<BookshelfProps> = ({
  vaultPath,
  books,
  tags,
  onOpenBook,
  onEditBook,
  onRefresh,
  onChangeVault,
  onCreateBook,
  onExportZip,
}) => {
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState<boolean>(false);
  const [tagModalSearch, setTagModalSearch] = useState<string>('');

  const tagsContainerRef = useRef<HTMLDivElement>(null);
  const [visibleTagLimit, setVisibleTagLimit] = useState<number>(8);

  // Dynamically calculate how many tags fit the bar before showing "..."
  useEffect(() => {
    const calculateVisibleTags = () => {
      if (!tagsContainerRef.current) return;
      const containerWidth = tagsContainerRef.current.clientWidth;
      // Reserve space for "All" button and "..." button (~120px)
      const availableWidth = Math.max(100, containerWidth - 140);
      const estimatedTagWidth = 85;
      const count = Math.max(2, Math.floor(availableWidth / estimatedTagWidth));
      setVisibleTagLimit(count);
    };

    calculateVisibleTags();
    window.addEventListener('resize', calculateVisibleTags);
    return () => window.removeEventListener('resize', calculateVisibleTags);
  }, [tags]);

  // Reset pagination to page 1 whenever search, filter, or vault changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTag, search, vaultPath]);

  const workspaceName = useMemo(() => {
    if (!vaultPath) return 'Workspace';
    const clean = vaultPath.replace(/[/\\]+$/, '');
    const parts = clean.split(/[/\\]/);
    return parts[parts.length - 1] || vaultPath;
  }, [vaultPath]);

  // Books sorted latest created to oldest
  const sortedBooks = useMemo(() => {
    return [...books].sort((a, b) => b.meta.createdAt - a.meta.createdAt);
  }, [books]);

  const filteredBooks = useMemo(() => {
    return sortedBooks.filter((b) => {
      const matchTag = selectedTag === 'All' || b.meta.tags.includes(selectedTag);
      const matchSearch =
        search.trim() === '' ||
        b.meta.title.toLowerCase().includes(search.toLowerCase()) ||
        b.meta.description.toLowerCase().includes(search.toLowerCase());
      return matchTag && matchSearch;
    });
  }, [sortedBooks, selectedTag, search]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
  const currentBooks = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredBooks.slice(start, start + PAGE_SIZE);
  }, [filteredBooks, currentPage]);

  const displayedTags = useMemo(() => {
    return tags.slice(0, visibleTagLimit);
  }, [tags, visibleTagLimit]);

  const hasOverflowTags = tags.length > visibleTagLimit;

  // Filter tags in the all-tags picker modal
  const modalFilteredTags = useMemo(() => {
    const q = tagModalSearch.toLowerCase().trim();
    if (!q) return tags;
    return tags.filter((t) => t.toLowerCase().includes(q));
  }, [tags, tagModalSearch]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#030712] text-slate-100">
      {/* Top Header Bar */}
      <header className="flex h-14 items-center justify-between border-b border-slate-800/80 bg-[#070b14] px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/70 bg-slate-800/80 text-indigo-400 shadow-sm">
            <Folder size={17} />
          </div>
          <div className="min-w-0">
            <h1 className="max-w-md truncate text-sm font-bold leading-tight text-white">{workspaceName}</h1>
            <p className="max-w-md truncate font-mono text-[11px] text-slate-500">{vaultPath}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onChangeVault}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <FolderOpen size={14} /> Open Folder
          </button>
          <button
            onClick={onRefresh}
            className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Rescan Folder"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={onExportZip}
            className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Export ZIP"
          >
            <Download size={14} />
          </button>
          <button
            onClick={onCreateBook}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-500"
          >
            <Plus size={14} /> New Book
          </button>
        </div>
      </header>

      {/* Filter and Search Bar with Responsive Tag Overflow */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800/50 bg-[#050811] px-6 py-2.5">
        <div ref={tagsContainerRef} className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          <button
            onClick={() => setSelectedTag('All')}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
              selectedTag === 'All'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            All ({books.length})
          </button>

          {displayedTags.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTag(t)}
              className={`shrink-0 truncate rounded-full px-3 py-1 text-xs font-medium transition ${
                selectedTag === t
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}

          {/* Tag overflow trigger */}
          {hasOverflowTags && (
            <button
              onClick={() => setIsTagsModalOpen(true)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wider transition ${
                selectedTag !== 'All' && !displayedTags.includes(selectedTag)
                  ? 'border border-indigo-500 bg-indigo-600/30 text-indigo-200'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
              title="More tags..."
            >
              ... {selectedTag !== 'All' && !displayedTags.includes(selectedTag) ? `(${selectedTag})` : ''}
            </button>
          )}
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search notebooks..."
          className="w-56 shrink-0"
        />
      </div>

      {/* Grid of Books */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {currentBooks.map((b) => (
            <BookCard
              key={b.meta.id}
              book={b}
              onOpen={onOpenBook}
              onEdit={(book, e) => {
                e.stopPropagation();
                onEditBook(book);
              }}
            />
          ))}
        </div>

        {filteredBooks.length === 0 && (
          <div className="mt-20 flex flex-col items-center justify-center text-sm text-slate-500">
            <p>No notebooks found in this workspace.</p>
            <button
              onClick={onCreateBook}
              className="mt-3 text-xs font-semibold text-indigo-400 hover:underline"
            >
              Create your first book
            </button>
          </div>
        )}
      </main>

      {/* Pagination Footer */}
      {filteredBooks.length > PAGE_SIZE && (
        <footer className="flex h-12 items-center justify-between border-t border-slate-800/80 bg-[#070b14] px-6 text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-200">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{' '}
            <span className="font-semibold text-slate-200">
              {Math.min(currentPage * PAGE_SIZE, filteredBooks.length)}
            </span>{' '}
            of <span className="font-semibold text-slate-200">{filteredBooks.length}</span> notebooks
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`h-7 w-7 rounded-lg text-xs font-semibold transition ${
                  currentPage === page
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </footer>
      )}

      {/* Overflow Tags Selection Modal */}
      {isTagsModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700/80 bg-[#070b14] shadow-2xl shadow-indigo-950/40">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div className="flex items-center gap-2">
                <TagIcon size={16} className="text-indigo-400" />
                <h2 className="text-sm font-bold text-white">Select Tag Filter</h2>
              </div>
              <button
                onClick={() => setIsTagsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4">
              <SearchInput
                value={tagModalSearch}
                onChange={setTagModalSearch}
                placeholder="Search tags..."
                className="mb-3 w-full"
              />

              <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTag('All');
                    setIsTagsModalOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
                    selectedTag === 'All'
                      ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <span>All Notebooks</span>
                  {selectedTag === 'All' && <Check size={14} className="text-indigo-400" />}
                </button>

                {modalFilteredTags.map((tag) => {
                  const isSelected = selectedTag === tag;
                  const count = books.filter((b) => b.meta.tags.includes(tag)).length;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setSelectedTag(tag);
                        setIsTagsModalOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
                        isSelected
                          ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <TagIcon size={12} className={isSelected ? 'text-indigo-400' : 'text-slate-500'} />
                        {tag}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                          {count}
                        </span>
                        {isSelected && <Check size={14} className="text-indigo-400" />}
                      </div>
                    </button>
                  );
                })}

                {modalFilteredTags.length === 0 && (
                  <p className="py-4 text-center text-xs text-slate-500">No matching tags found.</p>
                )}
              </div>
            </div>

            <div className="border-t border-slate-800 bg-slate-900/40 px-5 py-3 text-right">
              <button
                type="button"
                onClick={() => setIsTagsModalOpen(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
