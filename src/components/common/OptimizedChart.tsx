'use client';

import React, { memo, useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Line, LineChart, Area, AreaChart, Pie, PieChart, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartData {
  [key: string]: any;
}

interface OptimizedChartProps {
  type: 'bar' | 'line' | 'area' | 'pie';
  data: ChartData[];
  title?: string;
  loading?: boolean;
  height?: number;
  xAxisKey?: string;
  yAxisKey?: string;
  colors?: string[];
  className?: string;
}

const DEFAULT_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00',
  '#0088fe', '#00c49f', '#ffbb28', '#ff8042', '#8dd1e1'
];

const ChartSkeleton = memo(({ height = 300 }: { height?: number }) => (
  <div className="space-y-3">
    <Skeleton className="h-4 w-32" />
    <Skeleton className={`w-full`} style={{ height }} />
  </div>
));

const OptimizedChart = memo<OptimizedChartProps>(({ 
  type, 
  data, 
  title, 
  loading = false, 
  height = 300, 
  xAxisKey = 'name', 
  yAxisKey = 'value',
  colors = DEFAULT_COLORS,
  className = ''
}) => {
  const chartComponent = useMemo(() => {
    if (loading || !data?.length) {
      return <ChartSkeleton height={height} />;
    }

    const commonProps = {
      data,
      height,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yAxisKey} fill={colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={yAxisKey} stroke={colors[0]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey={yAxisKey} stroke={colors[0]} fill={colors[0]} fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey={yAxisKey}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return <div>Unsupported chart type</div>;
    }
  }, [type, data, loading, height, xAxisKey, yAxisKey, colors]);

  if (title) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {chartComponent}
        </CardContent>
      </Card>
    );
  }

  return <div className={className}>{chartComponent}</div>;
});

OptimizedChart.displayName = 'OptimizedChart';

export default OptimizedChart;
export { ChartSkeleton };
export type { OptimizedChartProps, ChartData };