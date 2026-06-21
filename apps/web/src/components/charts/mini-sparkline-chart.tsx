'use client';

import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { chartColors } from './chart-theme';

export type SparklinePoint = {
  label: string;
  value: number;
};

export function MiniSparklineChart({
  data,
  color = chartColors.lime,
}: {
  data: SparklinePoint[];
  color?: string;
}) {
  if (!data.length) return null;

  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
