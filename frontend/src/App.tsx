import React, { useEffect, useMemo, useState } from 'react';
import { VaultAPI } from './services/vaultBridge';
import { Book, VaultScanResult, TabItem } from './types/vault';
import { Bookshelf } from './components/Bookshelf';
import { Workspace } from './components/Workspace';
import { WorkspaceSidebar } from './components/navigation/WorkspaceSidebar';
import { UniversalTabBar } from './components/navigation/UniversalTabBar';
import { BookSettingsModal } from './components/modals/BookSettingsModal';
import { WorkspaceSettingsModal } from './components/modals/WorkspaceSettingsModal';
import { DialogProvider, useDialog } from './components/ui/CustomUI';

function AppContent() {
  const { showAlert, showConfirm } = useDialog();
  const [scanResult, setScanResult] = useState<VaultScanResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sidebar & Universal Tabs
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Keep opened books around so tabs remain usable while another workspace is
  // active in the sidebar.
  const [bookCache, setBookCache] = useState<Record<string, Book>>({});

  // Book Settings Modal & Global Workspace Settings Modal
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isWorkspaceSettingsOpen, setIsWorkspaceSettingsOpen] = useState<boolean>(false);

  const mergeBooksIntoCache = (books: Book[]) => {
    setBookCache((prev) => {
      const next = { ...prev };
      for (const book of books) next[book.path] = book;
      return next;
    });
  };

  const loadVault = async () => {
    try {
      setLoading(true);
      const res = await VaultAPI.scanVault();
      setScanResult(res);
      mergeBooksIntoCache(res.books);
    } catch (err) {
      console.error('Failed to scan vault:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVault();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwitchWorkspace = async (path: string) => {
    // Instantly navigate back to the main screen (books list)
    setActiveTabId(null);
    if (scanResult?.vaultPath === path) return;
    try {
      setLoading(true);
      const res = await VaultAPI.switchWorkspace(path);
      setScanResult(res);
      mergeBooksIntoCache(res.books);
    } catch (e) {
      showAlert('Error', `Could not switch workspace: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseWorkspace = async (path: string) => {
    const ok = await showConfirm({
      title: 'Close Workspace',
      message: `Remove "${path}" from your workspaces sidebar? Files will remain on disk.`,
      confirmText: 'Remove',
      isDanger: false,
    });
    if (!ok) return;

    try {
      const res = await VaultAPI.closeWorkspace(path);
      setScanResult(res);
      mergeBooksIntoCache(res.books);

      // Remove any tabs belonging to this closed workspace.
      setTabs((prev) => {
        const remaining = prev.filter((t) => t.workspacePath !== path);
        setActiveTabId((current) => {
          if (current && !remaining.some((t) => t.id === current)) {
            return remaining.length > 0 ? remaining[remaining.length - 1].id : null;
          }
          return current;
        });
        return remaining;
      });
    } catch (e) {
      showAlert('Error', `${e}`);
    }
  };

  const handleDeleteWorkspace = async (path: string) => {
    const ok = await showConfirm({
      title: 'Delete Entire Workspace',
      message: `PERMANENTLY DELETE "${path}" and all notebooks inside from your disk? This action CANNOT be undone.`,
      confirmText: 'Delete Permanently',
      isDanger: true,
    });
    if (!ok) return;

    try {
      setLoading(true);
      const res = await VaultAPI.deleteWorkspace(path);
      setScanResult(res);
      mergeBooksIntoCache(res.books);

      setTabs((prev) => {
        const remaining = prev.filter((t) => t.workspacePath !== path);
        setActiveTabId((current) => {
          if (current && !remaining.some((t) => t.id === current)) {
            return remaining.length > 0 ? remaining[remaining.length - 1].id : null;
          }
          return current;
        });
        return remaining;
      });
    } catch (e) {
      showAlert('Delete Workspace Failed', `${e}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFolder = async () => {
    try {
      const dir = await VaultAPI.chooseVaultFolder();
      if (dir) {
        setActiveTabId(null);
        await loadVault();
      }
    } catch (e) {
      showAlert('Error', `${e}`);
    }
  };

  const handleOpenBook = (book: Book) => {
    const workspacePath = scanResult?.vaultPath || '';
    const existing = tabs.find(
      (t) => t.bookId === book.meta.id && t.bookPath === book.path
    );
    setBookCache((prev) => ({ ...prev, [book.path]: book }));

    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    const lastChapterIndex = Math.max(0, (book.chapters?.length || 1) - 1);
    const newTab: TabItem = {
      id: `tab-${book.meta.id}-${Date.now()}`,
      workspacePath,
      bookId: book.meta.id,
      bookPath: book.path,
      title: book.meta.title,
      activeChapterIndex: lastChapterIndex,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleSelectTab = async (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab && scanResult && tab.workspacePath && tab.workspacePath !== scanResult.vaultPath) {
      try {
        const res = await VaultAPI.switchWorkspace(tab.workspacePath);
        setScanResult(res);
        mergeBooksIntoCache(res.books);
      } catch (e) {
        console.error('Failed to switch workspace for tab:', e);
      }
    }
    setActiveTabId(tabId);
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(nextTabs);
    if (activeTabId === tabId) {
      setActiveTabId(nextTabs.length > 0 ? nextTabs[nextTabs.length - 1].id : null);
    }
  };

  const handleClearAllTabs = () => {
    setTabs([]);
    setActiveTabId(null);
  };

  const handleSaveBookSettings = async (data: {
    title: string;
    description: string;
    tags: string[];
    coverPreset: string;
    showTitleOnCover: boolean;
    coverImage: string | null;
  }) => {
    try {
      if (editingBook) {
        const updatedMeta = {
          ...editingBook.meta,
          title: data.title,
          description: data.description,
          tags: data.tags,
          coverPreset: data.coverPreset,
          showTitleOnCover: data.showTitleOnCover,
          coverImage: data.coverImage,
        };
        await VaultAPI.updateBookMeta(editingBook.path, updatedMeta);
        setTabs((prev) =>
          prev.map((t) =>
            t.bookPath === editingBook.path ? { ...t, title: data.title } : t
          )
        );
      } else {
        await VaultAPI.createBook(
          data.title,
          data.description,
          data.tags.join(','),
          data.coverPreset,
          data.showTitleOnCover,
          data.coverImage || ''
        );
      }
      await loadVault();
    } catch (e) {
      showAlert('Save Failed', `${e}`);
    } finally {
      setEditingBook(null);
      setIsSettingsOpen(false);
    }
  };

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || null,
    [tabs, activeTabId]
  );
  const activeBook = useMemo(() => {
    if (!activeTab) return null;
    const fromCurrentWorkspace = scanResult?.books.find(
      (b) => b.meta.id === activeTab.bookId && b.path === activeTab.bookPath
    );
    return fromCurrentWorkspace || bookCache[activeTab.bookPath] || null;
  }, [activeTab, scanResult, bookCache]);

  if (loading && !scanResult) {
    return (
      <div className="flex h-screen w-screen flex-col bg-[#030712]">
        <div className="h-10 w-full border-b border-slate-800/80 bg-[#050811] animate-pulse" />
        <div className="flex flex-1">
          <div className="w-64 border-r border-slate-800/80 bg-[#060913] animate-pulse" />
          <div className="flex-1">
            <div className="h-14 border-b border-slate-800/80 bg-[#070b14] animate-pulse" />
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 p-8">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-slate-900/40" style={{ aspectRatio: '1 / 1.48' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#030712] text-slate-100">
      {/* Universal Tab Bar on top with Global Workspace Settings Button */}
      <UniversalTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onCloseAllTabs={handleClearAllTabs}
        onHomeClick={() => setActiveTabId(null)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenWorkspaceSettings={() => setIsWorkspaceSettingsOpen(true)}
        isSidebarOpen={isSidebarOpen}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Workspace Panel */}
        <WorkspaceSidebar
          workspaces={scanResult?.workspaces || []}
          activeWorkspace={scanResult?.activeWorkspace || ''}
          onSelect={(path) => {
            setActiveTabId(null);
            handleSwitchWorkspace(path);
          }}
          onCloseWorkspace={handleCloseWorkspace}
          onDeleteWorkspace={handleDeleteWorkspace}
          onOpenNewFolder={handleOpenFolder}
          isOpen={isSidebarOpen}
        />

        {/* Content Area: Active Book Workspace or Bookshelf with smooth fade transition */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {activeBook ? (
            <div className="flex h-full w-full flex-col animate-fade-in">
              <Workspace
                key={activeBook.meta.id}
                book={activeBook}
                initialChapterIndex={activeTab?.activeChapterIndex ?? 0}
                onChapterChange={(index) => {
                  if (!activeTab) return;
                  setTabs((prev) =>
                    prev.map((t) => (t.id === activeTab.id ? { ...t, activeChapterIndex: index } : t))
                  );
                }}
                onBack={() => setActiveTabId(null)}
                onRefresh={loadVault}
              />
            </div>
          ) : (
            <Bookshelf
              vaultPath={scanResult?.vaultPath || ''}
              books={scanResult?.books || []}
              tags={scanResult?.tags || []}
              isLoading={loading}
              onOpenBook={handleOpenBook}
              onEditBook={(book) => {
                setEditingBook(book);
                setIsSettingsOpen(true);
              }}
              onRefresh={loadVault}
              onChangeVault={handleOpenFolder}
              onCreateBook={() => {
                setEditingBook(null);
                setIsSettingsOpen(true);
              }}
              onExportZip={async () => {
                try {
                  const target = await VaultAPI.exportVaultZip();
                  showAlert('Export Succeeded', `Archive exported to:\n${target}`);
                } catch (e) {
                  showAlert('Export Failed', `${e}`);
                }
              }}
            />
          )}
        </div>
      </div>

      {loading && scanResult && (
        <div className="pointer-events-none fixed bottom-3 right-3 z-50 flex items-center gap-2 rounded-full border border-slate-700 bg-[#070b14]/90 px-3 py-1.5 text-[11px] text-slate-400 shadow-lg backdrop-blur">
          <div className="h-3 w-3 animate-spin rounded-full border border-slate-600 border-t-indigo-400" />
          Refreshing
        </div>
      )}

      {/* Book Settings Modal (Cover Upload, Title Toggle) */}
      <BookSettingsModal
        isOpen={isSettingsOpen}
        initialMeta={editingBook?.meta}
        bookPath={editingBook?.path}
        onClose={() => {
          setIsSettingsOpen(false);
          setEditingBook(null);
        }}
        onDelete={async () => {
          if (!editingBook) return;
          try {
            await VaultAPI.deleteBook(editingBook.path);
            setTabs((prev) => prev.filter((t) => t.bookPath !== editingBook.path));
            if (activeTab?.bookPath === editingBook.path) {
              setActiveTabId(null);
            }
            await loadVault();
          } catch (e) {
            showAlert('Delete Failed', `${e}`);
          }
        }}
        onSave={handleSaveBookSettings}
      />

      {/* Universal Workspace-wide Settings Modal */}
      <WorkspaceSettingsModal
        isOpen={isWorkspaceSettingsOpen}
        workspacePath={scanResult?.vaultPath || ''}
        onClose={() => setIsWorkspaceSettingsOpen(false)}
        onRefreshWorkspace={loadVault}
      />
    </div>
  );
}

export default function App() {
  return (
    <DialogProvider>
      <AppContent />
    </DialogProvider>
  );
}
