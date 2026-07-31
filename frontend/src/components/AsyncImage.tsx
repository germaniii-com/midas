import { useCallback } from 'react';
import { useEffect, useState } from 'react';
import { getAttachmentPreviewUrl, getAttachmentThumbnailUrl } from '../api/attachments';

interface AsyncImageProps {
  getSrc: () => Promise<string>;
  alt: string;
  className?: string;
  onClick?: () => void;
  placeholderClassName?: string;
}

export function AsyncImage({
  getSrc,
  alt,
  className,
  onClick,
  placeholderClassName,
}: AsyncImageProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSrc()
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setSrc('');
      });
    return () => {
      active = false;
    };
  }, [getSrc]);

  if (src === null) {
    return <div className={placeholderClassName || className} />;
  }

  if (src === '') {
    return null;
  }

  return <img src={src} alt={alt} className={className} onClick={onClick} />;
}

interface AttachmentImageProps {
  binderId: string;
  transactionId: string;
  attachmentId: string;
  kind?: 'thumbnail' | 'preview';
  alt: string;
  className?: string;
  onClick?: () => void;
  placeholderClassName?: string;
}

export function AttachmentImage({
  binderId,
  transactionId,
  attachmentId,
  kind = 'thumbnail',
  alt,
  className,
  onClick,
  placeholderClassName,
}: AttachmentImageProps) {
  const getSrc = useCallback(() => {
    if (kind === 'preview') {
      return getAttachmentPreviewUrl(binderId, transactionId, attachmentId);
    }
    return getAttachmentThumbnailUrl(binderId, transactionId, attachmentId);
  }, [binderId, transactionId, attachmentId, kind]);

  return (
    <AsyncImage
      getSrc={getSrc}
      alt={alt}
      className={className}
      onClick={onClick}
      placeholderClassName={placeholderClassName}
    />
  );
}
