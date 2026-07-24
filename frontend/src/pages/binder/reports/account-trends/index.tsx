import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, Button, Input, Select, SelectItem } from '@heroui/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getAccountTrends, type AccountTrendSeries } from '../../../../api/reports';
import { formatCurrency, useBinderCurrency } from '../../../../utils/format';
import { usePreferences } from '../../../../hooks/usePreferences';
import { getErrorMessage } from '../../../../utils/toast';
import { ErrorMessage } from '../../../../components/ErrorMessage';
import { useChartColors } from '../../../../hooks/useChartColors';

type ViewMode = 'unified' | 'grid';

const tooltipZStyle = `.recharts-tooltip-wrapper { z-index: 9999 !important; }`;

export default function AccountTrendsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currency = useBinderCurrency();
  const { numberLocale } = usePreferences();
  const chartColors = useChartColors();

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState('');
  const [interval, setInterval] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [viewMode, setViewMode] = useState<ViewMode>('unified');

  const [data, setData] = useState<AccountTrendSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hiddenAccounts, setHiddenAccounts] = useState<Set<string>>(new Set());

  async function fetchData() {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const result = await getAccountTrends(id, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        interval,
      });
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load account trends'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [id, startDate, endDate, interval]);

  const allDates = Array.from(
    new Set(data.flatMap((s) => s.series.map((p) => p.date))),
  ).sort();

  const chartData = allDates.map((date) => {
    const point: Record<string, string | number> = { date: formatLabel(date, interval) };
    for (const series of data) {
      const p = series.series.find((sp) => sp.date === date);
      point[series.accountName] = p?.balance ?? 0;
    }
    return point;
  });

  function formatLabel(dateStr: string, interval: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    if (interval === 'daily') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (interval === 'weekly') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  return (
    <div>
      <style>{tooltipZStyle}</style>
      <div className="flex items-center gap-3 mb-4">
        <Button
          isIconOnly
          variant="light"
          onPress={() => navigate(-1)}
          aria-label="Back"
        >
          <ArrowLeftIcon width={20} />
        </Button>
        <h1 className="text-2xl font-bold">Account Trends</h1>
      </div>

      <div className="flex items-end gap-2 mb-3 flex-wrap">
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
          label="Interval"
          selectedKeys={[interval]}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0];
            if (val) setInterval(String(val) as 'daily' | 'weekly' | 'monthly');
          }}
          className="w-28"
          size="sm"
        >
          <SelectItem key="daily">Daily</SelectItem>
          <SelectItem key="weekly">Weekly</SelectItem>
          <SelectItem key="monthly">Monthly</SelectItem>
        </Select>
        <Button
          size="sm"
          variant={viewMode === 'unified' ? 'solid' : 'flat'}
          color="primary"
          onPress={() => setViewMode('unified')}
        >
          Unified
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'grid' ? 'solid' : 'flat'}
          color="primary"
          onPress={() => setViewMode('grid')}
        >
          Grid
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchData} />
      ) : data.length === 0 ? (
        <p className="text-app-muted text-sm py-16 text-center">No account data for this period</p>
      ) : viewMode === 'unified' ? (
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v: number) => formatCurrency(v, currency, numberLocale)}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value) || 0, currency, numberLocale)}
              />
              <Legend
                onClick={(e) => {
                  const key = e.value ?? e.dataKey;
                  if (typeof key === 'string') {
                    setHiddenAccounts((prev) => {
                      const next = new Set(prev);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    });
                  }
                }}
                formatter={(value: string) => (
                  <span style={{ opacity: hiddenAccounts.has(value) ? 0.4 : 1 }}>
                    {value}
                  </span>
                )}
              />
              {data.map((series, i) => (
                <Line
                  key={series.accountId}
                  type="monotone"
                  dataKey={series.accountName}
                  stroke={chartColors[i % chartColors.length]}
                  strokeWidth={2}
                  dot={false}
                  name={series.accountName}
                  hide={hiddenAccounts.has(series.accountName)}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((series, i) => {
            const lastPoint = series.series[series.series.length - 1];
            const currentBalance = lastPoint?.balance ?? 0;
            const seriesChartData = series.series.map((p) => ({
              date: formatLabel(p.date, interval),
              balance: p.balance,
            }));
            return (
              <div
                key={series.accountId}
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--color-surface-secondary)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium truncate">{series.accountName}</p>
                  <span
                    className={`text-sm font-semibold ${currentBalance >= 0 ? 'text-success' : 'text-danger'}`}
                  >
                    {formatCurrency(currentBalance, currency, numberLocale)}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={seriesChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value) || 0, currency, numberLocale)}
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      stroke={chartColors[i % chartColors.length]}
                      strokeWidth={2}
                      dot={false}
                      name="Balance"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
