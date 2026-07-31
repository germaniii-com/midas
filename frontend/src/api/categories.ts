import { callApi, callApiVoid } from './transport';

export interface Category {
  id: string;
  binderId: string;
  name: string;
  createdAt: string | null;
}

export interface CreateCategoryData {
  name: string;
}

export interface UpdateCategoryData {
  name?: string;
}

export function getCategories(binderId: string): Promise<Category[]> {
  return callApi('getCategories', `/api/binders/${binderId}/categories`, undefined, binderId);
}

export function getCategory(binderId: string, categoryId: string): Promise<Category> {
  return callApi(
    'getCategory',
    `/api/binders/${binderId}/categories/${categoryId}`,
    undefined,
    binderId,
    categoryId,
  );
}

export function createCategory(binderId: string, data: CreateCategoryData): Promise<Category> {
  return callApi(
    'createCategory',
    `/api/binders/${binderId}/categories/create`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    binderId,
    data,
  );
}

export function updateCategory(
  binderId: string,
  categoryId: string,
  data: UpdateCategoryData,
): Promise<Category> {
  return callApi(
    'updateCategory',
    `/api/binders/${binderId}/categories/${categoryId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    binderId,
    categoryId,
    data,
  );
}

export function deleteCategory(binderId: string, categoryId: string): Promise<void> {
  return callApiVoid(
    'deleteCategory',
    `/api/binders/${binderId}/categories/${categoryId}`,
    { method: 'DELETE' },
    binderId,
    categoryId,
  );
}
