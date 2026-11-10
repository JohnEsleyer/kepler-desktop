import { useEffect, useState } from 'react';
import { VaultAPI } from './services/vaultBridge';
import { Book, VaultScanResult } from './types/vault';
import { Bookshelf } from './components/Bookshelf';
import { Workspace } from './components/Workspace';

export default function App() {
  const [scanResult, setScanResult] = useState<VaultScanResult | null>(null);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadVault = async () => {
    try {
      setLoading(true);
      const res = await VaultAPI.scanVault();
      setScanResult(res);

      // Keep active book updated if open
      if (activeBook) {
        const found = res.books.find((b) => b.meta.id === activeBook.meta.id);
        if (found) setActiveBook(found);
      }
    } catch (err) {
      console.error('Failed to scan vault:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVault();
  }, []);

  const handleChangeVault = async () => {
    await VaultAPI.chooseVaultFolder();
    loadVault();
  };

  const handleCreateBook = async () => {
    const title = prompt('Enter Book Title:');
    if (!title) return;
    const desc = prompt('Enter Description:') || '';
    const tags = prompt('Enter tags (comma separated):') || 'General';
    await VaultAPI.createBook(title, desc, tags, 'solar');
    loadVault();
  };

  const handleExportZip = async () => {
    try {
      const target = await VaultAPI.exportVaultZip();
      alert(`Exported vault archive to:\n${target}`);
    } catch (err) {
      alert(`Export failed: ${err}`);
    }
  };

  if (loading && !scanResult) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#030712] text-slate-400 text-sm">
        Scanning Esper Vault...
      </div>
    );
  }

  return (
    <>
      {activeBook ? (
        <Workspace
          book={activeBook}
          onBack={() => setActiveBook(null)}
          onRefresh={loadVault}
        />
      ) : (
        <Bookshelf
          vaultPath={scanResult?.vaultPath || ''}
          books={scanResult?.books || []}
          tags={scanResult?.tags || []}
          onOpenBook={(book) => setActiveBook(book)}
          onRefresh={loadVault}
          onChangeVault={handleChangeVault}
          onCreateBook={handleCreateBook}
          onExportZip={handleExportZip}
        />
      )}
    </>
  );
}