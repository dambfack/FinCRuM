import React, { useState, useEffect } from 'react';
import { Reminder, Contact, DataItemType } from '../lib/types';
import { useDataSync } from '../hooks/use-data-sync';
import { createCalendarEvent as addReminderToGoogleCalendar, updateCalendarEvent as updateReminderInGoogleCalendar } from '../services/google-calendar';
import { getData, saveData, parseDate } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'; // Assuming ShadCN Select
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { cn } from '@/lib/utils';


interface ReminderFormProps {
  initialReminder?: Reminder;
  onSave: (reminder: Reminder) => void;
  onCancel: () => void;
}

const NO_ASSOCIATED_CONTACT_VALUE = "__NO_ASSOCIATED_CONTACT__";

const ReminderForm: React.FC<ReminderFormProps> = ({ initialReminder, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reminderDateTime, setReminderDateTime] = useState<Date | null>(null);
  const [associatedContactId, setAssociatedContactId] = useState<string>(NO_ASSOCIATED_CONTACT_VALUE); 
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  const { syncCalendar } = useDataSync();
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    const loadedContacts = getData<Contact[]>(DataItemType.Contacts) || getData<Contact[]>(DataItemType.CustomerData) || [];
    setContacts(loadedContacts);

    if (initialReminder) {
      setTitle(initialReminder.title);
      setDescription(initialReminder.description || '');
      setReminderDateTime(initialReminder.dateTime ? parseDate(initialReminder.dateTime as string) : null);
      setAssociatedContactId(initialReminder.associatedContactId || NO_ASSOCIATED_CONTACT_VALUE);
    } else {
      setTitle('');
      setDescription('');
      setReminderDateTime(null);
      setAssociatedContactId(NO_ASSOCIATED_CONTACT_VALUE); 
    }
  }, [initialReminder]);


  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!reminderDateTime) newErrors.dateTime = 'Date and time are required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !reminderDateTime) {
      return;
    }

    const newOrUpdatedReminder: Reminder = {
      id: initialReminder?.id || Date.now().toString(),
      title,
      description,
      dateTime: reminderDateTime.toISOString(), 
      associatedContactId: associatedContactId === NO_ASSOCIATED_CONTACT_VALUE ? undefined : associatedContactId,
      googleCalendarEventId: initialReminder?.googleCalendarEventId,
      completed: initialReminder?.completed || false,
      createdAt: initialReminder?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let currentReminders = getData<Reminder[]>(DataItemType.Reminders) || [];
    const existingIndex = currentReminders.findIndex(r => r.id === newOrUpdatedReminder.id);
    if (existingIndex >= 0) {
      currentReminders[existingIndex] = newOrUpdatedReminder;
    } else {
      currentReminders.push(newOrUpdatedReminder);
    }
    saveData<Reminder[]>(DataItemType.Reminders, currentReminders);

    try {
      // Retrieve tokens from localStorage within the async function if needed by the calendar service
      // Note: services/google-calendar.ts functions already expect tokens to be passed.
      const googleTokens = typeof window !== 'undefined' ? {
        access_token: localStorage.getItem(DataItemType.GoogleDriveAccessToken),
        refresh_token: localStorage.getItem(DataItemType.GoogleDriveRefreshToken),
        expiry_date: parseInt(localStorage.getItem('googleDriveTokenExpiry') || '0', 10)
      } : null;

      if (!googleTokens || !googleTokens.access_token) {
        console.warn("No Google tokens found, skipping calendar sync for reminder.");
      } else {
        if (initialReminder?.googleCalendarEventId) {
          await updateReminderInGoogleCalendar(initialReminder.googleCalendarEventId, newOrUpdatedReminder, 'reminder', googleTokens);
        } else {
          const result = await addReminderToGoogleCalendar(newOrUpdatedReminder, 'reminder', googleTokens);
          if (result.event && result.event.id) {
              newOrUpdatedReminder.googleCalendarEventId = result.event.id;
              const updatedRemindersWithEventId = currentReminders.map(rem => rem.id === newOrUpdatedReminder.id ? newOrUpdatedReminder : rem);
              saveData<Reminder[]>(DataItemType.Reminders, updatedRemindersWithEventId);
          }
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
      console.error('Error saving reminder or syncing with Google Calendar:', error);
    }
    
    onSave(newOrUpdatedReminder);
  };

  const datePickerInputClassName = cn(
    "flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    "bg-neutral-100 dark:bg-neutral-900",
    "border-neutral-300 dark:border-neutral-700",
    "text-foreground placeholder:text-muted-foreground/70 dark:placeholder:text-muted-foreground/50",
    "mt-1", // Specific margin for this form
    errors.dateTime ? 'border-destructive' : ''
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
      <div>
        <Label htmlFor="dateTime">Date and Time</Label>
        <DatePicker
            selected={reminderDateTime}
            onChange={(date: Date | null) => setReminderDateTime(date)}
            showTimeSelect
            dateFormat="MM/dd/yyyy h:mm aa"
            className={datePickerInputClassName}
            wrapperClassName="w-full"
            popperClassName="react-datepicker-popper" // Apply custom popper class for z-index
        />
        {errors.dateTime && <p className="text-sm text-destructive mt-1">{errors.dateTime}</p>}
      </div>
      <div>
        <Label htmlFor="associatedContact">Associated Contact (Optional)</Label>
        <Select value={associatedContactId} onValueChange={setAssociatedContactId}>
            <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Select a contact" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value={NO_ASSOCIATED_CONTACT_VALUE}>None</SelectItem>
                {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                        {contact.firstName} {contact.lastName} ({contact.email})
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialReminder ? 'Update Reminder' : 'Add Reminder'}
        </Button>
      </div>
    </form>
  );
};

export default ReminderForm;
