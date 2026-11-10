export interface BookMeta {
  id: string;
  title: string;
  description: string;
  coverPreset: string;
  coverImage?: string | null;
  tags: string[];
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Chapter {
  id: string;
  bookId: string;
  fileName: string;
  title: string;
  content: string;
  position: number;
}

export interface Question {
  id: string;
  title: string;
  answer: string;
  position: number;
}

export interface Visual {
  fileName: string;
  title: string;
  kind: 'html' | 'json';
  assignedChapter: number;
  content: string;
}

export interface Book {
  meta: BookMeta;
  path: string;
  chapters: Chapter[];
  questions: Question[];
  visuals: Visual[];
}

export interface VaultScanResult {
  vaultPath: string;
  books: Book[];
  tags: string[];
}