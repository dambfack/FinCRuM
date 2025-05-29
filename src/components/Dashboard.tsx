// src/components/Dashboard.tsx
'use client';

import React, { FC, useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Users, UserPlus as UserPlusIcon, ListTodo, Calendar, Clock, PlusCircle, RefreshCw as RefreshCwIcon, Square, CheckSquare, User as UserAssignIcon, FileArchive } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { ExcelData, Contact, Task as TaskType, Reminder as ReminderType, Appointment as AppointmentType, User, UserThemeSettings } from '@/lib/types';
import { DataItemType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useDataSync } from '@/hooks/use-data-sync';
import TaskList from './TaskList';
import AppointmentList from './AppointmentList';
import ReminderList from './ReminderList';
import TaskForm from './TaskForm';
import ReminderForm from './ReminderForm';
import AppointmentForm from './AppointmentForm';
import CustomerDetailModal from './CustomerDetailModal';
import CustomerForm from './CustomerForm';
import { getData, parseDate, formatDateTime, cn, saveData } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { subMonths, startOfMonth, format, eachMonthOfInterval } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import dynamic from 'next/dynamic';
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface DashboardStats {
  totalCustomers: number;
  newCustomersTodayCount: number;
  tasksPending: number;
  appointmentsTodayCount: number;
}

const initialStats: DashboardStats = {
  totalCustomers: 0,
  newCustomersTodayCount: 0,
  tasksPending: 0,
  appointmentsTodayCount: 0,
};

type BarChartTimeRange = '1m' | '3m' | '6m' | '12m';

const MONTSERRAT_FONT_STACK = 'var(--font-montserrat), var(--font-geist-sans), sans-serif';
const RECHARTS_FONT_STYLE = { fontFamily: MONTSERRAT_FONT_STACK };

