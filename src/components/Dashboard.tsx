
// src/components/Dashboard.tsx
'use client';

import React, { FC, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Users, TrendingUp, ListTodo, Calendar, Clock, Edit, Trash2, PlusCircle, UserPlus as UserPlusIcon, RefreshCw as RefreshCwIcon, PieChart as PieChartIcon } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { ExcelData, Contact, Task as TaskType, Reminder as ReminderType, Appointment as AppointmentType } from '@/lib/types';
import { DataItemType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useDataSync } from '@/hooks/use-data-sync';
import TaskList from './TaskList';
import AppointmentList from './AppointmentList';
import ReminderList from './ReminderList';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import TaskForm from './TaskForm';
import ReminderForm from './ReminderForm';
import AppointmentForm from './AppointmentForm';
import { getData, parseDate, formatDateTime, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { subMonths, startOfMonth, endOfMonth, format, eachMonthOfInterval } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface DashboardStats {
  totalCustomers: number;
  newCustomersToday: number;
  tasksPending: number;
  appointmentsToday: number;
}

const initialStats: DashboardStats = {
  totalCustomers: 0,
  newCustomersToday: 0,
  tasksPending: 0,
  appointmentsToday: 0,
};

const mockContacts: Contact[] = [
  { id: '1', firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', phone: '123-456-7890', company: 'Acme Corp', status: 'open', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com', phone: '987-654-3210', company: 'Beta LLC', status: 'closed', createdAt: subMonths(new Date(), 1).toISOString(), updatedAt: new Date().toISOString()  },
  { id: '3', firstName: 'Alice', lastName: 'Wonder', email: 'alice.wonder@example.com', phone: '555-123-4567', company: 'Gamma Inc', status: 'approached', createdAt: subMonths(new Date(), 2).toISOString(), updatedAt: new Date().toISOString() },
  { id: '4', firstName: 'Bob', lastName: 'Builder', email: 'bob.builder@example.com', phone: '555-987-6543', company: 'Delta Co', status: 'missed', createdAt: subMonths(new Date(), 3).toISOString(), updatedAt: new Date().toISOString() },
  { id: '5', firstName: 'Eve', lastName: 'Future', email: 'eve.future@example.com', phone: '555-456-7890', company: 'Epsilon Ltd', status: 'open', createdAt: subMonths(new Date(), 5).toISOString(), updatedAt: new Date().toISOString() },
];

type BarChartTimeRange = '1m' | '3m' | '6m' | '12m';

const PIE_CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];


