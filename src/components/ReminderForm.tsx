import React, { useState, useEffect } from 'react';
import { Reminder, Contact, DataItemType } from '../lib/types';
import { useDataSync } from '../hooks/use-data-sync';
import { addReminderToGoogleCalendar, updateReminderInGoogleCalendar } from '../services/google-calendar';
import { getData, saveData, parseDate } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'; // Assuming ShadCN Select
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";


interface ReminderFormProps {
  initialReminder?: Reminder;
  // contacts list is now fetched internally
  onSave: (reminder: Reminder) => void;
  onCancel: () => void;
}

const ReminderForm: React.FC<ReminderFormProps> = ({ initialReminder, onSave, onCancel }) => {
  const [title, setTitle] = useState(initialReminder?.title || '');
  const [description, setDescription] = useState(initialReminder?.description || '');
  // For DatePicker, ensure dateTime is a Date object or null
  const [reminderDateTime, setReminderDateTime] = useState<Date | null>(
    initialReminder?.dateTime ? parseDate(initialReminder.dateTime as string) : null
  );
  const [associatedContactId, setAssociatedContactId] = useState(initialReminder?.associatedContactId || ''); 
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  const { performSync, syncCalendar } = useDataSync();
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    const loadedContacts = getData<Contact[]>(DataItemType.Contacts) || getData<Contact[]>(DataItemType.CustomerData) || []; // Prefer specific contacts, fallback to customerData
    setContacts(loadedContacts);

    if (initialReminder) {
      setTitle(initialReminder.title);
      setDescription(initialReminder.description || '');
      setReminderDateTime(initialReminder.dateTime ? parseDate(initialReminder.dateTime as string) : null);
      setAssociatedContactId(initialReminder.associatedContactId || '');
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
      dateTime: reminderDateTime.toISOString(), // Store as ISO string
      associatedContactId: associatedContactId || undefined,
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
      if (initialReminder?.googleCalendarEventId) {
        await updateReminderInGoogleCalendar(newOrUpdatedReminder);
      } else {
        const googleEvent = await addReminderToGoogleCalendar(newOrUpdatedReminder);
        if (googleEvent && googleEvent.id) {
            newOrUpdatedReminder.googleCalendarEventId = googleEvent.id;
            // Update local storage again with the event ID
            const updatedRemindersWithEventId = currentReminders.map(rem => rem.id === newOrUpdatedReminder.id ? newOrUpdatedReminder : rem);
            saveData<Reminder[]>(DataItemType.Reminders, updatedRemindersWithEventId);
        }
      }
      await syncCalendar(); 
    } catch (error) {
      console.error('Error saving reminder or syncing with Google Calendar:', error);
      // Handle error (e.g., show a toast notification)
    }
    
    onSave(newOrUpdatedReminder);
    // performSync(); // Consider if full data sync is needed or just calendar sync
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
      <div>
        <Label htmlFor="dateTime">Date and Time</Label>
        <DatePicker
            selected={reminderDateTime}
            onChange={(date: Date | null) => setReminderDateTime(date)}
            showTimeSelect
            dateFormat="MM/dd/yyyy h:mm aa"
            className={`w-full ${errors.dateTime ? 'border-destructive' : ''} mt-1 block border rounded-md shadow-sm focus:ring-ring focus:border-ring sm:text-sm p-2 h-10`}
            wrapperClassName="w-full"
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
                <SelectItem value="">None</SelectItem>
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
