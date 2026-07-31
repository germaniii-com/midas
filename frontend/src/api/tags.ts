import { callApi, callApiVoid } from './transport';

export interface Tag {
  id: string;
  binderId: string;
  name: string;
  color: string | null;
  createdAt: string | null;
}

export interface CreateTagData {
  name: string;
  color?: string;
}

export interface UpdateTagData {
  name?: string;
  color?: string;
}

export function getTags(binderId: string): Promise<Tag[]> {
  return callApi('getTags', `/api/binders/${binderId}/tags`, undefined, binderId);
}

export function getTag(binderId: string, tagId: string): Promise<Tag> {
  return callApi('getTag', `/api/binders/${binderId}/tags/${tagId}`, undefined, binderId, tagId);
}

export function createTag(binderId: string, data: CreateTagData): Promise<Tag> {
  return callApi(
    'createTag',
    `/api/binders/${binderId}/tags/create`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    binderId,
    data,
  );
}

export function updateTag(binderId: string, tagId: string, data: UpdateTagData): Promise<Tag> {
  return callApi(
    'updateTag',
    `/api/binders/${binderId}/tags/${tagId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    binderId,
    tagId,
    data,
  );
}

export function deleteTag(binderId: string, tagId: string): Promise<void> {
  return callApiVoid(
    'deleteTag',
    `/api/binders/${binderId}/tags/${tagId}`,
    { method: 'DELETE' },
    binderId,
    tagId,
  );
}
