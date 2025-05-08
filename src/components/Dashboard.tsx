'use client';

import React, { FC, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Users, TrendingUp, ListTodo, Calendar, Clock, Edit, Trash2, PlusCircle } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { ExcelData, Contact, Task as TaskType, Reminder as ReminderType, Appointment as AppointmentType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useDataSync } from '@/hooks/use-data-sync';
import { useGoogleCalendar } from '@/hooks/use-google-calendar';
import TaskList from './TaskList';
import AppointmentList from './AppointmentList';
import ReminderList from './ReminderList';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import TaskForm from './TaskForm';
import ReminderForm from './ReminderForm';
import AppointmentForm from './AppointmentForm';


interface DashboardStats {
  totalCustomers: number;
  newCustomersToday: number;
}

// Initial stats
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

const mockData: Contact[] = [
  { id: '1', firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', phone: '123-456-7890', company: 'Acme Corp', createdAt: new Date(), updatedAt: new Date() },
  { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com', phone: '987-654-3210', company: 'Beta LLC', createdAt: new Date(), updatedAt: new Date()  },
  { id: '3', firstName: 'Mike', lastName: 'Johnson', email: 'mike.johnson@example.com', phone: '555-123-4567', company: 'Gamma Inc', createdAt: new Date(), updatedAt: new Date()  },
  { id: '4', firstName: 'Alice', lastName: 'Williams', email: 'alice.williams@example.com', phone: '555-987-6543', company: 'Delta Co', createdAt: new Date(), updatedAt: new Date()  },
  { id: '5', firstName: 'Bob', lastName: 'Brown', email: 'bob.brown@example.com', phone: '555-555-5555', company: 'Epsilon Ltd', createdAt: new Date(), updatedAt: new Date()  },
];


const Dashboard: FC = () => {
    const [stats, setStats] = useState<DashboardStats>(initialStats);
    const { performSync, syncStatus, syncCalendar } = useDataSync();
    const { isSignedIn, handleSignIn, handleSignOut } = useGoogleCalendar();

    const [loading, setLoading] = useState(true);
    const [contacts, setContacts] = useState<Contact[]>([]);

    const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
    const [isReminderFormOpen, setIsReminderFormOpen] = useState(false);
    const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<TaskType | undefined>(undefined);
    const [editingReminder, setEditingReminder] = useState<ReminderType | undefined>(undefined);
    const [editingAppointment, setEditingAppointment] = useState<AppointmentType | undefined>(undefined);


    useEffect(() => {
        setLoading(true);
         try {
            const storedData = localStorage.getItem('customerData');
            if (storedData) {
                const parsedData: ExcelData = JSON.parse(storedData);
                 if (parsedData && parsedData.rows) {
                     const totalCustomers = parsedData.rows.length;
                     setStats({
                         totalCustomers: totalCustomers,
                         newCustomersToday: 0,
                     });
                      // Transform ExcelData to Contact[]
                        const contactHeaders = parsedData.headers;
                        const transformedContacts: Contact[] = parsedData.rows.map((row, index) => {
                            const contact: Partial<Contact> & { id: string } = { id: `contact-${index}`}; // Add a default ID
                            contactHeaders.forEach((header, i) => {
                                (contact as any)[header] = row[i];
                            });
                            contact.createdAt = new Date(); // Placeholder
                            contact.updatedAt = new Date(); // Placeholder
                            return contact as Contact;
                        });
                        setContacts(transformedContacts.slice(0, 5)); // Display first 5
                 } else {
                    setStats(initialStats);
                    setContacts([]);
                 }
            } else {
                setStats(initialStats);
                setContacts(mockData.slice(0,5)); // Use mockData if nothing in localStorage
            }
        } catch (error) {
            console.error("Error loading dashboard stats:", error);
            setStats(initialStats);
            setContacts(mockData.slice(0,5)); // Use mockData on error
        } finally {
            setLoading(false);
        }
    }, []);

    const handleGoogleCalendarAuth = useCallback(async () => {
      if (isSignedIn) {
        handleSignOut();
      } else {
        await handleSignIn();
        // Attempt to sync calendar items after successful sign-in
        syncCalendar();
      }
    }, [isSignedIn, handleSignIn, handleSignOut, syncCalendar]);

    const handleSaveTask = () => {
        setIsTaskFormOpen(false);
        setEditingTask(undefined);
        // Optionally re-fetch tasks or trigger a state update in TaskList
    };
    const handleSaveReminder = () => {
        setIsReminderFormOpen(false);
        setEditingReminder(undefined);
         // Optionally re-fetch reminders or trigger a state update in ReminderList
    };
    const handleSaveAppointment = () => {
        setIsAppointmentFormOpen(false);
        setEditingAppointment(undefined);
        // Optionally re-fetch appointments or trigger a state update in AppointmentList
    };


    return (
      <div className="space-y-6">
        <div className='flex items-center justify-between'>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button onClick={() => performSync()} size="sm" className="ml-auto" disabled={syncStatus === 'syncing'}>
            {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>

        <div className="flex items-center justify-between py-2">
          <Button onClick={handleGoogleCalendarAuth} size="sm" variant={isSignedIn ? 'destructive' : 'default'}>
            {isSignedIn ? 'Sign Out from Google' : 'Link Google Calendar'}
          </Button>
        </div>

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
          <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted">
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
                <RechartsBarChart data={chartData}>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Recent Contacts</span>
          </CardTitle>
          <Link href="/add-customer">
            <Button size="sm" variant="outline">
                <UserPlus className="mr-2 h-4 w-4" /> Add New Customer
            </Button>
          </Link>
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
                    <div className="flex space-x-2">
                    {/* <Button size="icon" className="p-2 h-auto w-auto" variant={'ghost'}> <Edit className="h-4 w-4" /> </Button>
                    <Button size="icon" className="p-2 h-auto w-auto" variant={'ghost'}> <Trash2 className="h-4 w-4" /> </Button> */}
                    </div>
                </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No contacts found. <Link href="/import" className="text-accent underline">Import data</Link> or <Link href="/add-customer" className="text-accent underline">add a customer</Link>.</p>
          )}
         </CardContent>
      </Card>

    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <ListTodo className="h-5 w-5" />
            <span>Tasks</span>
          </CardTitle>
          <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
            <DialogTrigger asChild>
                 <Button size="sm" variant="outline" onClick={() => { setEditingTask(undefined); setIsTaskFormOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Task
                 </Button>
            </DialogTrigger>
            <DialogContent>
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
        </CardHeader>
        <CardContent>
            <TaskList onEditTask={(task) => { setEditingTask(task); setIsTaskFormOpen(true); }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Reminders</span>
            </CardTitle>
            <Dialog open={isReminderFormOpen} onOpenChange={setIsReminderFormOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" variant="outline" onClick={() => { setEditingReminder(undefined); setIsReminderFormOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New Reminder
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingReminder ? 'Edit Reminder' : 'Add New Reminder'}</DialogTitle>
                    </DialogHeader>
                    <ReminderForm
                        initialReminder={editingReminder}
                        contacts={contacts} // Pass contacts for association
                        onSave={handleSaveReminder}
                        onCancel={() => { setIsReminderFormOpen(false); setEditingReminder(undefined);}}
                    />
                </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
            <ReminderList onEdit={(reminder) => { setEditingReminder(reminder); setIsReminderFormOpen(true); }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Appointments</span>
          </CardTitle>
            <Dialog open={isAppointmentFormOpen} onOpenChange={setIsAppointmentFormOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" variant="outline" onClick={() => {setEditingAppointment(undefined); setIsAppointmentFormOpen(true);}}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New Appointment
                    </Button>
                </DialogTrigger>
                <DialogContent>
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
