'use client';

/**
 * Workload Distribution Chart Component
 *
 * Displays a stacked bar chart showing RACI role assignments per team member.
 * Uses Recharts for visualization with color-coded bars matching the RACI color scheme:
 * - R (Responsible): Blue (#3b82f6)
 * - A (Accountable): Green (#22c55e)
 * - C (Consulted): Yellow (#eab308)
 * - I (Informed): Purple (#a855f7)
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { MemberWorkloadDistribution } from '@/types/analytics';

interface WorkloadDistributionChartProps {
  data: MemberWorkloadDistribution[];
}

export function WorkloadDistributionChart({ data }: WorkloadDistributionChartProps) {
  // Transform data for Recharts
  const chartData = data.map((m) => ({
    name: m.memberName,
    R: m.responsible,
    A: m.accountable,
    C: m.consulted,
    I: m.informed,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workload Distribution</CardTitle>
        <CardDescription>RACI role assignments per team member</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '8px',
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="square"
            />
            <Bar
              dataKey="R"
              stackId="a"
              fill="#3b82f6"
              name="Responsible"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="A"
              stackId="a"
              fill="#22c55e"
              name="Accountable"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="C"
              stackId="a"
              fill="#eab308"
              name="Consulted"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="I"
              stackId="a"
              fill="#a855f7"
              name="Informed"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
