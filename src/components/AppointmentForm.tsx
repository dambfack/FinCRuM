import React, { useState, useEffect } from 'react';
import { Appointment, Contact, DataItemType } from '../lib/types';
import { useDataSync } from '../hooks/use-data-sync';
import { createGoogleCalendarEvent, updateGoogleCalendarEvent } from '../services/google-calendar';
import { getData, saveData, parseDate } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import DatePicker from 'react-datepicker'; // Using react-datepicker
import "react-datepicker/dist/react-datepicker.css";


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
  
  const { triggerSync, syncCalendar } = useDataSync();
  const [allContacts, setAllContacts] = useState<Contact[]>([]);

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
      if (!newOrUpdatedAppointment.googleCalendarEventId){
        const googleEvent = await createGoogleCalendarEvent(newOrUpdatedAppointment); // Pass the specific appointment
        if (googleEvent && googleEvent.id) {
            newOrUpdatedAppointment.googleCalendarEventId = googleEvent.id;
            // Update local storage again with the event ID
            const updatedAppointments = appointments.map(app => app.id === newOrUpdatedAppointment.id ? newOrUpdatedAppointment : app);
            saveData<Appointment[]>(DataItemType.Appointments, updatedAppointments);
        }
      } else {
        await updateGoogleCalendarEvent(newOrUpdatedAppointment); // Pass the specific appointment
      }
      // Consider calling syncCalendar() here or as part of a broader sync strategy
      await syncCalendar();
    } catch (error) {
      console.error('Error saving or updating with Google Calendar:', error);
      // Handle error (e.g., show a toast notification)
    }

    onSave(newOrUpdatedAppointment);
    // triggerSync(); // This might be too broad, consider specific sync needs
  };

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
            className={`w-full ${errors.date ? 'border-destructive' : ''} mt-1 block border rounded-md shadow-sm focus:ring-ring focus:border-ring sm:text-sm p-2 h-10`}
            wrapperClassName="w-full"
            dateFormat="MM/dd/yyyy"
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
            className="mt-1 block w-full border border-input rounded-md shadow-sm focus:ring-ring focus:border-ring sm:text-sm p-2"
            size={5}
        >
            {allContacts.map(contact => (
                <option key={contact.id} value={contact.id}>
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
