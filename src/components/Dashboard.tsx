
// src/components/Dashboard.tsx
'use client';

import React, { FC, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus as UserPlusIcon, ListTodo, Calendar, Clock, PlusCircle, RefreshCw as RefreshCwIcon } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Pie, PieChart as RechartsPieChart, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { ExcelData, Contact, Task as TaskType, Reminder as ReminderType, Appointment as AppointmentType } from '@/lib/types';
import { DataItemType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useDataSync } from '@/hooks/use-data-sync';
import TaskList from './TaskList';
import AppointmentList from './AppointmentList';
import ReminderList from './ReminderList';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import TaskForm from './TaskForm';
import ReminderForm from './ReminderForm';
import AppointmentForm from './AppointmentForm';
import CustomerDetailModal from './CustomerDetailModal';
import CustomerForm from './CustomerForm'; // Import CustomerForm for editing
import { getData, parseDate, formatDateTime, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { subMonths, startOfMonth, format, eachMonthOfInterval } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import dynamic from 'next/dynamic';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });


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
  { id: '3', firstName: 'Alice', lastName: 'Wonder', email: 'alice.wonder@example.com', phone: '555-123-4567', company: 'Gamma Inc', status: 'open', createdAt: subMonths(new Date(), 2).toISOString(), updatedAt: new Date().toISOString() },
  { id: '4', firstName: 'Bob', lastName: 'Builder', email: 'bob.builder@example.com', phone: '555-987-6543', company: 'Delta Co', status: 'missed', createdAt: subMonths(new Date(), 3).toISOString(), updatedAt: new Date().toISOString() },
  { id: '5', firstName: 'Eve', lastName: 'Future', email: 'eve.future@example.com', phone: '555-456-7890', company: 'Epsilon Ltd', status: 'open', createdAt: subMonths(new Date(), 5).toISOString(), updatedAt: new Date().toISOString() },
];

type BarChartTimeRange = '1m' | '3m' | '6m' | '12m';

const PIE_CHART_CSS_VARS = [
  'hsl(var(--chart-pie-1))', // Teal for 'Open'
  'hsl(var(--chart-pie-2))', // Blue for 'Closed'
  'hsl(var(--chart-pie-3))', // Yellow/Orange for 'Missed'
  'hsl(var(--chart-pie-4))', // Gray for 'Other'
  'hsl(var(--chart-5))',     // Fallback
];


