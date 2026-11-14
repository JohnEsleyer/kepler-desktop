import { BookMeta, VaultScanResult } from '../types/vault';
import { Call } from '@wailsio/runtime';

export const VaultAPI = {
  scanVault: async (): Promise<VaultScanResult> => {
    return (await Call.ByName('changeme/services.VaultService.ScanVault')) as VaultScanResult;
  },
  getActiveVault: async (): Promise<string> => {
    return (await Call.ByName('changeme/services.VaultService.GetActiveVault')) as string;
  },
  chooseVaultFolder: async (): Promise<string> => {
    return (await Call.ByName('changeme/services.VaultService.ChooseVaultFolder')) as string;
  },
  openTerminalPath: async (path: string): Promise<string> => {
    return (await Call.ByName('changeme/services.VaultService.OpenTerminalPath', path)) as string;
  },
  switchWorkspace: async (path: string): Promise<VaultScanResult> => {
    return (await Call.ByName('changeme/services.VaultService.SwitchWorkspace', path)) as VaultScanResult;
  },
  closeWorkspace: async (path: string): Promise<VaultScanResult> => {
    return (await Call.ByName('changeme/services.VaultService.CloseWorkspace', path)) as VaultScanResult;
  },
  deleteWorkspace: async (path: string): Promise<VaultScanResult> => {
    return (await Call.ByName('changeme/services.VaultService.DeleteWorkspace', path)) as VaultScanResult;
  },
  saveChapter: async (bookPath: string, fileName: string, content: string): Promise<void> => {
    await Call.ByName('changeme/services.VaultService.SaveChapter', bookPath, fileName, content);
  },
  createChapter: async (bookPath: string, title: string): Promise<string> => {
    return (await Call.ByName('changeme/services.VaultService.CreateChapter', bookPath, title)) as string;
  },
  deleteChapter: async (bookPath: string, fileName: string): Promise<void> => {
    await Call.ByName('changeme/services.VaultService.DeleteChapter', bookPath, fileName);
  },
  reorderChapters: async (bookPath: string, fileNames: string[]): Promise<void> => {
    await Call.ByName('changeme/services.VaultService.ReorderChapters', bookPath, fileNames);
  },
  createSubpage: async (bookPath: string, initialTitle: string): Promise<any> => {
    return await Call.ByName('changeme/services.VaultService.CreateSubpage', bookPath, initialTitle);
  },
  saveSubpage: async (bookPath: string, subpageID: string, content: string): Promise<void> => {
    await Call.ByName('changeme/services.VaultService.SaveSubpage', bookPath, subpageID, content);
  },
  getSubpage: async (bookPath: string, subpageID: string): Promise<any> => {
    return await Call.ByName('changeme/services.VaultService.GetSubpage', bookPath, subpageID);
  },
  deleteSubpage: async (bookPath: string, subpageID: string): Promise<void> => {
    await Call.ByName('changeme/services.VaultService.DeleteSubpage', bookPath, subpageID);
  },
  scanOrphanSubpages: async (bookPath: string): Promise<any[]> => {
    return (await Call.ByName('changeme/services.VaultService.ScanOrphanSubpages', bookPath)) as any[];
  },
  scanWorkspaceOrphans: async (): Promise<any[]> => {
    return (await Call.ByName('changeme/services.VaultService.ScanWorkspaceOrphans')) as any[];
  },
  createBook: async (
    title: string,
    desc: string,
    tags: string,
    preset: string,
    showTitleOnCover: boolean,
    coverDataUri: string
  ): Promise<string> => {
    return (await Call.ByName(
      'changeme/services.VaultService.CreateBook',
      title,
      desc,
      tags,
      preset,
      showTitleOnCover,
      coverDataUri
    )) as string;
  },
  updateBookMeta: async (bookPath: string, meta: BookMeta): Promise<void> => {
    await Call.ByName('changeme/services.VaultService.UpdateBookMeta', bookPath, meta);
  },
  deleteBook: async (bookPath: string): Promise<void> => {
    await Call.ByName('changeme/services.VaultService.DeleteBook', bookPath);
  },
  saveQuestions: async (bookPath: string, questionsJson: string): Promise<void> => {
    await Call.ByName('changeme/services.VaultService.SaveQuestions', bookPath, questionsJson);
  },
  saveVisual: async (bookPath: string, fileName: string, content: string): Promise<void> => {
    await Call.ByName('changeme/services.VaultService.SaveVisual', bookPath, fileName, content);
  },
  deleteVisual: async (bookPath: string, fileName: string): Promise<void> => {
    await Call.ByName('changeme/services.VaultService.DeleteVisual', bookPath, fileName);
  },
  exportVaultZip: async (): Promise<string> => {
    return (await Call.ByName('changeme/services.VaultService.ExportVaultZip')) as string;
  },
};
