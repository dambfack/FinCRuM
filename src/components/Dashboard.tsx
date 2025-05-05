'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Users, TrendingUp } from 'lucide-react';
import type { FC } from 'react';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useEffect, useState } from 'react';
import type { ExcelData } from '@/lib/types';

interface DashboardStats {
  totalCustomers: number;
  newCustomersToday: number; // Keeping this, but might be hard to calculate accurately from basic import
  // Define more stats as needed
}

// Initial empty state
const initialStats: DashboardStats = {
  totalCustomers: 0,
  newCustomersToday: 0,
};

// Mock data for chart - replace with actual data later or generate from stats
const chartData = [
  { name: 'Jan', customers: 0 },
  { name: 'Feb', customers: 0 },
  { name: 'Mar', customers: 0 },
  { name: 'Apr', customers: 0 },
  { name: 'May', customers: 0 },
  { name: 'Jun', customers: 0 },
];

// No props needed now, stats are managed internally
const Dashboard: FC = () => {
    const [stats, setStats] = useState<DashboardStats>(initialStats);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch and calculate stats from localStorage on the client side
        setLoading(true);
         try {
            const storedData = localStorage.getItem('customerData');
            if (storedData) {
                const parsedData: ExcelData = JSON.parse(storedData);
                 if (parsedData && parsedData.rows) {
                     const totalCustomers = parsedData.rows.length;
                     // Note: Calculating "new customers today" accurately from a simple import is difficult.
                     // This requires tracking import dates or having a timestamp column in the data.
                     // For now, we'll keep it at 0 or implement a basic placeholder logic if needed.
                     setStats({
                         totalCustomers: totalCustomers,
                         newCustomersToday: 0, // Placeholder - needs better logic
                     });
                 } else {
                    setStats(initialStats); // Reset if data is invalid
                 }
            } else {
                setStats(initialStats); // Reset if no data found
            }
        } catch (error) {
            console.error("Error loading dashboard stats:", error);
            setStats(initialStats); // Reset on error
        } finally {
            setLoading(false);
        }

    }, []); // Empty dependency array ensures this runs once on mount

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Customers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {loading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{stats.totalCustomers}</div>}
            <p className="text-xs text-muted-foreground">
              Total number of customers in the system
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              New Customers Today
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">+{stats.newCustomersToday}</div>}
             <p className="text-xs text-muted-foreground">
               Customers added recently (placeholder)
             </p>
          </CardContent>
        </Card>
        {/* Add more stat cards as needed */}
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Data Source</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
              {loading ? <Skeleton className="h-8 w-24" /> : <div className="text-lg font-semibold">Local Storage</div>}
             <p className="text-xs text-muted-foreground">
               Currently using data stored locally.
             </p>
           </CardContent>
         </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Activity (Mock Data)</CardTitle>
           <CardDescription>This chart shows mock data for demonstration.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-[300px] w-full" /> : (
               <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={chartData}> {/* Use mock data for now */}
                  <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      color: 'hsl(var(--foreground))'
                     }}
                    cursor={{ fill: 'hsl(var(--accent) / 0.3)' }}
                  />
                  <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }}/>
                  <Bar dataKey="customers" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
