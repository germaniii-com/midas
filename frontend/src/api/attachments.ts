import { callApi, callApiVoid, uploadFile, isElectron, arrayBufferToBase64 } from './transport';
import { getApiUrl, getServerPassword } from './serverConfig';

export interface TransactionAttachment {
  id: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string | null;
}

export interface AttachmentFile {
  buffer: ArrayBuffer;
  mimeType: string;
  fileName: string;
}

export function getAttachments(
  binderId: string,
  transactionId: string,
): Promise<TransactionAttachment[]> {
  return callApi(
    'getAttachments',
    `/api/binders/${binderId}/transactions/${transactionId}/attachments`,
    undefined,
    binderId,
    transactionId,
  );
}

export function uploadAttachment(
  binderId: string,
  transactionId: string,
  file: File,
): Promise<TransactionAttachment> {
  return uploadFile(
    'uploadAttachment',
    `/api/binders/${binderId}/transactions/${transactionId}/attachments`,
    file,
    binderId,
    transactionId,
  );
}

async function getAttachmentFileData(attachmentId: string): Promise<AttachmentFile | null> {
  return callApi('getAttachmentFile', '', undefined, attachmentId);
}

export async function getAttachmentPreviewUrl(
  binderId: string,
  transactionId: string,
  attachmentId: string,
): Promise<string> {
  if (isElectron()) {
    const file = await getAttachmentFileData(attachmentId);
    if (!file) throw new Error('Attachment not found');
    return arrayBufferToBase64(file.buffer, file.mimeType);
  }
  const pw = getServerPassword();
  const auth = pw ? `&auth=${encodeURIComponent(pw)}` : '';
  return `${getApiUrl()}/api/binders/${binderId}/transactions/${transactionId}/attachments/${attachmentId}?preview=true${auth}`;
}

export async function getAttachmentThumbnailUrl(
  binderId: string,
  transactionId: string,
  attachmentId: string,
): Promise<string> {
  if (isElectron()) {
    const file = await getAttachmentFileData(attachmentId);
    if (!file) throw new Error('Attachment not found');
    return arrayBufferToBase64(file.buffer, file.mimeType);
  }
  const pw = getServerPassword();
  const auth = pw ? `?auth=${encodeURIComponent(pw)}` : '';
  return `${getApiUrl()}/api/binders/${binderId}/transactions/${transactionId}/attachments/${attachmentId}/thumbnail${auth}`;
}

export function deleteAttachment(
  binderId: string,
  transactionId: string,
  attachmentId: string,
): Promise<void> {
  return callApiVoid(
    'deleteAttachment',
    `/api/binders/${binderId}/transactions/${transactionId}/attachments/${attachmentId}`,
    { method: 'DELETE' },
    binderId,
    transactionId,
    attachmentId,
  );
}
