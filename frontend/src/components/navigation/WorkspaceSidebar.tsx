import React from 'react';
import { WorkspaceEntry } from '../../types/vault';
import { Folder, FolderPlus, X, HardDrive, Layers } from 'lucide-react';

interface WorkspaceSidebarProps {
  workspaces: WorkspaceEntry[];
  activeWorkspace: string;
  onSelect: (path: string) => void;
  onCloseWorkspace: (path: string) => void;
  onOpenNewFolder: () => void;
  isOpen: boolean;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  workspaces,
  activeWorkspace,
  onSelect,
  onCloseWorkspace,
  onOpenNewFolder,
  isOpen,
}) => {
  if (!isOpen) return null;

  return (
    <aside className="flex w-64 shrink-0 select-none flex-col justify-between border-r border-slate-800/80 bg-[#060913]">
      <div className="min-h-0">
        <div className="flex items-center justify-between border-b border-slate-800/70 p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Layers size={14} className="text-indigo-400" />
            <span>Workspaces</span>
          </div>
          <button
            onClick={onOpenNewFolder}
            className="rounded p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Open Folder as Workspace"
          >
            <FolderPlus size={15} />
          </button>
        </div>

        <div className="max-h-[calc(100vh-140px)] space-y-1 overflow-y-auto p-2">
          {workspaces.map((ws) => {
            const isActive = ws.path === activeWorkspace;
            return (
              <div
                key={ws.path}
                onClick={() => onSelect(ws.path)}
                className={`group flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-xs transition ${
                  isActive
                    ? 'border border-indigo-500/30 bg-indigo-600/20 text-indigo-200'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
                title={ws.path}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Folder size={14} className={isActive ? 'text-indigo-400' : 'text-slate-500'} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-200">{ws.name}</p>
                    <p className="truncate font-mono text-[10px] text-slate-500">{ws.path}</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                    {ws.bookCount}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseWorkspace(ws.path);
                    }}
                    className="p-1 text-slate-500 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
                    title="Close Workspace"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            );
          })}

          {workspaces.length === 0 && (
            <div className="flex flex-col items-center justify-center px-3 py-8 text-center">
              <FolderPlus size={24} className="mb-2 text-slate-600" />
              <p className="text-xs font-semibold text-slate-400">No workspaces yet</p>
              <p className="mt-1 text-[11px] text-slate-500">Open a folder to get started.</p>
              <button
                onClick={onOpenNewFolder}
                className="mt-3 flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
              >
                <FolderPlus size={12} /> Open Folder
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-slate-800/80 bg-slate-900/30 p-3 text-xs text-slate-400">
        <HardDrive size={14} className="text-slate-500" />
        <span className="truncate font-mono text-[11px] text-slate-500">
          CLI: <code className="text-indigo-300">kepler &lt;path&gt;</code>
        </span>
      </div>
    </aside>
  );
};
