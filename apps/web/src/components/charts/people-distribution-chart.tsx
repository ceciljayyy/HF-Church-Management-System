'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { chartColors, EmptyChart, tooltipStyle } from './chart-theme';

export type PeopleDistributionPoint = {
  name: string;
  value: number;
};

const colors = [chartColors.lime, chartColors.green, chartColors.info, chartColors.warning, chartColors.danger];

export function PeopleDistributionChart({ data }: { data: PeopleDistributionPoint[] }) {
  if (!data.length) return <div className="h-[300px]"><EmptyChart message="No people distribution data yet." /></div>;

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={3}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-secondary">
        {data.slice(0, 6).map((item, index) => (
          <div key={item.name} className="flex min-w-0 items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
            <span className="truncate">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
