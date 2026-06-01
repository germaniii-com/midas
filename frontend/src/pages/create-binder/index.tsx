import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select, SelectItem } from '@heroui/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { createBinder } from '../../api/binders';

const currencies = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'MXN', label: 'MXN - Mexican Peso' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'PHP', label: 'PHP - Philippine Peso' },
  { value: 'ARS', label: 'ARS - Argentine Peso' },
  { value: 'COP', label: 'COP - Colombian Peso' },
  { value: 'BRL', label: 'BRL - Brazilian Real' },
  { value: 'CLP', label: 'CLP - Chilean Peso' },
];

export default function CreateBinder() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await createBinder({
        name: name.trim(),
        password,
        currency: currency || 'USD',
        description: description.trim() || undefined,
      });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create binder');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 sm:px-6">
      <Button
        variant="light"
        onPress={() => navigate('/')}
        startContent={<ArrowLeftIcon width={18} />}
        className="mb-6"
      >
        Back
      </Button>

      <h1 className="text-2xl font-bold mb-6">
        New Binder
      </h1>

      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          placeholder="e.g. Personal"
          value={name}
          onValueChange={(v) => {
            setName(v);
            setError('');
          }}
          isRequired
          isInvalid={!!error && !name.trim()}
        />
        <Input
          label="Password"
          type="password"
          placeholder="Choose a password"
          value={password}
          onValueChange={(v) => {
            setPassword(v);
            setError('');
          }}
          isRequired
          isInvalid={!!error && !password.trim()}
        />
        <Select
          label="Currency"
          selectedKeys={[currency]}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0];
            if (val) setCurrency(String(val));
          }}
        >
          {currencies.map((c) => (
            <SelectItem key={c.value}>{c.label}</SelectItem>
          ))}
        </Select>
        <Input
          label="Description (optional)"
          placeholder="What is this binder for?"
          value={description}
          onValueChange={setDescription}
        />
        {error && (
          <p className="text-danger text-sm">{error}</p>
        )}
        <Button
          color="primary"
          onPress={handleSubmit}
          isLoading={submitting}
          className="mt-2"
        >
          Create
        </Button>
      </div>
    </div>
  );
}
