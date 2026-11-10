import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { X, AlertCircle, HelpCircle, Check, ChevronDown } from 'lucide-react';

export interface DialogOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
  placeholder?: string;
  isDanger?: boolean;
}

interface DialogContextType {
  showAlert: (title: string, message?: string) => Promise<void>;
  showConfirm: (options: DialogOptions) => Promise<boolean>;
  showPrompt: (options: DialogOptions) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'prompt';
    options: DialogOptions;
    resolve: (val: any) => void;
  } | null>(null);

  const [promptValue, setPromptValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (dialogState?.isOpen && dialogState.type === 'prompt') {
      const timer = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [dialogState]);

  const showAlert = (title: string, message?: string): Promise<void> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        type: 'alert',
        options: { title, message, confirmText: 'OK' },
        resolve: () => {
          setDialogState(null);
          resolve();
        },
      });
    });
  };

  const showConfirm = (options: DialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        type: 'confirm',
        options: { confirmText: 'Confirm', cancelText: 'Cancel', ...options },
        resolve: (result: boolean) => {
          setDialogState(null);
          resolve(result);
        },
      });
    });
  };

  const showPrompt = (options: DialogOptions): Promise<string | null> => {
    setPromptValue(options.defaultValue || '');
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        type: 'prompt',
        options: { confirmText: 'Continue', cancelText: 'Cancel', ...options },
        resolve: (result: string | null) => {
          setDialogState(null);
          resolve(result);
        },
      });
    });
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      {dialogState?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700/80 bg-[#070b14] shadow-2xl shadow-indigo-950/40">
            <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
              <div className="flex items-center gap-2.5">
                {dialogState.type === 'alert' && <AlertCircle size={18} className="text-indigo-400" />}
                {dialogState.type === 'confirm' && <HelpCircle size={18} className="text-amber-400" />}
                {dialogState.type === 'prompt' && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
                <h3 className="text-sm font-bold text-white">{dialogState.options.title}</h3>
              </div>
              <button
                onClick={() => dialogState.resolve(dialogState.type === 'prompt' ? null : false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5">
              {dialogState.options.message && (
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
                  {dialogState.options.message}
                </p>
              )}

              {dialogState.type === 'prompt' && (
                <div className="mt-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={promptValue}
                    onChange={(e) => setPromptValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') dialogState.resolve(promptValue);
                      if (e.key === 'Escape') dialogState.resolve(null);
                    }}
                    placeholder={dialogState.options.placeholder}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800/80 bg-slate-900/40 px-5 py-3">
              {dialogState.type !== 'alert' && (
                <button
                  onClick={() => dialogState.resolve(dialogState.type === 'prompt' ? null : false)}
                  className="rounded-lg border border-slate-700 bg-slate-800/60 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
                >
                  {dialogState.options.cancelText || 'Cancel'}
                </button>
              )}
              <button
                onClick={() => dialogState.resolve(dialogState.type === 'prompt' ? promptValue : true)}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold text-white shadow-md transition ${
                  dialogState.options.isDanger
                    ? 'bg-rose-600 shadow-rose-600/30 hover:bg-rose-500'
                    : 'bg-indigo-600 shadow-indigo-600/30 hover:bg-indigo-500'
                }`}
              >
                {dialogState.options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
};

// Custom Select Component
export const CustomSelect: React.FC<{
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
  className?: string;
}> = ({ value, options, onChange, className = '' }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) || options[0];

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-600 transition"
      >
        <span>{selected?.label}</span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 max-h-56 w-44 overflow-y-auto rounded-xl border border-slate-700 bg-[#0b0f19] p-1 shadow-2xl shadow-black/80">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition ${
                  opt.value === value
                    ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{opt.label}</span>
                {opt.value === value && <Check size={13} className="text-indigo-400" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Custom Toggle Switch
export const CustomToggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
}> = ({ checked, onChange, label, description }) => (
  <div className="flex items-center justify-between gap-4">
    {(label || description) && (
      <div>
        {label && <p className="text-xs font-medium text-slate-200">{label}</p>}
        {description && <p className="text-[11px] text-slate-500">{description}</p>}
      </div>
    )}
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
        checked ? 'bg-indigo-600' : 'bg-slate-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

// Custom Text Input consistent with the app aesthetic.
export const CustomInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }> = ({
  label,
  error,
  className = '',
  ...props
}) => (
  <div>
    {label && <label className="mb-1.5 block text-xs font-semibold text-slate-300">{label}</label>}
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${className}`}
    />
    {error && <p className="mt-1 text-[11px] text-rose-400">{error}</p>}
  </div>
);

// Custom Textarea component
export const CustomTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({
  label,
  className = '',
  ...props
}) => (
  <div>
    {label && <label className="mb-1.5 block text-xs font-semibold text-slate-300">{label}</label>}
    <textarea
      {...props}
      className={`w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${className}`}
    />
  </div>
);

// Custom Search Input with clear trigger and aesthetic icon
export const SearchInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = 'Search...', className = '' }) => (
  <div className={`relative flex items-center ${className}`}>
    <span className="pointer-events-none absolute left-3 text-slate-500">
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </span>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-1.5 pl-8 pr-7 text-xs text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute right-2 rounded p-0.5 text-slate-500 hover:text-slate-300"
      >
        <X size={13} />
      </button>
    )}
  </div>
);
