import { BookMeta, VaultScanResult } from '../types/vault';

// Auto-generated Wails v3 bindings. They are regenerated during the build with
// `wails3 generate bindings`; using the bindings (instead of hand-written
// Call.ByName strings) keeps the frontend and Go service signatures in sync.
import * as VaultService from '../../bindings/changeme/services/vaultservice';

export const VaultAPI = {
  scanVault: async (): Promise<VaultScanResult> => {
    const res = await VaultService.ScanVault();
    return res as unknown as VaultScanResult;
  },
  getActiveVault: async (): Promise<string> => {
    return await VaultService.GetActiveVault();
  },
  chooseVaultFolder: async (): Promise<string> => {
    return await VaultService.ChooseVaultFolder();
  },
  openTerminalPath: async (path: string): Promise<string> => {
    return await VaultService.OpenTerminalPath(path);
  },
  switchWorkspace: async (path: string): Promise<VaultScanResult> => {
    const res = await VaultService.SwitchWorkspace(path);
    return res as unknown as VaultScanResult;
  },
  closeWorkspace: async (path: string): Promise<VaultScanResult> => {
    const res = await VaultService.CloseWorkspace(path);
    return res as unknown as VaultScanResult;
  },
  saveChapter: async (bookPath: string, fileName: string, content: string): Promise<void> => {
    await VaultService.SaveChapter(bookPath, fileName, content);
  },
  createChapter: async (bookPath: string, title: string): Promise<string> => {
    return await VaultService.CreateChapter(bookPath, title);
  },
  deleteChapter: async (bookPath: string, fileName: string): Promise<void> => {
    await VaultService.DeleteChapter(bookPath, fileName);
  },
  createBook: async (
    title: string,
    desc: string,
    tags: string,
    preset: string,
    showTitleOnCover: boolean,
    coverDataUri: string
  ): Promise<string> => {
    return await VaultService.CreateBook(title, desc, tags, preset, showTitleOnCover, coverDataUri);
  },
  updateBookMeta: async (bookPath: string, meta: BookMeta): Promise<void> => {
    await VaultService.UpdateBookMeta(bookPath, meta as unknown as Parameters<typeof VaultService.UpdateBookMeta>[1]);
  },
  deleteBook: async (bookPath: string): Promise<void> => {
    await VaultService.DeleteBook(bookPath);
  },
  saveQuestions: async (bookPath: string, questionsJson: string): Promise<void> => {
    await VaultService.SaveQuestions(bookPath, questionsJson);
  },
  saveVisual: async (bookPath: string, fileName: string, content: string): Promise<void> => {
    await VaultService.SaveVisual(bookPath, fileName, content);
  },
  deleteVisual: async (bookPath: string, fileName: string): Promise<void> => {
    await VaultService.DeleteVisual(bookPath, fileName);
  },
  exportVaultZip: async (): Promise<string> => {
    return await VaultService.ExportVaultZip();
  },
};
