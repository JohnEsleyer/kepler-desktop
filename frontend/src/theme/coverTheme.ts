export const COVER_PRESETS = [
  { id: 'celestial', name: 'Celestial', gradient: 'from-indigo-950 via-slate-900 to-sky-950', accent: '#38bdf8' },
  { id: 'quantum', name: 'Quantum', gradient: 'from-violet-950 via-purple-950 to-slate-950', accent: '#a855f7' },
  { id: 'solar', name: 'Solar', gradient: 'from-amber-950 via-orange-950 to-stone-950', accent: '#f59e0b' },
  { id: 'midnight', name: 'Midnight', gradient: 'from-slate-950 via-blue-950 to-zinc-950', accent: '#60a5fa' },
  { id: 'nebula', name: 'Nebula', gradient: 'from-fuchsia-950 via-pink-950 to-slate-950', accent: '#ec4899' },
  { id: 'crimson', name: 'Crimson', gradient: 'from-rose-950 via-red-950 to-stone-950', accent: '#f43f5e' },
];

export function getCoverGradient(preset: string): string {
  const found = COVER_PRESETS.find((p) => p.id === preset);
  return found ? found.gradient : COVER_PRESETS[0].gradient;
}

export function getCoverAccent(preset: string): string {
  const found = COVER_PRESETS.find((p) => p.id === preset);
  return found ? found.accent : COVER_PRESETS[0].accent;
}