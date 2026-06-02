import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, Spinner } from '@heroui/react';
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getCategory, updateCategory, deleteCategory } from '../../../api/categories';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';
import { toastSuccess, toastError, getErrorMessage } from '../../../utils/toast';

export default function EditCategoryPage() {
  const { id, categoryId } = useParams<{ id: string; categoryId: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (!id || !categoryId) return;
    setLoading(true);
    getCategory(id, categoryId)
      .then((category) => {
        setName(category.name);
      })
      .catch(() => {
        navigate(`/binders/${id}/categories`);
      })
      .finally(() => setLoading(false));
  }, [id, categoryId]);

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!id || !categoryId) return;
    setSaving(true);
    setError('');
    try {
      await updateCategory(id, categoryId, { name: name.trim() });
      toastSuccess('Category updated successfully');
      navigate(`/binders/${id}/categories`);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to update category');
      toastError(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id || !categoryId) return;
    setDeleting(true);
    setError('');
    try {
      await deleteCategory(id, categoryId);
      toastSuccess('Category deleted successfully');
      navigate(`/binders/${id}/categories`);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to delete category');
      toastError(message);
      setError(message);
      setDeleting(false);
    }
  }

  const backPath = `/binders/${id}/categories`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <Button
        variant="light"
        onPress={() => navigate(backPath)}
        startContent={<ArrowLeftIcon width={18} />}
        className="mb-6"
      >
        Back to Categories
      </Button>

      <h1 className="text-2xl font-bold mb-6">Edit Category</h1>

      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          placeholder="e.g. Bills"
          value={name}
          onValueChange={(v) => {
            setName(v);
            setError('');
          }}
          isRequired
          isInvalid={!!error && !name.trim()}
        />

        {error && <p className="text-danger text-sm">{error}</p>}

        <div className="flex gap-3 mt-2">
          <Button
            color="primary"
            onPress={handleSave}
            isLoading={saving}
            className="flex-1"
          >
            Save Changes
          </Button>
          <Button
            color="danger"
            variant="flat"
            onPress={() => setDeleteModalOpen(true)}
            startContent={<TrashIcon width={18} />}
          >
            Delete
          </Button>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        isLoading={deleting}
        title="Delete Category"
      >
        <p>Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.</p>
      </DeleteConfirmModal>
    </div>
  );
}