const Dashboard: FC = () => {
  // State declarations
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [allContactsState, setAllContactsState] = useState<Contact[]>([]);
  const [allUsersState, setAllUsersState] = useState<User[]>([]);
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
  const [customerToEdit, setCustomerToEdit] = useState<Contact | null>(null);
  const [isEditCustomerDialogOpen, setIsEditCustomerDialogOpen] = useState(false);
  const [contactForNewActivity, setContactForNewActivity] = useState<Contact | null>(null);
  const [isNewCustomersModalOpen, setNewCustomersModalOpen] = useState(false);
  const [newCustomersTodayList, setNewCustomersTodayList] = useState<Contact[]>([]);
  const [isTodaysTasksModalOpen, setTodaysTasksModalOpen] = useState(false);
  const [todaysTasksList, setTodaysTasksList] = useState<TaskType[]>([]);
  const [isTodaysAppointmentsModalOpen, setTodaysAppointmentsModalOpen] = useState(false);
  const [todaysAppointmentsList, setTodaysAppointmentsList] = useState<AppointmentType[]>([]);

  // Hooks
  const { toast } = useToast();
  const { performSync, syncStatus, syncCalendar, syncMicrosoftCalendar, initiateAuthentication, lastSyncTime, isGoogleDriveConnected, isMicrosoftCalendarConnected } = useDataSync();
  const { resolvedTheme, theme } = useTheme();
  const { currentUser, currentUserThemeSettings } = useAuth();
  const isGoogleCalendarLinked = isGoogleDriveConnected;
  
  // Helper functions
    // Helper functions
    // Helper functions
  const getContactName = useCallback((contactId?: string): string => {
    if (!contactId) return 'Unknown';
    const contact = allContactsState.find((c: Contact) => c.id === contactId);
    return contact ? `${contact.firstName} ${contact.lastName}`.trim() || 'Unnamed Contact' : 'Unknown';
  }, [allContactsState]);

  const getUserName = useCallback((userId?: string): string => {
    if (!userId) return 'Unassigned';
    const user = allUsersState.find((u: User) => u.id === userId);
    return user ? user.name || 'Unnamed User' : 'Unknown User';
  }, [allUsersState]);
  
  // Handler functions
  const handleShowNewCustomersToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const newCustomers = allContactsState.filter((c: Contact) => {
      const createdAtDate = c.createdAt ? (parseDate(c.createdAt as string)?.toISOString().split('T')[0]) : null;
      return createdAtDate === today;
    });
    setNewCustomersTodayList(newCustomers);
    setNewCustomersModalOpen(true);
  }, [allContactsState]);

  const handleShowTodaysTasks = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const tasks = getData<TaskType[]>(DataItemType.Tasks) || [];
    const todaysTasks = tasks.filter((t: TaskType) => {
      const dueDate = t.dueDate ? (parseDate(t.dueDate as string)?.toISOString().split('T')[0]) : null;
      return dueDate === today;
    });
    setTodaysTasksList(todaysTasks);
    setTodaysTasksModalOpen(true);
  }, []);

  const handleShowTodaysAppointments = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const appointments = getData<AppointmentType[]>(DataItemType.Appointments) || [];
    const todaysAppointments = appointments.filter((a: AppointmentType) => {
      const apptDate = a.date ? (parseDate(a.date as string)?.toISOString().split('T')[0]) : null;
      return apptDate === today;
    });
    setTodaysAppointmentsList(todaysAppointments);
    setTodaysAppointmentsModalOpen(true);
  }, []);



    const loadDashboardData = useCallback(() => {
        setLoading(true);
        try {
            const loadedContacts = getData<Contact[]>(DataItemType.Contacts) || [];
            const loadedUsers = getData<User[]>(DataItemType.Users) || [];
            setAllUsersState(loadedUsers);
            setAllContactsState(loadedContacts);

            const tasks = getData<TaskType[]>(DataItemType.Tasks) || [];
            const appointments = getData<AppointmentType[]>(DataItemType.Appointments) || [];
            const todayDateString = new Date().toISOString().split('T')[0];

            const newCustomersToday = loadedContacts.filter(c => {
                const createdAtDate = c.createdAt ? (parseDate(c.createdAt as string)?.toISOString().split('T')[0]) : null;
                return createdAtDate === todayDateString;
            }).length;

            setStats({
                totalCustomers: loadedContacts.length,
                newCustomersTodayCount: newCustomersToday,
                tasksPending: tasks.filter(t => t.status !== 'done').length,
                appointmentsTodayCount: appointments.filter(a => {
                     const apptDate = a.date ? (parseDate(a.date as string)?.toISOString().split('T')[0]) : null;
                     return apptDate === todayDateString;
                }).length,
            });

            setRecentContacts(loadedContacts.sort((a,b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()).slice(0, 5));

            const numMonths = parseInt(barChartTimeRange.replace('m', ''), 10);
            const endDate = new Date();
            const startDate = startOfMonth(subMonths(endDate, numMonths - 1));

            const monthsInterval = eachMonthOfInterval({ start: startDate, end: endDate });
            const customerCountsByMonth: Record<string, number> = {}

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
                return { name: shortMonthKey, customers: customerCountsByMonth[monthKey] || 0 }
            });
            setCustomerGrowthChartData(growthChartData);

            const statusCounts: Record<Exclude<Contact['status'], undefined> | 'other', number> = { open: 0, closed: 0, missed: 0, other: 0 }
            loadedContacts.forEach(contact => {
                const status = contact.status || 'other';
                 if (statusCounts.hasOwnProperty(status as Exclude<Contact['status'], undefined>)) {
                    statusCounts[status as Exclude<Contact['status'], undefined>]++;
                } else {
                     statusCounts.other++;
                }
            });

            const pieDataLabels = ['Open', 'Closed', 'Missed', 'Other'];
            const pieDataSeries = [statusCounts.open, statusCounts.closed, statusCounts.missed, statusCounts.other];
            
            setDealStatusLabels(pieDataLabels);
            setDealStatusSeries(pieDataSeries);

        } catch (error) {
            console.error("Error loading dashboard data:", error);
            toast({ title: "Error", description: "Could not load dashboard data.", variant: "destructive" });
            setStats(initialStats);
            setRecentContacts([]);
            setCustomerGrowthChartData([]);
            setDealStatusSeries([]);
            setDealStatusLabels([]);
        } finally {
            setLoading(false);
        }
    }, [toast, barChartTimeRange]);

    useEffect(() => {
        loadDashboardData();
        
        const handleDataChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail?.type === DataItemType.Contacts ||
                customEvent.detail?.type === DataItemType.Tasks ||
                customEvent.detail?.type === DataItemType.Appointments ||
                customEvent.detail?.type === DataItemType.Reminders ||
                customEvent.detail?.type === DataItemType.Users) {
                loadDashboardData();
            }
        };
        
        window.addEventListener('dataChanged', handleDataChange);
        return () => {
            window.removeEventListener('dataChanged', handleDataChange);
        };
    }, [loadDashboardData]);

    const MONTSERRAT_FONT_STACK = 'var(--font-montserrat), var(--font-geist-sans), sans-serif';

    const apexPieChartOptions = useMemo((): ApexCharts.ApexOptions => {
        const totalClients = dealStatusSeries.reduce((a, b) => a + b, 0);
        
        const currentThemeKey = resolvedTheme === 'dark' ? 'dark' : 'light';
        
        const pieColors = [
            currentUserThemeSettings?.chartPieColorOpen || (currentThemeKey === 'dark' ? 'rgba(56, 189, 248, 0.8)' : 'rgba(14, 165, 233, 0.8)'), // Open - Teal/Sky
            currentUserThemeSettings?.chartPieColorClosed || (currentThemeKey === 'dark' ? 'rgba(74, 222, 128, 0.8)' : 'rgba(34, 197, 94, 0.8)'), // Closed - Green
            currentUserThemeSettings?.chartPieColorMissed || (currentThemeKey === 'dark' ? 'rgba(251, 191, 36, 0.8)' : 'rgba(245, 158, 11, 0.8)'), // Missed - Amber/Yellow
            currentUserThemeSettings?.chartPieColorOther || (currentThemeKey === 'dark' ? 'rgba(156, 163, 175, 0.8)' : 'rgba(107, 114, 128, 0.8)'), // Other - Gray
        ];

        return {
            chart: {
                type: 'donut' as const,
                background: 'transparent',
                fontFamily: MONTSERRAT_FONT_STACK,
                toolbar: { show: false }
            },
            labels: (dealStatusLabels.length > 0 && totalClients > 0) ? dealStatusLabels : ['No Data Available'],
            colors: (dealStatusSeries.length > 0 && dealStatusSeries.some(s => s > 0)) ? pieColors : [resolvedTheme === 'dark' ? 'rgba(85,85,85,0.8)' : 'rgba(170,170,170,0.8)'],
            fill: { opacity: 1 }, // Opacity is now part of the color strings
            stroke: { show: true, width: 2, colors: ['transparent'] },
            legend: {
                position: 'bottom',
                horizontalAlign: 'center',
                floating: false,
                fontSize: '12px',
                fontFamily: MONTSERRAT_FONT_STACK,
                labels: { colors: resolvedTheme === 'dark' ? '#e5e5e5' : '#333333' },
                markers: {
                    size: 6,
                    shape: 'circle' as const,
                    strokeWidth: 0,
                    offsetX: 0,
                    offsetY: 0
                },
                itemMargin: { horizontal: 5, vertical: 2 }
            },
            plotOptions: {
                pie: {
                    expandOnClick: true,
                    donut: {
                        size: '65%',
                        labels: {
                            show: totalClients > 0,
                            total: {
                                show: true,
                                label: 'Total Clients',
                                fontFamily: MONTSERRAT_FONT_STACK,
                                color: resolvedTheme === 'dark' ? '#e5e5e5' : '#333333',
                                formatter: (w: any) => totalClients.toString()
                            },
                            value: {
                                fontFamily: MONTSERRAT_FONT_STACK,
                                color: resolvedTheme === 'dark' ? '#ffffff' : '#111111',
                                offsetY: 8,
                                formatter: (val: string) => val
                            }
                        }
                    }
                }
            },
            // Hover state is handled by the theme
            dataLabels: {
                enabled: totalClients > 0,
                formatter: (val: number, opts: any) => {
                    if (totalClients === 0) return '';
                    if (opts && opts.w && opts.w.globals && Array.isArray(opts.w.globals.series) && opts.w.globals.series[opts.seriesIndex] !== undefined) {
                        const percentage = (opts.w.globals.series[opts.seriesIndex] / totalClients * 100);
                        return percentage < 1 && percentage > 0 ? '<1%' : `${percentage.toFixed(0)}%`;
                    }
                    return '';
                },
                style: {
                    fontSize: '12px',
                    fontFamily: MONTSERRAT_FONT_STACK,
                    colors: [resolvedTheme === 'dark' ? '#f0f0f0' : '#333333']
                },
                dropShadow: { enabled: false }
            },
            tooltip: {
                theme: resolvedTheme === 'dark' ? 'dark' : 'light',
                fillSeriesColor: false,
                style: { fontFamily: MONTSERRAT_FONT_STACK },
                y: { formatter: (val: number) => `${val} client(s)` }
            },
            responsive: [{
                breakpoint: 480,
                options: { chart: { width: '100%' }, legend: { position: 'bottom' } }
            }]
        }
    }, [resolvedTheme, dealStatusLabels, dealStatusSeries, currentUserThemeSettings]);


    const chartKey = useMemo(() => {
      return `${resolvedTheme}-${JSON.stringify(apexPieChartOptions.colors)}`;
    }, [resolvedTheme, apexPieChartOptions.colors]);


    const handleGoogleCalendarAuth = useCallback(async () => {
      if (isGoogleCalendarLinked) {
        if (typeof window !== 'undefined') {
          // Remove both Google Calendar and Google Drive tokens
          localStorage.removeItem(DataItemType.GoogleCalendarAccessToken);
          localStorage.removeItem(DataItemType.GoogleCalendarRefreshToken);
          localStorage.removeItem('googleCalendarTokenExpiry');
          localStorage.removeItem(DataItemType.GoogleDriveAccessToken);
          localStorage.removeItem(DataItemType.GoogleDriveRefreshToken);
          localStorage.removeItem('googleDriveTokenExpiry');
          
          // UI state will be updated automatically through isGoogleDriveConnected
          toast({ 
            title: "Google Services Unlinked", 
            description: "You have been signed out of Google services.",
            variant: "default"
          });
        }
      } else {
        try {
          // Initiate unified Google authentication (Calendar + Drive)
          await initiateAuthentication('google');
        } catch (error) {
          console.error('Google authentication error:', error);
          toast({ 
            title: "Google Auth Error", 
            description: `Failed to connect to Google services: ${error instanceof Error ? error.message : 'Unknown error'}`, 
            variant: "destructive"
          });
        }
      }
      loadDashboardData(); // Reload to reflect connection status change
    }, [isGoogleCalendarLinked, initiateAuthentication, toast, loadDashboardData]);

    const handleMicrosoftCalendarAuth = useCallback(async () => {
      if (isMicrosoftCalendarConnected) {
        if (typeof window !== 'undefined') {
          // Remove Microsoft Calendar and OneDrive tokens
          localStorage.removeItem('microsoftAccessToken');
          localStorage.removeItem('microsoftRefreshToken');
          localStorage.removeItem('microsoftTokenExpiry');
          
          // UI state will be updated automatically through isMicrosoftCalendarConnected
          toast({ 
            title: "Microsoft Services Unlinked", 
            description: "You have been signed out of Microsoft services.",
            variant: "default"
          });
        }
      } else {
        try {
          // Initiate Microsoft authentication (Calendar + OneDrive)
          await initiateAuthentication('microsoft');
        } catch (error) {
          console.error('Microsoft authentication error:', error);
          toast({ 
            title: "Microsoft Auth Error", 
            description: `Failed to connect to Microsoft services: ${error instanceof Error ? error.message : 'Unknown error'}`, 
            variant: "destructive"
          });
        }
      }
      loadDashboardData(); // Reload to reflect connection status change
    }, [isMicrosoftCalendarConnected, initiateAuthentication, toast, loadDashboardData]);

    const refreshData = useCallback(() => {
        loadDashboardData();
        toast({ title: "Data Refreshed", description: "Dashboard data has been reloaded." });
    }, [loadDashboardData, toast]);

    const handleSaveTask = () => { setIsTaskFormOpen(false); setEditingTask(undefined); setContactForNewActivity(null); refreshData(); }
    const handleSaveReminder = () => { setIsReminderFormOpen(false); setEditingReminder(undefined); setContactForNewActivity(null); refreshData(); }
    const handleSaveAppointment = () => { setIsAppointmentFormOpen(false); setEditingAppointment(undefined); setContactForNewActivity(null); refreshData(); }

    const handleSaveCustomerEdit = () => {
      setIsEditCustomerDialogOpen(false);
      setCustomerToEdit(null);
      refreshData();
    }

    const handleViewContactDetails = (contact: Contact) => {
        setSelectedContactForModal(contact);
        setIsCustomerDetailModalOpen(true);
    }

    const handleEditRequestFromDetail = (contact: Contact) => {
      setIsCustomerDetailModalOpen(false);
  setCustomerToEdit(contact);
  setIsEditCustomerDialogOpen(true);
}

