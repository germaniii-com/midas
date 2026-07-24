import { useParams } from 'react-router-dom';
import CashFlowChart from './components/CashFlowChart';
import SpendingBreakdownChart from './components/SpendingBreakdownChart';
import PayeeAnalysisChart from './components/PayeeAnalysisChart';
import ForecastingChart from './components/ForecastingChart';
import TopAccounts from './components/TopAccounts';

export default function ReportsPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Reports</h1>

      <h2 className="text-lg font-semibold mb-3">Account Trends</h2>

      <TopAccounts />

      <div className="flex flex-col gap-6">
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
          <h2 className="text-lg font-semibold mb-1">Cash Flow Trends</h2>
          <p className="text-xs text-app-muted mb-3">Income vs. expenses over time</p>
          <CashFlowChart />
        </div>

        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
          <h2 className="text-lg font-semibold mb-1">Spending Breakdown</h2>
          <p className="text-xs text-app-muted mb-3">Proportional spending by category</p>
          <SpendingBreakdownChart />
        </div>

        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
          <h2 className="text-lg font-semibold mb-1">Payee Analysis</h2>
          <p className="text-xs text-app-muted mb-3">Where your money goes most</p>
          <PayeeAnalysisChart />
        </div>

        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
          <h2 className="text-lg font-semibold mb-1">Forecasting</h2>
          <p className="text-xs text-app-muted mb-3">Projected balance with scheduled payments</p>
          <ForecastingChart />
        </div>
      </div>
    </div>
  );
}