const Dashboard: FC = () => {
    const [stats, setStats] = useState<DashboardStats>(initialStats);
    const { performSync, syncStatus, syncCalendar, initiateAuthentication, lastSyncTime, isGoogleDriveConnected } = useDataSync();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [allContactsState, setAllContactsState] = useState<Contact[]>([]);
    const [recentContacts, setRecentContacts] = useState<Contact[]>([]);

    const [barChartTimeRange, setBarChartTimeRange] = useState<BarChartTimeRange>('6m');
    const [customerGrowthChartData, setCustomerGrowthChartData] = useState<{ name: string; customers: number }[]>([]);

    const [dealStatusSeries, setDealStatusSeries] = useState<number[]>([]);
    const [dealStatusLabels, setDealStatusLabels] = useState<string[]>([]);

    const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
    const [isReminderFormOpen, setIsReminderFormOpen] = useState(false);
    const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<TaskType | undefined>(undefined);
    const [editingReminder, setEditingReminder] = useState<ReminderType | undefined>(undefined);
    const [editingAppointment, setEditingAppointment] = useState<AppointmentType | undefined>(undefined);

    const [selectedContactForModal, setSelectedContactForModal] = useState<Contact | null>(null);
    const [isCustomerDetailModalOpen, setIsCustomerDetailModalOpen] = useState(false);
    
    // State for editing customer from dashboard
    const [customerToEdit, setCustomerToEdit] = useState<Contact | null>(null);
    const [isEditCustomerDialogOpen, setIsEditCustomerDialogOpen] = useState(false);

    const isGoogleCalendarLinked = isGoogleDriveConnected;


    const loadDashboardData = useCallback(() => {
        setLoading(true);
        try {
            const customerDataStore = getData<Contact[]>(DataItemType.Contacts) || [];
            // Removed merging logic with DataItemType.CustomerData to simplify and focus on Contacts
            let loadedContacts: Contact[] = [...customerDataStore];

            if (loadedContacts.length === 0 && process.env.NODE_ENV === 'development') { // Populate with mock only if empty and in dev
                loadedContacts = mockContacts; 
                // Optionally save mock contacts to local storage for persistence in dev
                // saveData<Contact[]>(DataItemType.Contacts, mockContacts);
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

            const numMonths = parseInt(barChartTimeRange.replace('m', ''), 10);
            const endDate = new Date();
            const startDate = startOfMonth(subMonths(endDate, numMonths - 1));

            const monthsInterval = eachMonthOfInterval({ start: startDate, end: endDate });
            const customerCountsByMonth: Record<string, number> = {};

            monthsInterval.forEach(monthStart => {
                const monthKey = format(monthStart, 'MMM yyyy');
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

            const statusCounts: Record<Exclude<Contact['status'], undefined | 'approached'> | 'other', number> = { open: 0, closed: 0, missed: 0, other: 0 };
            loadedContacts.forEach(contact => {
                const status = contact.status || 'other';
                if (status === 'approached') { // Map 'approached' to 'other' or handle as per new logic
                    statusCounts.other++;
                } else if (statusCounts.hasOwnProperty(status)) {
                    statusCounts[status as Exclude<Contact['status'], undefined | 'approached'>]++;
                } else {
                    statusCounts.other++; 
                }
            });
            const pieDataForApex = Object.entries(statusCounts)
                .filter(([, value]) => value > 0) 
                .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

            setDealStatusSeries(pieDataForApex.map(item => item.value));
            setDealStatusLabels(pieDataForApex.map(item => item.name));

        } catch (error) {
            console.error("Error loading dashboard data:", error);
            toast({ title: "Error", description: "Could not load dashboard data.", variant: "destructive" });
            setStats(initialStats);
            setRecentContacts(mockContacts.slice(0,5)); // Fallback to mock if error
            setCustomerGrowthChartData([]);
            setDealStatusSeries([]);
            setDealStatusLabels([]);
        } finally {
            setLoading(false);
        }
    }, [toast, barChartTimeRange]);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

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
      loadDashboardData();
    }, [isGoogleCalendarLinked, initiateAuthentication, toast, loadDashboardData]);

    const refreshData = useCallback(() => {
        loadDashboardData();
        toast({ title: "Data Refreshed", description: "Dashboard data has been reloaded." });
    }, [loadDashboardData, toast]);

    const handleSaveTask = () => { setIsTaskFormOpen(false); setEditingTask(undefined); refreshData(); };
    const handleSaveReminder = () => { setIsReminderFormOpen(false); setEditingReminder(undefined); refreshData(); };
    const handleSaveAppointment = () => { setIsAppointmentFormOpen(false); setEditingAppointment(undefined); refreshData(); };
    
    const handleSaveCustomerEdit = () => {
      setIsEditCustomerDialogOpen(false);
      setCustomerToEdit(null);
      refreshData(); // Refresh dashboard data after editing a customer
    };

    const handleViewContactDetails = (contact: Contact) => {
        setSelectedContactForModal(contact);
        setIsCustomerDetailModalOpen(true);
    };

    const handleEditRequestFromDetail = (contact: Contact) => {
      setIsCustomerDetailModalOpen(false); // Close detail modal
      setCustomerToEdit(contact);          // Set contact to edit
      setIsEditCustomerDialogOpen(true);   // Open edit dialog on dashboard
    };
    
    const dialogContentClassName = "sm:max-w-[425px] glass-effect bg-card/80 dark:bg-card/70";
    const customerEditDialogContentClassName = "sm:max-w-2xl glass-effect bg-card/80 dark:bg-card/70";

    const apexPieChartOptions: ApexCharts.ApexOptions = {
      chart: {
        type: 'donut',
        background: 'transparent',
        toolbar: {
            show: false,
        }
      },
      labels: dealStatusLabels,
      colors: PIE_CHART_CSS_VARS,
      fill: {
        opacity: 0.8,
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        floating: false,
        fontSize: '12px',
        labels: {
            colors: 'hsl(var(--foreground))'
        },
        markers: {
            width: 10,
            height: 10,
        },
        itemMargin: {
            horizontal: 5,
            vertical: 2
        }
      },
      plotOptions: {
        pie: {
          expandOnClick: true,
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Clients',
                color: 'hsl(var(--foreground))',
                formatter: (w) => w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toString()
              },
              value: {
                color: 'hsl(var(--foreground))',
                offsetY: 8,
                 formatter: (val: string) => `${val}`
              }
            }
          },
          dropShadow: {
            enabled: true,
            top: 3,
            left: 0,
            blur: 3,
            opacity: 0.3
          },
          states: { 
            hover: {
              filter: {
                type: 'lighten',
                value: 0.25, 
              }
            },
            active: { 
              filter: {
                type: 'none', 
              }
            }
          }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number, opts: any) => {
          const percentage = (opts.w.globals.series[opts.seriesIndex] / opts.w.globals.seriesTotals.reduce((a:number,b:number) => a+b,0) * 100).toFixed(0);
          return `${percentage}%`;
        },
        style: {
          fontSize: '12px',
          colors: ["hsl(var(--foreground))"]
        },
        dropShadow: {
          enabled: false,
        }
      },
      tooltip: {
        theme: typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light',
        fillSeriesColor: false,
        y: {
            formatter: (val: number) => `${val} client(s)`
        }
      },
      responsive: [{
        breakpoint: 480,
        options: {
          chart: {
            width: '100%'
          },
          legend: {
            position: 'bottom'
          }
        }
      }]
    };

    const statCards = [
      { title: "Total Customers", value: stats.totalCustomers, icon: Users, note: "All contacts", link: "/customers" },
      { title: "New Today", value: `+${stats.newCustomersToday}`, icon: UserPlusIcon, note: "Customers added today", link: "/customers" },
      { title: "Pending Tasks", value: stats.tasksPending, icon: ListTodo, note: "Tasks not yet completed", action: () => { setEditingTask(undefined); setIsTaskFormOpen(true); } },
      { title: "Appointments Today", value: stats.appointmentsToday, icon: Calendar, note: "Scheduled for today", action: () => { setEditingAppointment(undefined); setIsAppointmentFormOpen(true); } }
    ];


    return (
      <div className="space-y-6">
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h1 className="text-3xl font-bold font-heading tracking-wide">Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button onClick={handleGoogleCalendarAuth} size="sm" variant={isGoogleCalendarLinked ? 'outline' : 'default'} className="h-11 px-4 py-3 whitespace-nowrap">
                <Calendar className="mr-2 h-4 w-4" />
                {isGoogleCalendarLinked ? 'Unlink Google Calendar' : 'Link Google Calendar'}
            </Button>
            <Button onClick={() => performSync()} size="sm" disabled={syncStatus === 'syncing'} className="h-11 px-4 py-3 whitespace-nowrap">
                <RefreshCwIcon className={`mr-2 h-4 w-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                {syncStatus === 'syncing' ? 'Syncing...' : (lastSyncTime ? `Last Sync: ${formatDateTime(lastSyncTime).split(',')[0]}` : 'Sync Now')}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map(stat => (
            stat.link ? (
              <Link href={stat.link} key={stat.title} passHref>
                <Card className="cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium font-heading tracking-wide">{stat.title}</CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stat.value}</div>}
                    <p className="text-xs text-muted-foreground">{stat.note}</p>
                  </CardContent>
                </Card>
              </Link>
            ) : (
              <Card 
                key={stat.title} 
                onClick={stat.action} 
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') stat.action?.(); }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium font-heading tracking-wide">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stat.value}</div>}
                  <p className="text-xs text-muted-foreground">{stat.note}</p>
                </CardContent>
              </Card>
            )
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
                        backgroundColor: 'hsla(var(--popover)/0.7)',
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--popover-foreground))',
                        borderRadius: 'var(--radius)',
                        boxShadow: 'var(--shadow-lg)',
                        backdropFilter: 'blur(8px)', // Added blur for tooltip
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
            {loading ? <Skeleton className="h-[300px] w-full" /> : dealStatusSeries.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ReactApexChart
                    options={apexPieChartOptions}
                    series={dealStatusSeries}
                    type="donut"
                    height="100%"
                    width="100%"
                  />
                </div>
             ) : <p className="text-sm text-muted-foreground text-center py-10">No deal status data available.</p>}
          </CardContent>
        </Card>
      </div>


      <Card>
        <CardHeader>
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
                <li 
                    key={contact.id} 
                    className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md transition-colors duration-200 cursor-pointer"
                    onClick={() => handleViewContactDetails(contact)}
                >
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
            <Button asChild variant="outline" className="h-11 px-4 py-3 whitespace-normal">
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
           <Button variant="outline" onClick={() => { setEditingTask(undefined); setIsTaskFormOpen(true); }} className="w-full h-11 px-4 py-3 whitespace-normal text-center mt-2">
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
            <Button variant="outline" onClick={() => { setEditingReminder(undefined); setIsReminderFormOpen(true); }} className="w-full h-11 px-4 py-3 whitespace-normal text-center mt-2">
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
          <Button variant="outline" onClick={() => {setEditingAppointment(undefined); setIsAppointmentFormOpen(true);}} className="w-full h-11 px-4 py-3 whitespace-normal text-center mt-2">
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

    {/* Customer Detail Modal */}
    <CustomerDetailModal
        contact={selectedContactForModal}
        isOpen={isCustomerDetailModalOpen}
        onClose={() => {
            setIsCustomerDetailModalOpen(false);
            setSelectedContactForModal(null);
        }}
        onEditRequest={handleEditRequestFromDetail} // New prop for edit from detail view
      />

    {/* Customer Edit Dialog for Dashboard */}
    <Dialog open={isEditCustomerDialogOpen} onOpenChange={(open) => {
        if (!open) setCustomerToEdit(null);
        setIsEditCustomerDialogOpen(open);
    }}>
        <DialogContent className={customerEditDialogContentClassName}>
            <DialogHeader>
                <DialogTitle className="font-heading tracking-wide">Edit Customer</DialogTitle>
                <DialogDescription>Update the customer's details below.</DialogDescription>
            </DialogHeader>
            {customerToEdit && (
                <CustomerForm
                    initialData={customerToEdit}
                    onSave={handleSaveCustomerEdit}
                />
            )}
        </DialogContent>
    </Dialog>

    </div>
  );
};

export default Dashboard;
