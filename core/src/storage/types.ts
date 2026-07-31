export interface StorageProvider {
  init(): Promise<void>;
  uploadFile(objectName: string, buffer: Buffer, mimeType: string): Promise<void>;
  getFile(objectName: string): Promise<Buffer>;
  deleteFile(objectName: string): Promise<void>;
  generateObjectName(binderId: string, transactionId: string, id: string, extension: string): string;
}
