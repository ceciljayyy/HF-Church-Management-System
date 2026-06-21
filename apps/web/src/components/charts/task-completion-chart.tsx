'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { chartColors, EmptyChart, tooltipStyle } from './chart-theme';

export type TaskCompletionPoint = {
  name: string;
  value: number;
};

const colors = [chartColors.green, chartColors.warning, chartColors.danger, chartColors.info];

export function TaskCompletionChart({ data }: { data: TaskCompletionPoint[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (!data.length || total === 0) return <div className="h-[260px]"><EmptyChart message="No task or action status data yet." /></div>;

  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="48%" outerRadius="82%" paddingAngle={4}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2 text-xs text-secondary">
        {data.map((item, index) => (
          <div key={item.name} className="flex min-w-0 items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
            <span className="truncate">{item.name}: {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
