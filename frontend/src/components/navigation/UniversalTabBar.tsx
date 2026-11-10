import React from 'react';
import { TabItem } from '../../types/vault';
import { BookOpen, X, Home, PanelLeft } from 'lucide-react';

interface UniversalTabBarProps {
  tabs: TabItem[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  onHomeClick: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const UniversalTabBar: React.FC<UniversalTabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onHomeClick,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  return (
    <div className="flex h-10 w-full select-none items-center border-b border-slate-800/80 bg-[#050811] px-2">
      <button
        onClick={onToggleSidebar}
        className={`mr-1 rounded-lg p-1.5 transition ${
          isSidebarOpen
            ? 'bg-indigo-950/40 text-indigo-400'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
        title="Toggle Workspaces Panel"
      >
        <PanelLeft size={15} />
      </button>

      <button
        onClick={onHomeClick}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
          activeTabId === null
            ? 'border border-indigo-500/20 bg-indigo-600/20 text-indigo-200'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <Home size={14} />
        <span>Bookshelf</span>
      </button>

      <div className="mx-2 h-4 w-[1px] bg-slate-800" />

      {/* Tabs list */}
      <div className="flex flex-1 items-center gap-1 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group flex max-w-[200px] cursor-pointer items-center gap-2 rounded-lg px-3 py-1 text-xs font-medium transition ${
                isActive
                  ? 'border border-slate-700 bg-slate-800/90 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-300'
              }`}
              title={`${tab.title} — ${tab.workspacePath}`}
            >
              <BookOpen size={13} className={isActive ? 'text-indigo-400' : 'text-slate-500'} />
              <span className="truncate">{tab.title}</span>
              <button
                onClick={(e) => onCloseTab(tab.id, e)}
                className="rounded p-0.5 text-slate-500 opacity-60 transition hover:bg-slate-700 hover:text-white hover:opacity-100"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
