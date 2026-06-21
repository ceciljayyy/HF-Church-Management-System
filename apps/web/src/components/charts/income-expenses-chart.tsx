'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartAxis, chartColors, EmptyChart, tooltipStyle } from './chart-theme';

export type IncomeExpensesPoint = {
  label: string;
  income: number;
  expenses: number;
};

export function IncomeExpensesChart({ data }: { data: IncomeExpensesPoint[] }) {
  if (!data.length) return <div className="h-[300px]"><EmptyChart message="No income and expenses data yet." /></div>;

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <XAxis dataKey="label" stroke={chartColors.muted} tick={chartAxis} tickLine={false} />
          <YAxis stroke={chartColors.muted} tick={chartAxis} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgb(var(--color-hover) / 0.45)' }} />
          <Legend wrapperStyle={{ color: chartColors.axis, fontSize: 12 }} />
          <Bar dataKey="income" name="Income" fill={chartColors.green} radius={[8, 8, 0, 0]} />
          <Bar dataKey="expenses" name="Expenses" fill={chartColors.danger} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
