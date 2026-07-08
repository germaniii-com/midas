import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spinner, Button, Input, Select, SelectItem } from '@heroui/react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getSpendingBreakdown, type SpendingRow } from '../../../../api/reports';
import { getTags, type Tag } from '../../../../api/tags';
import { formatCurrency, useBinderCurrency } from '../../../../utils/format';
import { getErrorMessage } from '../../../../utils/toast';
import { ErrorMessage } from '../../../../components/ErrorMessage';
import { useChartColors } from '../../../../hooks/useChartColors';

export default function SpendingBreakdownChart() {
  const { id } = useParams<{ id: string }>();
  const currency = useBinderCurrency();
  const chartColors = useChartColors();

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState('');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [groupBy, setGroupBy] = useState<'category' | 'tags'>('category');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [data, setData] = useState<SpendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getTags(id)
      .then(setTags)
      .catch(() => {});
  }, [id]);

  async function fetchData() {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const result = await getSpendingBreakdown(id, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        transactionType,
        groupBy,
        includeTagIds: selectedTagIds.length > 0 ? selectedTagIds.join(',') : undefined,
      });
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load spending breakdown'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [id, startDate, endDate, transactionType, groupBy, selectedTagIds]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  }

  return (
    <div>
      <div className="flex items-end gap-2 mb-3 flex-wrap">
        <Button
          size="sm"
          variant={transactionType === 'expense' ? 'solid' : 'flat'}
          color="danger"
          onPress={() => setTransactionType('expense')}
        >
          Expenses
        </Button>
        <Button
          size="sm"
          variant={transactionType === 'income' ? 'solid' : 'flat'}
          color="success"
          onPress={() => setTransactionType('income')}
        >
          Income
        </Button>
        <Button
          size="sm"
          variant={groupBy === 'category' ? 'solid' : 'flat'}
          color="primary"
          onPress={() => setGroupBy('category')}
        >
          Category
        </Button>
        <Button
          size="sm"
          variant={groupBy === 'tags' ? 'solid' : 'flat'}
          color="primary"
          onPress={() => setGroupBy('tags')}
        >
          Tags
        </Button>
        <Input
          label="Start"
          type="date"
          value={startDate}
          onValueChange={setStartDate}
          className="w-36"
          size="sm"
        />
        <Input
          label="End"
          type="date"
          value={endDate}
          onValueChange={setEndDate}
          className="w-36"
          size="sm"
        />
        <Select
          label="Tags"
          placeholder="All tags"
          selectionMode="multiple"
          selectedKeys={new Set(selectedTagIds)}
          onSelectionChange={(keys) =>
            setSelectedTagIds(Array.from(keys).map(String).filter(Boolean))
          }
          className="w-44"
          size="sm"
        >
          {tags.map((t) => (
            <SelectItem key={t.id} textValue={t.name}>
              <div className="flex items-center gap-2">
                {t.color && (
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                )}
                <span>{t.name}</span>
              </div>
            </SelectItem>
          ))}
        </Select>
      </div>
      {error ? (
        <ErrorMessage message={error} onRetry={fetchData} />
      ) : data.length === 0 ? (
        <p className="text-app-muted text-sm py-16 text-center">No data for this period</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="totalAmount"
              nameKey="categoryName"
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={50}
              label={({ name, percent }: { name?: string; percent?: number }) =>
                `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
              }
            >
              {data.map((_, i) => (
                <Cell key={i} fill={chartColors[i % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(Number(value) || 0, currency)}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
