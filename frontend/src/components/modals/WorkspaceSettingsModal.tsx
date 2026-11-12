import React, { useEffect, useState } from 'react';
import { X, Search, Trash2, Settings, HardDrive, CheckCircle } from 'lucide-react';
import { VaultAPI } from '../../services/vaultBridge';
import { useDialog } from '../ui/CustomUI';

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  workspacePath: string;
  onClose: () => void;
  onRefreshWorkspace: () => void;
}

export const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({
  isOpen,
  workspacePath,
  onClose,
  onRefreshWorkspace,
}) => {
  const { showConfirm, showAlert } = useDialog();
  const [isScanning, setIsScanning] = useState(false);
  const [orphans, setOrphans] = useState<any[]>([]);
  const [scannedOnce, setScannedOnce] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setOrphans([]);
      setScannedOnce(false);
      setIsScanning(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScanOrphans = async () => {
    setIsScanning(true);
    try {
      const results = await VaultAPI.scanWorkspaceOrphans();
      setOrphans(results || []);
      setScannedOnce(true);
    } catch (e) {
      showAlert('Scan Failed', `${e}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleDeleteOrphan = async (bookPath: string, subpageId: string) => {
    const ok = await showConfirm({
      title: 'Delete Unreferenced Subpage',
      message: `Permanently remove orphan subpage "${subpageId}" from disk?`,
      confirmText: 'Delete',
      isDanger: true,
    });
    if (!ok) return;

    try {
      await VaultAPI.deleteSubpage(bookPath, subpageId);
      setOrphans((prev) => prev.filter((o) => !(o.bookPath === bookPath && o.subpage.id === subpageId)));
      onRefreshWorkspace();
    } catch (e) {
      showAlert('Delete Error', `${e}`);
    }
  };

  const handleDeleteAllOrphans = async () => {
    if (orphans.length === 0) return;

    const ok = await showConfirm({
      title: 'Delete All Orphan Subpages',
      message: `Are you sure you want to permanently delete all ${orphans.length} unreferenced subpages across this entire workspace? This cannot be undone.`,
      confirmText: `Delete All (${orphans.length})`,
      isDanger: true,
    });
    if (!ok) return;

    try {
      for (const item of orphans) {
        await VaultAPI.deleteSubpage(item.bookPath, item.subpage.id);
      }
      setOrphans([]);
      onRefreshWorkspace();
      showAlert('Success', 'All orphan subpages have been permanently deleted.');
    } catch (e) {
      showAlert('Delete Failed', `${e}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700/80 bg-[#070b14] shadow-2xl shadow-indigo-950/40">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
              <Settings size={15} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Universal Workspace Settings</h2>
              <p className="font-mono text-[10px] text-slate-500 truncate max-w-sm">{workspacePath}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-6">
          {/* Workspace Path Info Card */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center gap-3">
              <HardDrive size={18} className="text-slate-400" />
              <div>
                <p className="text-xs font-semibold text-slate-200">Active Workspace Root</p>
                <p className="font-mono text-[11px] text-slate-500 break-all">{workspacePath}</p>
              </div>
            </div>
          </div>

          {/* Orphan Subpage Scanner Section */}
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Orphaned Subpages Integrity
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Scan all books across this workspace to detect subpages that are no longer referenced in any chapter.
                </p>
              </div>
              <button
                type="button"
                onClick={handleScanOrphans}
                disabled={isScanning}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-50"
              >
                <Search size={13} />
                <span>{isScanning ? 'Scanning...' : 'Scan Workspace'}</span>
              </button>
            </div>

            {/* Results */}
            {scannedOnce && (
              <div className="mt-4 border-t border-slate-800/80 pt-3">
                {orphans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-slate-400">
                    <CheckCircle size={22} className="text-emerald-400 mb-2" />
                    <p className="font-semibold text-slate-300">Clean Workspace!</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      No orphaned subpages found across any books.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-amber-400">
                        Found {orphans.length} unreferenced subpage{orphans.length > 1 ? 's' : ''}:
                      </p>
                      <button
                        type="button"
                        onClick={handleDeleteAllOrphans}
                        className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-950/40 px-2.5 py-1 text-[11px] font-semibold text-rose-300 transition hover:bg-rose-900/60 hover:text-white"
                        title="Delete all unreferenced subpages at once"
                      >
                        <Trash2 size={12} />
                        <span>Delete All ({orphans.length})</span>
                      </button>
                    </div>
                    <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                      {orphans.map((item, idx) => (
                        <div
                          key={`${item.bookPath}-${item.subpage.id}-${idx}`}
                          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="rounded bg-indigo-950/50 px-1.5 py-0.5 font-semibold text-[10px] text-indigo-300 mr-2">
                              {item.bookTitle}
                            </span>
                            <span className="font-semibold text-slate-200">{item.subpage.title}</span>
                            <p className="font-mono text-[10px] text-slate-500 mt-0.5">{item.subpage.fileName}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteOrphan(item.bookPath, item.subpage.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                            title="Delete orphan subpage"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-800 bg-slate-900/40 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
