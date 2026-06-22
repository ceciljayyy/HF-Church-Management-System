'use client';

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartAxis, chartColors, EmptyChart, tooltipStyle } from './chart-theme';

export type WeeklyAttendanceTrendPoint = {
  label: string;
  mainService: number;
  childrenService: number;
  total: number;
};

export function WeeklyAttendanceTrendChart({ data }: { data: WeeklyAttendanceTrendPoint[] }) {
  if (!data.length) return <div className="h-[300px]"><EmptyChart message="No attendance trend data yet." /></div>;

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <XAxis dataKey="label" stroke={chartColors.muted} tick={chartAxis} tickLine={false} />
          <YAxis stroke={chartColors.muted} tick={chartAxis} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: chartColors.lime, strokeOpacity: 0.25 }} />
          <Legend wrapperStyle={{ color: chartColors.axis, fontSize: 12 }} />
          <Area type="monotone" dataKey="mainService" name="Main Service" stroke={chartColors.green} fill="rgb(var(--color-green) / 0.12)" strokeWidth={2} />
          <Area type="monotone" dataKey="childrenService" name="Children Service" stroke={chartColors.info} fill="rgb(var(--color-info) / 0.12)" strokeWidth={2} />
          <Area type="monotone" dataKey="total" name="Total" stroke={chartColors.lime} fill="rgb(var(--color-lime) / 0.18)" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
