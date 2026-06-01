import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input } from '@heroui/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { createCategory } from '../../../api/categories';

export default function CreateCategoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!id) return;
    setSubmitting(true);
    setError('');
    try {
      await createCategory(id, { name: name.trim() });
      navigate(`/binders/${id}/categories`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  }

  const backPath = `/binders/${id}/categories`;

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

      <h1 className="text-2xl font-bold mb-6">New Category</h1>

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

        <Button
          color="primary"
          onPress={handleSubmit}
          isLoading={submitting}
          className="mt-2"
        >
          Create Category
        </Button>
      </div>
    </div>
  );
}