const Dashboard: FC = () => {
    const [stats, setStats] = useState<DashboardStats>(initialStats);
    const { performSync, syncStatus, syncCalendar, initiateAuthentication, lastSyncTime, isGoogleDriveConnected } = useDataSync();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [allContacts, setAllContactsState] = useState<Contact[]>([]); // Renamed to avoid conflict with local var
    const [recentContacts, setRecentContacts] = useState<Contact[]>([]);
    
    const [barChartTimeRange, setBarChartTimeRange] = useState<BarChartTimeRange>('6m');
    const [customerGrowthChartData, setCustomerGrowthChartData] = useState<{ name: string; customers: number }[]>([]);
    const [dealStatusChartData, setDealStatusChartData] = useState<{ name: string; value: number }[]>([]);


    const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
    const [isReminderFormOpen, setIsReminderFormOpen] = useState(false);
    const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<TaskType | undefined>(undefined);
    const [editingReminder, setEditingReminder] = useState<ReminderType | undefined>(undefined);
    const [editingAppointment, setEditingAppointment] = useState<AppointmentType | undefined>(undefined);
    
    const isGoogleCalendarLinked = isGoogleDriveConnected;


    const loadDashboardData = useCallback(() => {
        setLoading(true);
        try {
            const customerDataStore = getData<Contact[]>(DataItemType.Contacts) || []; 
            const importedDataStore = getData<ExcelData>(DataItemType.CustomerData); 
            
            let loadedContacts: Contact[] = [...customerDataStore];

            if (importedDataStore && importedDataStore.rows) {
                const importedContactsAsContacts: Contact[] = importedDataStore.rows.map((row, index) => {
                    const h = importedDataStore.headers;
                    return {
                        id: `imported-${index}-${Date.now()}`,
                        firstName: row[h.indexOf('firstName')] || '',
                        lastName: row[h.indexOf('lastName')] || '',
                        email: row[h.indexOf('email')] || '',
                        phone: row[h.indexOf('phone')] || undefined,
                        company: row[h.indexOf('company')] || undefined,
                        status: (row[h.indexOf('status')] as Contact['status']) || 'other',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };
                });
                const combined = [...customerDataStore, ...importedContactsAsContacts];
                loadedContacts = Array.from(new Map(combined.map(c => [c.email, c])).values());
            }
            
            // If no data from store, use mock data for initial view
            if (loadedContacts.length === 0) {
                loadedContacts = mockContacts;
            }
            setAllContactsState(loadedContacts);


            const tasks = getData<TaskType[]>(DataItemType.Tasks) || [];
            const appointments = getData<AppointmentType[]>(DataItemType.Appointments) || [];
            const today = new Date().toISOString().split('T')[0];

            const newCustomersToday = loadedContacts.filter(c => {
                const createdAtDate = c.createdAt ? (parseDate(c.createdAt as string)?.toISOString().split('T')[0]) : null;
                return createdAtDate === today;
            }).length;

            setStats({
                totalCustomers: loadedContacts.length,
                newCustomersToday: newCustomersToday,
                tasksPending: tasks.filter(t => t.status !== 'done').length,
                appointmentsToday: appointments.filter(a => {
                     const apptDate = a.date ? (parseDate(a.date as string)?.toISOString().split('T')[0]) : null;
                     return apptDate === today;
                }).length,
            });

            setRecentContacts(loadedContacts.sort((a,b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()).slice(0, 5));

            // Calculate Customer Growth Chart Data
            const numMonths = parseInt(barChartTimeRange.replace('m', ''), 10);
            const endDate = new Date();
            const startDate = startOfMonth(subMonths(endDate, numMonths - 1));
            
            const monthsInterval = eachMonthOfInterval({ start: startDate, end: endDate });
            const customerCountsByMonth: Record<string, number> = {};

            monthsInterval.forEach(monthStart => {
                const monthKey = format(monthStart, 'MMM yyyy'); // Use 'MMM yyyy' for unique keys if > 12 months
                customerCountsByMonth[monthKey] = 0;
            });

            loadedContacts.forEach(contact => {
                const contactDate = parseDate(contact.createdAt as string);
                if (contactDate && contactDate >= startDate && contactDate <= endDate) {
                    const monthKey = format(startOfMonth(contactDate), 'MMM yyyy');
                    if (customerCountsByMonth.hasOwnProperty(monthKey)) {
                       customerCountsByMonth[monthKey]++;
                    }
                }
            });
            
            const growthChartData = monthsInterval.map(monthStart => {
                const monthKey = format(monthStart, 'MMM yyyy');
                const shortMonthKey = format(monthStart, 'MMM');
                return { name: shortMonthKey, customers: customerCountsByMonth[monthKey] || 0 };
            });
            setCustomerGrowthChartData(growthChartData);


            // Calculate Deal Status Pie Chart Data
            const statusCounts: Record<string, number> = {
                approached: 0, open: 0, closed: 0, missed: 0, other: 0,
            };
            loadedContacts.forEach(contact => {
                const status = contact.status || 'other';
                if (statusCounts.hasOwnProperty(status)) {
                    statusCounts[status]++;
                } else {
                    statusCounts.other++; 
                }
            });
            const pieData = Object.entries(statusCounts)
                .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
                .filter(item => item.value > 0); // Only show statuses with counts
            setDealStatusChartData(pieData);


        } catch (error) {
            console.error("Error loading dashboard data:", error);
            toast({ title: "Error", description: "Could not load dashboard data.", variant: "destructive" });
            setStats(initialStats);
            setRecentContacts(mockContacts.slice(0,5)); // Fallback to some mock
            setCustomerGrowthChartData([]);
            setDealStatusChartData([]);
        } finally {
            setLoading(false);
        }
    }, [toast, barChartTimeRange]); // Added barChartTimeRange as dependency

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]); // loadDashboardData itself depends on barChartTimeRange

    const handleGoogleCalendarAuth = useCallback(async () => {
      if (isGoogleCalendarLinked) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(DataItemType.GoogleDriveAccessToken);
          localStorage.removeItem(DataItemType.GoogleDriveRefreshToken);
          localStorage.removeItem('googleDriveTokenExpiry');
        }
        toast({ title: "Google Calendar Unlinked", description: "You may need to re-authenticate to use calendar features."});
      } else {
        try {
            await initiateAuthentication('googledrive'); 
        } catch(error) {
            toast({ title: "Google Calendar Auth Error", description: `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive"});
        }
      }
      loadDashboardData(); // Refresh data to update UI reflecting link status change
    }, [isGoogleCalendarLinked, initiateAuthentication, toast, loadDashboardData]);

    const refreshData = useCallback(() => {
        loadDashboardData();
        toast({ title: "Data Refreshed", description: "Dashboard data has been reloaded." });
    }, [loadDashboardData, toast]);

    const handleSaveTask = () => { setIsTaskFormOpen(false); setEditingTask(undefined); refreshData(); };
    const handleSaveReminder = () => { setIsReminderFormOpen(false); setEditingReminder(undefined); refreshData(); };
    const handleSaveAppointment = () => { setIsAppointmentFormOpen(false); setEditingAppointment(undefined); refreshData(); };

    const dialogContentClassName = "sm:max-w-[425px] glass-effect bg-card/80 dark:bg-card/70";


    return (
      <div className="space-y-6">
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h1 className="text-3xl font-bold font-heading tracking-wide">Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button onClick={handleGoogleCalendarAuth} size="sm" variant={isGoogleCalendarLinked ? 'outline' : 'default'} className="whitespace-nowrap h-11 px-4 py-3">
                <Calendar className="mr-2 h-4 w-4" />
                {isGoogleCalendarLinked ? 'Unlink Google Calendar' : 'Link Google Calendar'}
            </Button>
            <Button onClick={() => performSync()} size="sm" disabled={syncStatus === 'syncing'} className="whitespace-nowrap h-11 px-4 py-3">
                <RefreshCwIcon className={`mr-2 h-4 w-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                {syncStatus === 'syncing' ? 'Syncing...' : (lastSyncTime ? `Last Sync: ${formatDateTime(lastSyncTime).split(',')[0]}` : 'Sync Now')}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Total Customers", value: stats.totalCustomers, icon: Users, note: "All contacts" },
            { title: "New Today", value: `+${stats.newCustomersToday}`, icon: UserPlusIcon, note: "Customers added today" },
            { title: "Pending Tasks", value: stats.tasksPending, icon: ListTodo, note: "Tasks not yet completed" },
            { title: "Appointments Today", value: stats.appointmentsToday, icon: Calendar, note: "Scheduled for today" }
          ].map(stat => (
            <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium font-heading tracking-wide">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stat.value}</div>}
                <p className="text-xs text-muted-foreground">{stat.note}</p>
                </CardContent>
            </Card>
          ))}
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="font-heading tracking-wide">Customer Growth</CardTitle>
                <Select value={barChartTimeRange} onValueChange={(value: BarChartTimeRange) => setBarChartTimeRange(value)}>
                    <SelectTrigger className="w-full sm:w-[180px] h-9">
                        <SelectValue placeholder="Select time range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1m">Last 1 Month</SelectItem>
                        <SelectItem value="3m">Last 3 Months</SelectItem>
                        <SelectItem value="6m">Last 6 Months</SelectItem>
                        <SelectItem value="12m">Last 12 Months</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <CardDescription>Shows customers added each month for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[300px] w-full" /> : customerGrowthChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={customerGrowthChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
                    <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={{stroke: "hsl(var(--border))"}} />
                    <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={{stroke: "hsl(var(--border))"}} tickFormatter={(value) => `${value}`} allowDecimals={false}/>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--popover-foreground))',
                        borderRadius: 'var(--radius)',
                        boxShadow: 'var(--shadow-lg)'
                      }}
                      cursor={{ fill: 'hsl(var(--accent) / 0.2)' }}
                    />
                    <Legend wrapperStyle={{ color: 'hsl(var(--foreground))', paddingTop: '10px' }}/>
                    <Bar dataKey="customers" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-10">No customer data available for the selected period.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading tracking-wide">Client Deal Status</CardTitle>
            <CardDescription>Distribution of clients by their current deal status.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[300px] w-full" /> : dealStatusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                        <Pie
                            data={dealStatusChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                return (
                                <text x={x} y={y} fill="hsl(var(--popover-foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
                                    {`${(percent * 100).toFixed(0)}%`}
                                </text>
                                );
                            }}
                        >
                        {dealStatusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                        ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--popover))',
                                borderColor: 'hsl(var(--border))',
                                color: 'hsl(var(--popover-foreground))',
                                borderRadius: 'var(--radius)',
                                boxShadow: 'var(--shadow-lg)'
                            }}
                        />
                        <Legend wrapperStyle={{ color: 'hsl(var(--foreground))', paddingTop: '10px' }} />
                    </RechartsPieChart>
                </ResponsiveContainer>
             ) : <p className="text-sm text-muted-foreground text-center py-10">No deal status data available.</p>}
          </CardContent>
        </Card>
      </div>


      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2 font-heading tracking-wide">
            <Users className="h-5 w-5" />
            <span>Recent Contacts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : recentContacts.length > 0 ? (
            <ul className="space-y-2">
                {recentContacts.map((contact) => (
                <li key={contact.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                    <div>
                    <span className="font-medium">{contact.firstName} {contact.lastName}</span>
                    <p className="text-sm text-muted-foreground">{contact.email}</p>
                    </div>
                     <p className="text-xs text-muted-foreground">{formatDateTime(contact.createdAt as string).split(',')[0]}</p>
                </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No contacts found. <Link href="/import" className="text-accent underline hover:text-accent/80">Import data</Link> or <Link href="/add-customer" className="text-accent underline hover:text-accent/80">add a customer</Link>.</p>
          )}
           <div className="mt-6 pt-4 border-t border-border/20 flex justify-start">
            <Button asChild variant="outline" className="whitespace-normal h-11 px-4 py-3">
              <Link href="/add-customer">
                <UserPlusIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>Add New Customer</span>
              </Link>
            </Button>
          </div>
         </CardContent>
      </Card>

    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 font-heading tracking-wide">
            <ListTodo className="h-5 w-5" />
            <span>Tasks</span>
          </CardTitle>
           <Button variant="outline" onClick={() => { setEditingTask(undefined); setIsTaskFormOpen(true); }} className="w-full whitespace-normal text-center h-11 px-4 py-3 mt-2"> {/* Moved button here */}
              <PlusCircle className="mr-2 h-4 w-4 flex-shrink-0" /> <span className="flex-1">Add New Task</span>
           </Button>
        </CardHeader>
        <CardContent>
          <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
              <DialogContent className={dialogContentClassName}>
                  <DialogHeader>
                      <DialogTitle className="font-heading tracking-wide">{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                  </DialogHeader>
                  <TaskForm
                      task={editingTask}
                      onSave={handleSaveTask}
                      onCancel={() => { setIsTaskFormOpen(false); setEditingTask(undefined); }}
                   />
              </DialogContent>
            </Dialog>
            <TaskList onEditTask={(task) => { setEditingTask(task); setIsTaskFormOpen(true); }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center space-x-2 font-heading tracking-wide">
                <Clock className="h-5 w-5" />
                <span>Reminders</span>
            </CardTitle>
            <Button variant="outline" onClick={() => { setEditingReminder(undefined); setIsReminderFormOpen(true); }} className="w-full whitespace-normal text-center h-11 px-4 py-3 mt-2"> {/* Moved button here */}
                <PlusCircle className="mr-2 h-4 w-4 flex-shrink-0" /> <span className="flex-1">Add New Reminder</span>
            </Button>
        </CardHeader>
        <CardContent>
            <Dialog open={isReminderFormOpen} onOpenChange={setIsReminderFormOpen}>
                  <DialogContent className={dialogContentClassName}>
                      <DialogHeader>
                          <DialogTitle className="font-heading tracking-wide">{editingReminder ? 'Edit Reminder' : 'Add New Reminder'}</DialogTitle>
                      </DialogHeader>
                      <ReminderForm
                          initialReminder={editingReminder}
                          onSave={handleSaveReminder}
                          onCancel={() => { setIsReminderFormOpen(false); setEditingReminder(undefined);}}
                      />
                  </DialogContent>
            </Dialog>
            <ReminderList onEdit={(reminder) => { setEditingReminder(reminder); setIsReminderFormOpen(true); }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 font-heading tracking-wide">
            <Calendar className="h-5 w-5" />
            <span>Appointments</span>
          </CardTitle>
          <Button variant="outline" onClick={() => {setEditingAppointment(undefined); setIsAppointmentFormOpen(true);}} className="w-full whitespace-normal text-center h-11 px-4 py-3 mt-2"> {/* Moved button here */}
            <PlusCircle className="mr-2 h-4 w-4 flex-shrink-0" /> <span className="flex-1">Add New Appointment</span>
          </Button>
        </CardHeader>
        <CardContent>
            <Dialog open={isAppointmentFormOpen} onOpenChange={setIsAppointmentFormOpen}>
                <DialogContent className={dialogContentClassName}>
                    <DialogHeader>
                        <DialogTitle className="font-heading tracking-wide">{editingAppointment ? 'Edit Appointment' : 'Add New Appointment'}</DialogTitle>
                    </DialogHeader>
                    <AppointmentForm
                        initialData={editingAppointment}
                        onSave={handleSaveAppointment}
                        onCancel={() => {setIsAppointmentFormOpen(false); setEditingAppointment(undefined);}}
                    />
                </DialogContent>
            </Dialog>
            <AppointmentList onEditAppointment={(appointment) => {setEditingAppointment(appointment); setIsAppointmentFormOpen(true);}} />
        </CardContent>
      </Card>
    </div>
    </div>
  );
};

export default Dashboard;
