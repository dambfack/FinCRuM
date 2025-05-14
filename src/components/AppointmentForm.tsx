import React, { useState, useEffect } from 'react';
import { Appointment, Contact, DataItemType } from '../lib/types';
import { useDataSync } from '../hooks/use-data-sync';
import { createCalendarEvent, updateCalendarEvent } from '../services/google-calendar'; // Corrected import
import { getData, saveData, parseDate } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import DatePicker from 'react-datepicker'; // Using react-datepicker
import "react-datepicker/dist/react-datepicker.css";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';


interface AppointmentFormProps {
  initialData?: Appointment;
  onSave: (appointment: Appointment) => void;
  onCancel: () => void;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ initialData, onSave, onCancel }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  
  // For DatePicker, we need Date objects
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(initialData?.date ? parseDate(initialData.date as string) : null);
  const [time, setTime] = useState(initialData?.time || ''); // Keep time as string e.g., "10:00"

  const [location, setLocation] = useState(initialData?.location || '');
  const [invitedContactIds, setInvitedContactIds] = useState<string[]>(initialData?.invitedContacts || []);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  const { syncCalendar } = useDataSync();
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const loadedContacts = getData<Contact[]>(DataItemType.Contacts) || getData<Contact[]>(DataItemType.CustomerData) || [];
    setAllContacts(loadedContacts);

    if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description || '');
        setAppointmentDate(initialData.date ? parseDate(initialData.date as string) : null);
        setTime(initialData.time || '');
        setLocation(initialData.location || '');
        setInvitedContactIds(initialData.invitedContacts || []);
    }

  }, [initialData]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!appointmentDate) newErrors.date = 'Date is required';
    if (!time.trim()) newErrors.time = 'Time is required';
    else if (!/^\d{2}:\d{2}$/.test(time)) newErrors.time = 'Time must be in HH:MM format';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !appointmentDate) {
      return;
    }

    const appointmentDateTimeString = `${appointmentDate.toISOString().split('T')[0]}T${time}:00`;
    const appointmentDateTime = new Date(appointmentDateTimeString);
    
    if (isNaN(appointmentDateTime.getTime())) {
        setErrors(prev => ({...prev, time: "Invalid date or time combination"}));
        return;
    }

    const newOrUpdatedAppointment: Appointment = {
      id: initialData?.id || Date.now().toString(),
      title,
      description,
      date: appointmentDate.toISOString(), // Store as ISO string
      time, // Store time string
      start: appointmentDateTime.toISOString(), // Store combined start
      end: new Date(appointmentDateTime.getTime() + 60 * 60 * 1000).toISOString(), // Default 1 hour duration for end
      location,
      invitedContacts: invitedContactIds,
      googleCalendarEventId: initialData?.googleCalendarEventId,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const appointments = getData<Appointment[]>(DataItemType.Appointments) || [];
    const existingIndex = appointments.findIndex(a => a.id === newOrUpdatedAppointment.id);

    if (existingIndex >= 0) {
      appointments[existingIndex] = newOrUpdatedAppointment;
    } else {
      appointments.push(newOrUpdatedAppointment);
    }
    saveData<Appointment[]>(DataItemType.Appointments, appointments);

    try {
      const googleTokens = typeof window !== 'undefined' ? {
        access_token: localStorage.getItem(DataItemType.GoogleDriveAccessToken),
        refresh_token: localStorage.getItem(DataItemType.GoogleDriveRefreshToken),
        expiry_date: parseInt(localStorage.getItem('googleDriveTokenExpiry') || '0', 10)
      } : null;

      if (!googleTokens || !googleTokens.access_token) {
        console.warn("No Google tokens found, skipping calendar sync for appointment.");
        toast({ title: "Google Calendar Sync Skipped", description: "Not authenticated with Google. Please link Google Calendar.", variant: "default"});
      } else {
        if (!newOrUpdatedAppointment.googleCalendarEventId){
          const result = await createCalendarEvent(newOrUpdatedAppointment, 'appointment', googleTokens); // Corrected function call
          if (result.event && result.event.id) {
              newOrUpdatedAppointment.googleCalendarEventId = result.event.id;
              const updatedAppointmentsWithEventId = appointments.map(app => app.id === newOrUpdatedAppointment.id ? newOrUpdatedAppointment : app);
              saveData<Appointment[]>(DataItemType.Appointments, updatedAppointmentsWithEventId);
          }
          if (result.newTokens) {
             if (typeof window !== 'undefined') {
                if(result.newTokens.access_token) localStorage.setItem(DataItemType.GoogleDriveAccessToken, result.newTokens.access_token);
                if(result.newTokens.refresh_token) localStorage.setItem(DataItemType.GoogleDriveRefreshToken, result.newTokens.refresh_token);
                if(result.newTokens.expiry_date) localStorage.setItem('googleDriveTokenExpiry', result.newTokens.expiry_date.toString());
             }
          }
        } else {
          const result = await updateCalendarEvent(newOrUpdatedAppointment.googleCalendarEventId, newOrUpdatedAppointment, 'appointment', googleTokens); // Corrected function call
          if (result.newTokens) {
             if (typeof window !== 'undefined') {
                if(result.newTokens.access_token) localStorage.setItem(DataItemType.GoogleDriveAccessToken, result.newTokens.access_token);
                if(result.newTokens.refresh_token) localStorage.setItem(DataItemType.GoogleDriveRefreshToken, result.newTokens.refresh_token);
                if(result.newTokens.expiry_date) localStorage.setItem('googleDriveTokenExpiry', result.newTokens.expiry_date.toString());
             }
          }
        }
        await syncCalendar();
      }
    } catch (error) {
      console.error('Error saving or updating appointment with Google Calendar:', error);
      toast({ title: "Google Calendar Error", description: `Failed to sync appointment: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive"});
    }

    onSave(newOrUpdatedAppointment);
  };

  const datePickerInputClassName = cn(
    "flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    "bg-neutral-100 dark:bg-neutral-900",
    "border-neutral-300 dark:border-neutral-700",
    "text-foreground placeholder:text-muted-foreground/70 dark:placeholder:text-muted-foreground/50",
    "mt-1", // Specific margin for this form
    errors.date ? 'border-destructive' : ''
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={errors.title ? 'border-destructive' : ''}
        />
        {errors.title && <p className="text-sm text-destructive mt-1">{errors.title}</p>}
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date">Date</Label>
          <DatePicker
            selected={appointmentDate}
            onChange={(date: Date | null) => setAppointmentDate(date)}
            className={datePickerInputClassName}
            wrapperClassName="w-full"
            dateFormat="MM/dd/yyyy"
            popperClassName="react-datepicker-popper" // Apply custom popper class for z-index
          />
          {errors.date && <p className="text-sm text-destructive mt-1">{errors.date}</p>}
        </div>
        <div>
          <Label htmlFor="time">Time (HH:MM)</Label>
          <Input
            type="time"
            id="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={errors.time ? 'border-destructive' : ''}
          />
          {errors.time && <p className="text-sm text-destructive mt-1">{errors.time}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="invitedContacts">Invited Contacts</Label>
        <select
            id="invitedContacts"
            multiple
            value={invitedContactIds}
            onChange={(e) => setInvitedContactIds(Array.from(e.target.selectedOptions, option => option.value))}
            className={cn(
                "mt-1 block w-full rounded-md border px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                "bg-neutral-100 dark:bg-neutral-900",
                "border-neutral-300 dark:border-neutral-700",
                "text-foreground"
            )}
            size={5}
        >
            {allContacts.map(contact => (
                <option key={contact.id} value={contact.id} className="dark:bg-neutral-800 dark:text-neutral-100">
                    {contact.firstName} {contact.lastName} ({contact.email})
                </option>
            ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">Hold Ctrl/Cmd to select multiple contacts.</p>
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? 'Update Appointment' : 'Save Appointment'}
        </Button>
      </div>
    </form>
  );
};

export default AppointmentForm;
