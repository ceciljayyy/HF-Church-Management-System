'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartAxis, chartColors, EmptyChart, tooltipStyle } from './chart-theme';

export type FinanceTrendPoint = {
  label: string;
  amount: number;
};

export function FinanceTrendChart({ data }: { data: FinanceTrendPoint[] }) {
  if (!data.length) return <div className="h-[300px]"><EmptyChart message="No finance trend data yet." /></div>;

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <XAxis dataKey="label" stroke={chartColors.muted} tick={chartAxis} tickLine={false} />
          <YAxis stroke={chartColors.muted} tick={chartAxis} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: chartColors.lime, strokeOpacity: 0.25 }} />
          <Line type="monotone" dataKey="amount" name="Contributions" stroke={chartColors.lime} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
