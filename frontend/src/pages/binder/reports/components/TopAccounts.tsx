import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardBody } from '@heroui/react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { getAccounts, type Account } from '../../../../api/accounts';
import { getAccountTrends, type AccountTrendSeries } from '../../../../api/reports';
import { useBinderCurrency } from '../../../../utils/format';
import { usePreferences } from '../../../../hooks/usePreferences';
import { Money } from '../../../../components/Money';
import { useChartColors } from '../../../../hooks/useChartColors';

export default function TopAccounts() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currency = useBinderCurrency();
  const { numberLocale } = usePreferences();
  const chartColors = useChartColors();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trends, setTrends] = useState<AccountTrendSeries[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getAccounts(id),
      getAccountTrends(id, {
        interval: 'monthly',
      }),
    ])
      .then(([accts, trendData]) => {
        setAccounts(accts.accounts);
        setTrends(trendData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return null;
  if (accounts.length === 0) return null;

  const sorted = [...accounts].sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));
  const top3 = sorted.slice(0, 3);

  const typeLabels: Record<string, string> = {
    checking: 'Checking',
    savings: 'Savings',
    credit: 'Credit Card',
    cash: 'Cash',
    investment: 'Investment',
    loan: 'Loan',
    other: 'Other',
  };

  function getSeries(accountId: string) {
    return trends.find((s) => s.accountId === accountId);
  }

  return (
    <div className="mb-6">
      <div className="grid grid-cols-3 gap-3">
        {top3.map((account, i) => {
          const balanceNum = parseFloat(account.balance);
          const series = getSeries(account.id);
          const chartData = series?.series?.map((p) => ({ date: p.date, balance: p.balance })) ?? [];
          return (
            <Card key={account.id} className="bg-surface-secondary">
              <CardBody className="flex flex-col p-0">
                <div className="h-24 w-full">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <Line
                          type="monotone"
                          dataKey="balance"
                          stroke={chartColors[i % chartColors.length]}
                          strokeWidth={2}
                          dot={false}
                        />
                        <defs>
                          <linearGradient id={`topGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={chartColors[i % chartColors.length]} stopOpacity={0.15} />
                            <stop offset="100%" stopColor={chartColors[i % chartColors.length]} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-xs text-app-muted">No data</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col px-4 pb-4 pt-2">
                  <p className="text-sm font-medium truncate">{account.name}</p>
                  <p
                    className={`text-lg font-semibold ${balanceNum >= 0 ? 'text-success' : 'text-danger'}`}
                  >
                    <Money amount={balanceNum} currency={currency} locale={numberLocale} />
                  </p>
                  <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary self-start">
                    {typeLabels[account.type] || account.type}
                  </span>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
      <button
        onClick={() => navigate(`/binders/${id}/reports/account-trends`)}
        className="flex items-center justify-center w-full mt-3 py-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors active:scale-[0.98]"
      >
        Show All Account Trends &rarr;
      </button>
    </div>
  );
}
