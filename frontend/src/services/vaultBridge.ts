import { VaultScanResult } from '../types/vault';

// Import the auto-generated Wails v3 bindings:
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
  saveChapter: async (bookPath: string, fileName: string, content: string): Promise<void> => {
    await VaultService.SaveChapter(bookPath, fileName, content);
  },
  createChapter: async (bookPath: string, title: string): Promise<string> => {
    return await VaultService.CreateChapter(bookPath, title);
  },
  deleteChapter: async (bookPath: string, fileName: string): Promise<void> => {
    await VaultService.DeleteChapter(bookPath, fileName);
  },
  createBook: async (title: string, desc: string, tags: string, preset: string): Promise<string> => {
    return await VaultService.CreateBook(title, desc, tags, preset);
  },
  deleteBook: async (bookPath: string): Promise<void> => {
    await VaultService.DeleteBook(bookPath);
  },
  saveQuestions: async (bookPath: string, questionsJson: string): Promise<void> => {
    await VaultService.SaveQuestions(bookPath, questionsJson);
  },
  exportVaultZip: async (): Promise<string> => {
    return await VaultService.ExportVaultZip();
  }
};