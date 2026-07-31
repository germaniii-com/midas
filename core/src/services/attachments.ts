import { eq, and } from 'drizzle-orm';
import sharp from 'sharp';
import { db } from '../db/index.js';
import { transactionAttachments } from '../db/schema.js';
import { storage } from '../storage/index.js';

export interface Attachment {
  id: string;
  transactionId: string;
  binderId: string;
  fileName: string;
  objectName: string;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string | null;
}

export interface AttachmentListItem {
  id: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string | null;
}

export async function listAttachments(
  binderId: string,
  transactionId: string,
): Promise<AttachmentListItem[]> {
  return db
    .select({
      id: transactionAttachments.id,
      fileName: transactionAttachments.fileName,
      mimeType: transactionAttachments.mimeType,
      fileSize: transactionAttachments.fileSize,
      createdAt: transactionAttachments.createdAt,
    })
    .from(transactionAttachments)
    .where(eq(transactionAttachments.transactionId, transactionId))
    .orderBy(transactionAttachments.createdAt);
}

export async function getAttachment(
  transactionId: string,
  attachmentId: string,
): Promise<Attachment | null> {
  const [attachment] = await db
    .select()
    .from(transactionAttachments)
    .where(
      and(
        eq(transactionAttachments.id, attachmentId),
        eq(transactionAttachments.transactionId, transactionId),
      ),
    )
    .limit(1);
  return attachment ?? null;
}

export async function uploadAttachment(
  binderId: string,
  transactionId: string,
  file: { buffer: Buffer; fileName: string; mimeType: string },
): Promise<Attachment> {
  let { buffer, mimeType } = file;
  const { fileName } = file;

  const ext = fileName.includes('.') ? '.' + fileName.split('.').pop()!.toLowerCase() : '';
  const isImage = mimeType.startsWith('image/') && mimeType !== 'image/gif';

  if (isImage) {
    buffer = Buffer.from(await sharp(buffer).webp({ quality: 80 }).toBuffer());
    mimeType = 'image/webp';
  }

  const id = crypto.randomUUID();
  const extension = isImage ? '.webp' : ext;
  const objectName = storage.generateObjectName(binderId, transactionId, id, extension);
  await storage.uploadFile(objectName, buffer, mimeType);

  const [attachment] = await db
    .insert(transactionAttachments)
    .values({
      id,
      transactionId,
      binderId,
      fileName,
      objectName,
      mimeType,
      fileSize: buffer.length,
    })
    .returning();

  return attachment;
}

export async function getAttachmentFile(
  attachmentId: string,
): Promise<{ buffer: Buffer; mimeType: string; fileName: string } | null> {
  const [attachment] = await db
    .select()
    .from(transactionAttachments)
    .where(eq(transactionAttachments.id, attachmentId))
    .limit(1);
  if (!attachment) return null;

  const buffer = await storage.getFile(attachment.objectName);
  return {
    buffer,
    mimeType: attachment.mimeType || 'application/octet-stream',
    fileName: attachment.fileName,
  };
}

export async function getAttachmentThumbnail(
  attachmentId: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const [attachment] = await db
    .select()
    .from(transactionAttachments)
    .where(eq(transactionAttachments.id, attachmentId))
    .limit(1);
  if (!attachment) return null;

  const isImage = attachment.mimeType?.startsWith('image/');
  if (!isImage) return null;

  const buffer = await storage.getFile(attachment.objectName);
  const thumbnail = Buffer.from(await sharp(buffer).resize(120).webp({ quality: 70 }).toBuffer());
  return { buffer: thumbnail, mimeType: 'image/webp' };
}

export async function deleteAttachment(transactionId: string, attachmentId: string): Promise<void> {
  const [attachment] = await db
    .select()
    .from(transactionAttachments)
    .where(
      and(
        eq(transactionAttachments.id, attachmentId),
        eq(transactionAttachments.transactionId, transactionId),
      ),
    )
    .limit(1);
  if (!attachment) throw new Error('Attachment not found');

  await storage.deleteFile(attachment.objectName);
  await db.delete(transactionAttachments).where(eq(transactionAttachments.id, attachmentId));
}
