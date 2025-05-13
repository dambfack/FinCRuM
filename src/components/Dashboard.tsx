// src/components/Dashboard.tsx
'use client';

import React, { FC, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Users, TrendingUp, ListTodo, Calendar, Clock, Edit, Trash2, PlusCircle, UserPlus as UserPlusIcon, RefreshCw as RefreshCwIcon } from 'lucide-react'; // Renamed RefreshCw to RefreshCwIcon
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
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
import { getData, parseDate, formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';


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
  { id: '1', firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', phone: '123-456-7890', company: 'Acme Corp', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com', phone: '987-654-3210', company: 'Beta LLC', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()  },
];

const Dashboard: FC = () => {
    const [stats, setStats] = useState<DashboardStats>(initialStats);
    const { performSync, syncStatus, syncCalendar, initiateAuthentication, lastSyncTime } = useDataSync();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [chartData, setChartData] = useState<{ name: string; customers: number }[]>([]);

    const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
    const [isReminderFormOpen, setIsReminderFormOpen] = useState(false);
    const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<TaskType | undefined>(undefined);
    const [editingReminder, setEditingReminder] = useState<ReminderType | undefined>(undefined);
    const [editingAppointment, setEditingAppointment] = useState<AppointmentType | undefined>(undefined);
    const [isGoogleCalendarLinked, setIsGoogleCalendarLinked] = useState(false);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        setIsGoogleCalendarLinked(!!localStorage.getItem(DataItemType.GoogleDriveAccessToken));
      }
    }, []);

    const loadDashboardData = useCallback(() => {
        setLoading(true);
        try {
            const customerData = getData<Contact[]>(DataItemType.Contacts) || []; // Prioritize manually added contacts
            const importedData = getData<ExcelData>(DataItemType.CustomerData); // Fallback to imported
            
            let allContacts: Contact[] = [...customerData];

            if (importedData && importedData.rows) {
                const importedContactsAsContacts: Contact[] = importedData.rows.map((row, index) => {
                    // Basic mapping, assuming headers like 'firstName', 'lastName', 'email'
                    const h = importedData.headers;
                    return {
                        id: `imported-${index}-${Date.now()}`,
                        firstName: row[h.indexOf('firstName')] || '',
                        lastName: row[h.indexOf('lastName')] || '',
                        email: row[h.indexOf('email')] || '',
                        phone: row[h.indexOf('phone')] || undefined,
                        company: row[h.indexOf('company')] || undefined,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };
                });
                // Simple de-duplication by email, prefer manually added contacts
                const combined = [...customerData, ...importedContactsAsContacts];
                allContacts = Array.from(new Map(combined.map(c => [c.email, c])).values());
            }
            
            const tasks = getData<TaskType[]>(DataItemType.Tasks) || [];
            const appointments = getData<AppointmentType[]>(DataItemType.Appointments) || [];
            const today = new Date().toISOString().split('T')[0];

            const newCustomersToday = allContacts.filter(c => {
                const createdAtDate = c.createdAt ? (parseDate(c.createdAt as string)?.toISOString().split('T')[0]) : null;
                return createdAtDate === today;
            }).length;

            setStats({
                totalCustomers: allContacts.length,
                newCustomersToday: newCustomersToday,
                tasksPending: tasks.filter(t => t.status !== 'done').length,
                appointmentsToday: appointments.filter(a => {
                     const apptDate = a.date ? (parseDate(a.date as string)?.toISOString().split('T')[0]) : null;
                     return apptDate === today;
                }).length,
            });

            setContacts(allContacts.sort((a,b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()).slice(0, 5));

            // Generate chart data (e.g., customers added per month for last 6 months)
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const customerCountsByMonth: Record<string, number> = {};
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); // Last 6 months including current
            sixMonthsAgo.setDate(1);

            allContacts.forEach(contact => {
                const contactDate = parseDate(contact.createdAt as string);
                if (contactDate && contactDate >= sixMonthsAgo) {
                    const monthName = months[contactDate.getMonth()];
                    customerCountsByMonth[monthName] = (customerCountsByMonth[monthName] || 0) + 1;
                }
            });
            
            const currentMonthIndex = new Date().getMonth();
            const lastSixMonthsChartData = [];
            for (let i = 5; i >= 0; i--) {
                const monthIndex = (currentMonthIndex - i + 12) % 12;
                const monthName = months[monthIndex];
                lastSixMonthsChartData.push({ name: monthName, customers: customerCountsByMonth[monthName] || 0 });
            }
            setChartData(lastSixMonthsChartData);


        } catch (error) {
            console.error("Error loading dashboard data:", error);
            toast({ title: "Error", description: "Could not load dashboard data.", variant: "destructive" });
            setStats(initialStats);
            setContacts(mockContacts.slice(0,5));
            setChartData([]);
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    const handleGoogleCalendarAuth = useCallback(async () => {
      if (isGoogleCalendarLinked) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(DataItemType.GoogleDriveAccessToken);
        }
        setIsGoogleCalendarLinked(false);
        toast({ title: "Google Calendar Unlinked", description: "You may need to re-authenticate to use calendar features."});
      } else {
        try {
            await initiateAuthentication('googledrive'); 
            if (typeof window !== 'undefined' && localStorage.getItem(DataItemType.GoogleDriveAccessToken)) {
              setIsGoogleCalendarLinked(true);
              toast({ title: "Google Calendar Linked (Mock)", description: "Attempting to sync calendar items."});
              await syncCalendar(); 
            } else {
                 toast({ title: "Google Calendar Link Failed (Mock)", description: "Could not establish mock authentication.", variant:"destructive"});
            }
        } catch(error) {
            toast({ title: "Google Calendar Auth Error", description: `Mock authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive"});
        }
      }
    }, [isGoogleCalendarLinked, initiateAuthentication, syncCalendar, toast]);

    const refreshData = useCallback(() => {
        loadDashboardData();
        toast({ title: "Data Refreshed", description: "Dashboard data has been reloaded." });
    }, [loadDashboardData, toast]);

    const handleSaveTask = () => { setIsTaskFormOpen(false); setEditingTask(undefined); refreshData(); };
    const handleSaveReminder = () => { setIsReminderFormOpen(false); setEditingReminder(undefined); refreshData(); };
    const handleSaveAppointment = () => { setIsAppointmentFormOpen(false); setEditingAppointment(undefined); refreshData(); };

    return (
      <div className="space-y-6">
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button onClick={handleGoogleCalendarAuth} size="sm" variant={isGoogleCalendarLinked ? 'outline' : 'default'} className="whitespace-nowrap">
                <Calendar className="mr-2 h-4 w-4" />
                {isGoogleCalendarLinked ? 'Unlink Google Calendar' : 'Link Google Calendar'}
            </Button>
            <Button onClick={() => performSync()} size="sm" disabled={syncStatus === 'syncing'} className="whitespace-nowrap">
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
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stat.value}</div>}
                <p className="text-xs text-muted-foreground">{stat.note}</p>
                </CardContent>
            </Card>
          ))}
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Growth (Last 6 Months)</CardTitle>
           <CardDescription>Shows customers added each month.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-[300px] w-full" /> : chartData.length > 0 ? (
               <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={chartData}>
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
          ) : <p className="text-sm text-muted-foreground text-center py-10">No customer data available for the chart.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Recent Contacts</span>
          </CardTitle>
          {/* Button moved below to CardContent */}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : contacts.length > 0 ? (
            <ul className="space-y-2">
                {contacts.map((contact) => (
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
          <CardTitle className="flex items-center space-x-2">
            <ListTodo className="h-5 w-5" />
            <span>Tasks</span>
          </CardTitle>
          <div className="mt-4">
            <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
              <DialogTrigger asChild>
                   <Button variant="outline" onClick={() => { setEditingTask(undefined); setIsTaskFormOpen(true); }} className="w-full whitespace-normal text-center h-11 px-4 py-3">
                      <PlusCircle className="mr-2 h-4 w-4 flex-shrink-0" /> <span className="flex-1">Add New Task</span>
                   </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                      <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                  </DialogHeader>
                  <TaskForm
                      task={editingTask}
                      onSave={handleSaveTask}
                      onCancel={() => { setIsTaskFormOpen(false); setEditingTask(undefined); }}
                   />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
            <TaskList onEditTask={(task) => { setEditingTask(task); setIsTaskFormOpen(true); }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Reminders</span>
            </CardTitle>
            <div className="mt-4">
              <Dialog open={isReminderFormOpen} onOpenChange={setIsReminderFormOpen}>
                  <DialogTrigger asChild>
                      <Button variant="outline" onClick={() => { setEditingReminder(undefined); setIsReminderFormOpen(true); }} className="w-full whitespace-normal text-center h-11 px-4 py-3">
                          <PlusCircle className="mr-2 h-4 w-4 flex-shrink-0" /> <span className="flex-1">Add New Reminder</span>
                      </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                          <DialogTitle>{editingReminder ? 'Edit Reminder' : 'Add New Reminder'}</DialogTitle>
                      </DialogHeader>
                      <ReminderForm
                          initialReminder={editingReminder}
                          onSave={handleSaveReminder}
                          onCancel={() => { setIsReminderFormOpen(false); setEditingReminder(undefined);}}
                      />
                  </DialogContent>
              </Dialog>
            </div>
        </CardHeader>
        <CardContent>
            <ReminderList onEdit={(reminder) => { setEditingReminder(reminder); setIsReminderFormOpen(true); }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Appointments</span>
          </CardTitle>
          <div className="mt-4">
            <Dialog open={isAppointmentFormOpen} onOpenChange={setIsAppointmentFormOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" onClick={() => {setEditingAppointment(undefined); setIsAppointmentFormOpen(true);}} className="w-full whitespace-normal text-center h-11 px-4 py-3">
                        <PlusCircle className="mr-2 h-4 w-4 flex-shrink-0" /> <span className="flex-1">Add New Appointment</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingAppointment ? 'Edit Appointment' : 'Add New Appointment'}</DialogTitle>
                    </DialogHeader>
                    <AppointmentForm
                        initialData={editingAppointment}
                        onSave={handleSaveAppointment}
                        onCancel={() => {setIsAppointmentFormOpen(false); setEditingAppointment(undefined);}}
                    />
                </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
            <AppointmentList onEditAppointment={(appointment) => {setEditingAppointment(appointment); setIsAppointmentFormOpen(true);}} />
        </CardContent>
      </Card>
    </div>
    </div>
  );
};

export default Dashboard;