const handleAddAppointmentRequestFromDetail = (contact: Contact) => {
        setIsCustomerDetailModalOpen(false);
        setContactForNewActivity(contact);
        setEditingAppointment(undefined);
    setIsAppointmentFormOpen(true);
}

const handleAddReminderRequestFromDetail = (contact: Contact) => {
        setIsCustomerDetailModalOpen(false);
        setContactForNewActivity(contact);
        setEditingReminder(undefined);
    setIsReminderFormOpen(true);
}

const handleAddTaskRequestFromDetail = (contact: Contact) => {
        setIsCustomerDetailModalOpen(false);
        setContactForNewActivity(contact);
        setEditingTask(undefined);
    setIsTaskFormOpen(true);
}

const handleContactUpdatedFromDashboardModal = (updatedContact: Contact) => {
      setAllContactsState(prevContacts =>
        prevContacts.map(c => (c.id === updatedContact.id ? updatedContact : c))
      );
      setRecentContacts(prevRecent =>
        prevRecent.map(c => (c.id === updatedContact.id ? updatedContact : c))
      );
      if (selectedContactForModal && selectedContactForModal.id === updatedContact.id) {
        setSelectedContactForModal(updatedContact);
      }
      loadDashboardData();
}



const dialogContentClassName = "sm:max-w-lg glass-effect bg-card/80 dark:bg-card/70";
    const taskDialogContentClassName = "sm:max-w-xl glass-effect bg-card/80 dark:bg-card/70";
    const listModalContentClassName = "sm:max-w-lg glass-effect bg-card/80 dark:bg-card/70";
    const customerEditDialogContentClassName = "sm:max-w-2xl glass-effect bg-card/80 dark:bg-card/70";

        // Handler functions are already defined above
    const getTaskPriorityBadgeVariant = useCallback((priority?: 'low' | 'medium' | 'high') => {
      switch (priority) {
        case 'high': return 'destructive';
        case 'medium': return 'secondary';
        case 'low': return 'outline';
        default: return 'outline';
      }
    }, []);

    // Memoize the stat cards to prevent unnecessary re-renders
    const statCards = useMemo(() => [
      { 
        title: "Total Customers", 
        value: stats.totalCustomers, 
        icon: Users, 
        note: "All contacts in system", 
        link: "/customers" 
      },
      { 
        title: "New Today", 
        value: `+${stats.newCustomersTodayCount}`, 
        icon: UserPlusIcon, 
        note: "Customers added today", 
        action: handleShowNewCustomersToday 
      },
      { 
        title: "Pending Tasks", 
        value: stats.tasksPending, 
        icon: ListTodo, 
        note: "Tasks due today, by priority", 
        action: handleShowTodaysTasks 
      },
      { 
        title: "Appointments Today", 
        value: stats.appointmentsTodayCount, 
        icon: Calendar, 
        note: "Scheduled for today", 
        action: handleShowTodaysAppointments 
      }
    ], [
      stats.totalCustomers, 
      stats.newCustomersTodayCount, 
      stats.tasksPending, 
      stats.appointmentsTodayCount, 
      handleShowNewCustomersToday, 
      handleShowTodaysTasks, 
      handleShowTodaysAppointments
    ]);

  return (
    <div className="space-y-6">
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h1 className="text-3xl font-bold font-heading">CRM Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button onClick={handleGoogleCalendarAuth} size="sm" variant={isGoogleCalendarLinked ? 'outline' : 'default'} className="h-11 px-4 py-3 whitespace-nowrap">
                <Calendar className="mr-2 h-4 w-4" />
                {isGoogleCalendarLinked ? 'Unlink Google Services' : 'Link Google Services'}
            </Button>
            <Button onClick={handleMicrosoftCalendarAuth} size="sm" variant={isMicrosoftCalendarConnected ? 'outline' : 'default'} className="h-11 px-4 py-3 whitespace-nowrap">
                <Calendar className="mr-2 h-4 w-4" />
                {isMicrosoftCalendarConnected ? 'Unlink Microsoft Services' : 'Link Microsoft Services'}
            </Button>
            <Button onClick={() => performSync()} size="sm" disabled={syncStatus === 'syncing'} className="h-11 px-4 py-3 whitespace-nowrap">
                <RefreshCwIcon className={`mr-2 h-4 w-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                {syncStatus === 'syncing' ? 'Syncing...' : (lastSyncTime ? `Last Sync: ${formatDateTime(lastSyncTime).split(',')[0]}` : 'Sync Now')}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map(stat => (
            <Card
              key={stat.title}
              onClick={stat.action ? stat.action : undefined}
              className={cn("hover:scale-102 hover:-translate-y-1", (stat.link || stat.action) ? "cursor-pointer" : "")}
              role={stat.action ? "button" : undefined}
              tabIndex={stat.action ? 0 : undefined}
              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && stat.action) stat.action(); }}
            >
              {stat.link ? (
                <Link href={stat.link} passHref legacyBehavior>
                  <a className="block h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium font-heading">{stat.title}</CardTitle>
                      <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stat.value}</div>}
                      <p className="text-xs text-muted-foreground">{stat.note}</p>
                    </CardContent>
                  </a>
                </Link>
              ) : (
                <>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium font-heading">{stat.title}</CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stat.value}</div>}
                    <p className="text-xs text-muted-foreground">{stat.note}</p>
                  </CardContent>
                </>
              )}
            </Card>
          ))}
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="font-heading">Customer Growth</CardTitle>
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
                <ResponsiveContainer width="100%" height={300} key={resolvedTheme}>
                  <RechartsBarChart data={customerGrowthChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
                    <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={{stroke: "hsl(var(--border))"}} tick={RECHARTS_FONT_STYLE}/>
                    <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={{stroke: "hsl(var(--border))"}} tickFormatter={(value) => `${value}`} allowDecimals={false} tick={RECHARTS_FONT_STYLE}/>
                    <Tooltip
                       contentStyle={{
                        backgroundColor: 'hsla(var(--popover)/0.7)',
                        borderColor: 'hsl(var(--border))',
                        color: 'hsl(var(--popover-foreground))',
                        borderRadius: 'var(--radius)',
                        boxShadow: 'var(--shadow-lg)',
                        backdropFilter: 'blur(8px)',
                        fontFamily: MONTSERRAT_FONT_STACK
                      }}
                      cursor={{ fill: 'hsl(var(--accent) / 0.2)' }}
                    />
                    <Legend wrapperStyle={{ color: 'hsl(var(--foreground))', paddingTop: '10px', fontFamily: MONTSERRAT_FONT_STACK }}/>
                    <Bar dataKey="customers" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-10">No customer data available for the selected period.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Client Deal Status</CardTitle>
            <CardDescription>Distribution of clients by their current deal status.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[300px] w-full" /> : (
                <div className="h-[300px] w-full">
                   <ReactApexChart
                    key={chartKey}
                    options={apexPieChartOptions}
                    series={(dealStatusSeries.length > 0 && dealStatusSeries.some(s => s > 0)) ? dealStatusSeries : (dealStatusLabels.length > 0 ? dealStatusLabels.map(() => 0) : [1])}
                    type="donut"
                    height="100%"
                    width="100%"
                  />
                </div>
             ) }
          </CardContent>
        </Card>
      </div>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 font-heading">
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
                    className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md transition-colors duration-200"
                >
                    <div className="cursor-pointer" onClick={() => handleViewContactDetails(contact)}>
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
            <Button asChild variant="default" className="h-11 px-4 py-3 whitespace-normal">
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
          <CardTitle className="flex items-center space-x-2 font-heading">
            <ListTodo className="h-5 w-5" />
            <span>Tasks</span>
          </CardTitle>
           <Button variant="default" onClick={() => { setEditingTask(undefined); setContactForNewActivity(null); setIsTaskFormOpen(true); }} className="w-full h-11 px-4 py-3 whitespace-normal text-center mt-2">
              <PlusCircle className="mr-2 h-4 w-4 flex-shrink-0" /> <span className="flex-1">Add New Task</span>
           </Button>
        </CardHeader>
        <CardContent>
            <TaskList onEditTask={(task) => { setEditingTask(task); setContactForNewActivity(null); setIsTaskFormOpen(true); }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center space-x-2 font-heading">
                <Clock className="h-5 w-5" />
                <span>Reminders</span>
            </CardTitle>
            <Button variant="default" onClick={() => { setEditingReminder(undefined); setContactForNewActivity(null); setIsReminderFormOpen(true); }} className="w-full h-11 px-4 py-3 whitespace-normal text-center mt-2">
                <PlusCircle className="mr-2 h-4 w-4 flex-shrink-0" /> <span className="flex-1">Add New Reminder</span>
            </Button>
        </CardHeader>
        <CardContent>
            <ReminderList onEdit={(reminder) => { setEditingReminder(reminder); setContactForNewActivity(null); setIsReminderFormOpen(true); }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 font-heading">
            <Calendar className="h-5 w-5" />
            <span>Appointments</span>
          </CardTitle>
          <Button variant="default" onClick={() => {setEditingAppointment(undefined); setContactForNewActivity(null); setIsAppointmentFormOpen(true);}} className="w-full h-11 px-4 py-3 whitespace-normal text-center mt-2">
            <PlusCircle className="mr-2 h-4 w-4 flex-shrink-0" /> <span className="flex-1">Add New Appointment</span>
          </Button>
        </CardHeader>
        <CardContent>
            <AppointmentList onEditAppointment={(appointment) => {setEditingAppointment(appointment); setContactForNewActivity(null); setIsAppointmentFormOpen(true);}} />
        </CardContent>
      </Card>
    </div>

    <Dialog open={isNewCustomersModalOpen} onOpenChange={setNewCustomersModalOpen}>
        <DialogContent className={listModalContentClassName}>
            <DialogHeader>
                <DialogTitle className="font-heading">Customers Added Today</DialogTitle>
            </DialogHeader>
            {newCustomersTodayList.length > 0 ? (
                <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {newCustomersTodayList.map(contact => (
                        <li key={contact.id} className="p-2 border-b text-sm">
                            <p className="font-medium">{contact.firstName} {contact.lastName}</p>
                            <p className="text-xs text-muted-foreground">{contact.email}</p>
                        </li>
                    ))}
                </ul>
            ) : <p className="text-sm text-muted-foreground">No new customers added today.</p>}
        </DialogContent>
    </Dialog>

    <Dialog open={isTodaysTasksModalOpen} onOpenChange={setTodaysTasksModalOpen}>
        <DialogContent className={listModalContentClassName}>
            <DialogHeader>
                <DialogTitle className="font-heading">Tasks for Today</DialogTitle>
            </DialogHeader>
            {todaysTasksList.length > 0 ? (
                <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {todaysTasksList.map(task => (
                        <li key={task.id} className="p-2 border-b text-sm">
                            <div className="flex justify-between items-start mb-1">
                                <span className={cn("font-medium", task.status === 'done' && "line-through text-muted-foreground")}>{task.title}</span>
                                <div className="flex items-center gap-1.5">
                                    {task.priority && <Badge variant={getTaskPriorityBadgeVariant(task.priority)} className="capitalize text-xs">{task.priority}</Badge>}
                                    <Badge variant={task.status === 'done' ? 'default' : 'secondary'} className="capitalize text-xs">{task.status?.replace('-', ' ') || 'To Do'}</Badge>
                                </div>
                            </div>
                            {task.associatedContactId && (
                                <p className="text-xs text-muted-foreground">
                                  For: {getContactName(task.associatedContactId) || 'N/A'}
                                </p>
                            )}
                             {task.assignedToUserId && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Assigned to: {getUserName(task.assignedToUserId) || 'N/A'}
                                </p>
                            )}
                            {task.description && <p className={cn("text-xs text-muted-foreground mt-0.5", task.status === 'done' && "line-through")}>{task.description}</p>}
                            {task.checklist && task.checklist.length > 0 && (
                                <div className="mt-1.5 space-y-0.5">
                                    <p className="text-xs font-medium text-muted-foreground/80">Checklist ({task.checklist.filter(i=>i.completed).length}/{task.checklist.length}):</p>
                                    <ul className="pl-2">
                                    {task.checklist.map(item => (
                                        <li key={item.id} className="flex items-center gap-1.5 text-xs">
                                        {item.completed ? <CheckSquare className="h-3 w-3 text-green-500" /> : <Square className="h-3 w-3 text-muted-foreground/60" />}
                                        <span className={cn(item.completed && "line-through text-muted-foreground/70")}>{item.text}</span>
                                        </li>
                                    ))}
                                    </ul>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            ) : <p className="text-sm text-muted-foreground">No tasks due today.</p>}
        </DialogContent>
    </Dialog>

    <Dialog open={isTodaysAppointmentsModalOpen} onOpenChange={setTodaysAppointmentsModalOpen}>
        <DialogContent className={listModalContentClassName}>
            <DialogHeader>
                <DialogTitle className="font-heading">Appointments for Today</DialogTitle>
            </DialogHeader>
            {todaysAppointmentsList.length > 0 ? (
                <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {todaysAppointmentsList.map(appt => (
                        <li key={appt.id} className="p-2 border-b text-sm">
                            <p className="font-medium">{appt.title}</p>
                            <p className="text-xs text-muted-foreground">
                                {formatDateTime(appt.date as string).split(',')[1]}
                                {appt.location && ` - ${appt.location}`}
                            </p>
                            {appt.assignedToUserId && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Assigned to: {getUserName(appt.assignedToUserId) || 'N/A'}
                                </p>
                            )}
                            {appt.attendeesList && appt.attendeesList.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Attendees: {appt.attendeesList.map(a => a.displayName || a.email).join(', ')}
                                </p>
                            )}
                            {appt.description && <p className="text-xs text-muted-foreground mt-1">{appt.description}</p>}
                        </li>
                    ))}
                </ul>
            ) : <p className="text-sm text-muted-foreground">No appointments scheduled for today.</p>}
        </DialogContent>
    </Dialog>

    <Dialog open={isTaskFormOpen} onOpenChange={(open) => { if(!open) {setEditingTask(undefined); setContactForNewActivity(null);} setIsTaskFormOpen(open);}}>
        <DialogContent className={taskDialogContentClassName}>
            <DialogHeader>
                <DialogTitle className="font-heading">{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                {contactForNewActivity && !editingTask && <DialogDescription>For: {contactForNewActivity.firstName} {contactForNewActivity.lastName}</DialogDescription>}
            </DialogHeader>
            <TaskForm
                task={editingTask}
                initialSelectedContactId={contactForNewActivity?.id}
                onSave={handleSaveTask}
                onCancel={() => { setIsTaskFormOpen(false); setEditingTask(undefined); setContactForNewActivity(null);}}
             />
        </DialogContent>
      </Dialog>
    <Dialog open={isReminderFormOpen} onOpenChange={(open) => { if(!open) {setEditingReminder(undefined); setContactForNewActivity(null);} setIsReminderFormOpen(open);}}>
            <DialogContent className={dialogContentClassName}>
                <DialogHeader>
                    <DialogTitle className="font-heading">{editingReminder ? 'Edit Reminder' : 'Add New Reminder'}</DialogTitle>
                    {contactForNewActivity && !editingReminder && <DialogDescription>For: {contactForNewActivity.firstName} {contactForNewActivity.lastName}</DialogDescription>}
                </DialogHeader>
                <ReminderForm
                    initialReminder={editingReminder}
                    initialSelectedContactId={contactForNewActivity?.id}
                    onSave={handleSaveReminder}
                    onCancel={() => { setIsReminderFormOpen(false); setEditingReminder(undefined); setContactForNewActivity(null);}}
                />
            </DialogContent>
      </Dialog>
    <Dialog open={isAppointmentFormOpen} onOpenChange={(open) => { if(!open) {setEditingAppointment(undefined); setContactForNewActivity(null);} setIsAppointmentFormOpen(open);}}>
          <DialogContent className={dialogContentClassName}>
              <DialogHeader>
                  <DialogTitle className="font-heading">{editingAppointment ? 'Edit Appointment' : 'Add New Appointment'}</DialogTitle>
                  {contactForNewActivity && !editingAppointment && <DialogDescription>For: {contactForNewActivity.firstName} {contactForNewActivity.lastName}</DialogDescription>}
              </DialogHeader>
              <AppointmentForm
                  initialData={editingAppointment}
                  initialSelectedContactId={contactForNewActivity?.id}
                  onSave={handleSaveAppointment}
                  onCancel={() => {setIsAppointmentFormOpen(false); setEditingAppointment(undefined); setContactForNewActivity(null);}}
              />
          </DialogContent>
      </Dialog>

    <CustomerDetailModal
        contact={selectedContactForModal}
        isOpen={isCustomerDetailModalOpen}
        onClose={() => {
            setIsCustomerDetailModalOpen(false);
            setSelectedContactForModal(null);
        }}
        onEditRequest={handleEditRequestFromDetail}
        onAddAppointmentRequest={handleAddAppointmentRequestFromDetail}
        onAddReminderRequest={handleAddReminderRequestFromDetail}
        onAddTaskRequest={handleAddTaskRequestFromDetail}
        onContactUpdate={handleContactUpdatedFromDashboardModal}
      />

    <Dialog open={isEditCustomerDialogOpen} onOpenChange={(open) => {
        if (!open) setCustomerToEdit(null);
        setIsEditCustomerDialogOpen(open);
    }}>
        <DialogContent className={customerEditDialogContentClassName}>
            <DialogHeader>
                <DialogTitle className="font-heading">Edit Customer</DialogTitle>
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
}

export default Dashboard;

