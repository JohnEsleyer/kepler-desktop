import React, { useEffect, useRef, useState } from 'react';
import { BookMeta } from '../../types/vault';
import { COVER_PRESETS } from '../../theme/coverTheme';
import { X, Upload, Check, Trash2 } from 'lucide-react';
import { CustomToggle, CustomInput, CustomTextarea, useDialog } from '../ui/CustomUI';

interface BookSettingsModalProps {
  initialMeta?: Partial<BookMeta>;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onSave: (meta: {
    title: string;
    description: string;
    tags: string[];
    coverPreset: string;
    showTitleOnCover: boolean;
    coverImage: string | null;
  }) => void;
}

export const BookSettingsModal: React.FC<BookSettingsModalProps> = ({
  initialMeta,
  isOpen,
  onClose,
  onDelete,
  onSave,
}) => {
  const { showConfirm } = useDialog();
  const [title, setTitle] = useState(initialMeta?.title || '');
  const [description, setDescription] = useState(initialMeta?.description || '');
  const [tags, setTags] = useState(initialMeta?.tags?.join(', ') || 'General');
  const [coverPreset, setCoverPreset] = useState(initialMeta?.coverPreset || 'celestial');
  const [showTitleOnCover, setShowTitleOnCover] = useState(
    initialMeta?.showTitleOnCover !== undefined ? initialMeta.showTitleOnCover : true
  );
  const [coverImage, setCoverImage] = useState<string | null>(initialMeta?.coverImage || null);
  const [imageError, setImageError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialMeta?.title || '');
    setDescription(initialMeta?.description || '');
    setTags(initialMeta?.tags?.join(', ') || 'General');
    setCoverPreset(initialMeta?.coverPreset || 'celestial');
    setShowTitleOnCover(initialMeta?.showTitleOnCover !== undefined ? initialMeta.showTitleOnCover : true);
    setCoverImage(initialMeta?.coverImage || null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [isOpen, initialMeta?.id]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError('Please choose an image file (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setImageError('Cover images must be smaller than 8 MB.');
      return;
    }
    setImageError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCoverImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      coverPreset,
      showTitleOnCover,
      coverImage,
    });
    onClose();
  };

  const handleDeleteBook = async () => {
    const ok = await showConfirm({
      title: 'Delete Notebook',
      message: `Permanently delete "${title}" and all its chapters?`,
      confirmText: 'Delete Permanently',
      isDanger: true,
    });
    if (ok && onDelete) {
      onDelete();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700/80 bg-[#070b14] shadow-2xl shadow-indigo-950/40">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="text-sm font-bold text-white">
            {initialMeta?.id ? 'Notebook Settings' : 'Create New Book'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] space-y-4 overflow-y-auto p-5">
          <CustomInput
            label="Book Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Quantum Electrodynamics"
          />

          <CustomTextarea
            label="Description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief summary or subject matter..."
          />

          <CustomInput
            label="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Physics, Math, Orbitals"
          />

          {/* Book Cover Customization */}
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Cover Design & Art
            </span>

            <CustomToggle
              checked={showTitleOnCover}
              onChange={setShowTitleOnCover}
              label="Display Title on Cover"
              description="Turn off if your custom artwork already includes the title."
            />

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">Custom Artwork</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
                >
                  <Upload size={13} /> Upload Image
                </button>
                {coverImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImage(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    Remove Cover
                  </button>
                )}
              </div>

              {imageError && <p className="mt-2 text-[11px] text-rose-400">{imageError}</p>}

              {coverImage && (
                <div className="mt-2.5 h-24 w-16 overflow-hidden rounded-lg border border-slate-700 shadow">
                  <img src={coverImage} alt="Cover preview" className="h-full w-full object-cover" />
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">Preset Gradient Fallback</label>
              <div className="grid grid-cols-6 gap-2">
                {COVER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.name}
                    onClick={() => setCoverPreset(preset.id)}
                    className={`relative flex h-9 items-center justify-center rounded-lg border bg-gradient-to-br ${preset.gradient} transition ${
                      coverPreset === preset.id
                        ? 'border-white ring-2 ring-indigo-500'
                        : 'border-slate-800 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {coverPreset === preset.id && <Check size={14} className="text-white drop-shadow" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-3">
            {initialMeta?.id && onDelete ? (
              <button
                type="button"
                onClick={handleDeleteBook}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 transition"
              >
                <Trash2 size={13} /> Delete Book
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
