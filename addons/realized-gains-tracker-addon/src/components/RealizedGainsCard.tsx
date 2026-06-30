import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AddonContext, ActivityDetails } from '@wealthfolio/addon-sdk';
import { Card, CardContent, CardHeader, CardTitle } from '@wealthfolio/ui';
import { calculateRealizedGainsByYear } from '../utils/gainCalculations';

interface Props {
  ctx: AddonContext;
}

const COLOR_GAIN = 'hsl(142 71% 45%)';
const COLOR_LOSS = 'hsl(0 72% 51%)';

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const formatted =
    abs >= 1_000_000
      ? `${(abs / 1_000_000).toFixed(2)}M`
      : abs >= 1_000
        ? `${(abs / 1_000).toFixed(1)}k`
        : abs.toFixed(2);
  return value < 0 ? `-${formatted}` : formatted;
}

export function RealizedGainsCard({ ctx }: Props) {
  const {
    data: activities = [],
    isLoading,
    isError,
  } = useQuery<ActivityDetails[]>({
    queryKey: ['activities'],
    queryFn: () => ctx.api.activities.getAll(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const chartData = React.useMemo(
    () => calculateRealizedGainsByYear(activities),
    [activities],
  );

  const hasData = chartData.length > 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Realized Gains by Year</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
            Loading activities…
          </div>
        )}
        {isError && (
          <div className="flex h-64 items-center justify-center text-destructive text-sm">
            Failed to load activities.
          </div>
        )}
        {!isLoading && !isError && !hasData && (
          <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
            No realized gains data found. Add BUY and SELL activities to see results.
          </div>
        )}
        {!isLoading && !isError && hasData && (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 16, left: 16, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <Tooltip
                formatter={(value: number | undefined) => [
                  formatCurrency(value ?? 0),
                  'Realized Gain',
                ]}
                labelFormatter={(label) => `Year: ${label}`}
              />
              <Bar dataKey="gain" radius={[4, 4, 0, 0]} maxBarSize={64}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.year}
                    fill={entry.gain >= 0 ? COLOR_GAIN : COLOR_LOSS}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
