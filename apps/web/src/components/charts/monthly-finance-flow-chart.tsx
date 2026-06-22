'use client';

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartAxis, chartColors, EmptyChart, tooltipStyle } from './chart-theme';

export type MonthlyFinanceFlowPoint = {
  label: string;
  welfareCollected: number;
  fundContributions: number;
  expenses: number;
  netBalance: number;
};

export function MonthlyFinanceFlowChart({ data }: { data: MonthlyFinanceFlowPoint[] }) {
  if (!data.length) return <div className="h-[300px]"><EmptyChart message="No finance flow data yet." /></div>;

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <XAxis dataKey="label" stroke={chartColors.muted} tick={chartAxis} tickLine={false} />
          <YAxis stroke={chartColors.muted} tick={chartAxis} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgb(var(--color-hover) / 0.45)' }} />
          <Legend wrapperStyle={{ color: chartColors.axis, fontSize: 12 }} />
          <Bar dataKey="welfareCollected" name="Welfare" fill={chartColors.lime} radius={[8, 8, 0, 0]} />
          <Bar dataKey="fundContributions" name="Funds" fill={chartColors.green} radius={[8, 8, 0, 0]} />
          <Bar dataKey="expenses" name="Expenses" fill={chartColors.danger} radius={[8, 8, 0, 0]} />
          <Line type="monotone" dataKey="netBalance" name="Net Balance" stroke={chartColors.warning} strokeWidth={3} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
