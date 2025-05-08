import React, { useState, useEffect } from 'react';
import { Reminder, Contact } from '../lib/types'; // Assuming types and Contact type are defined
import { useDataSync } from '../hooks/use-data-sync'; // Assuming useDataSync hook
import { useLocalStorage } from '../hooks/use-local-storage';
import { addReminderToGoogleCalendar, updateReminderInGoogleCalendar } from '../services/google-calendar'; // Assuming Google Calendar service functions

interface ReminderFormProps {
  initialReminder?: Reminder;
  contacts: Contact[]; // List of contacts for association
  onSave: (reminder: Reminder) => void;
  onCancel: () => void;
}

const ReminderForm: React.FC<ReminderFormProps> = ({ initialReminder, contacts, onSave, onCancel }) => {
  const [title, setTitle] = useState(initialReminder?.title || '');
  const [description, setDescription] = useState(initialReminder?.description || '');
  const [dateTime, setDateTime] = useState(initialReminder?.dateTime || '');
  const [associatedContactId, setAssociatedContactId] = useState(initialReminder?.associatedContactId || ''); 
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { syncData } = useDataSync(); // Access sync function
  const [reminders, setReminders] = useLocalStorage<Reminder[]>('reminders', []);

  useEffect(() => {
    if (initialReminder) {
      const existingReminder = reminders.find((r) => r.id === initialReminder.id);
      if (existingReminder) {
        setTitle(existingReminder.title);
        setDescription(existingReminder.description);
        setDateTime(existingReminder.dateTime);
        setAssociatedContactId(existingReminder.associatedContactId || '');
      }
    }
  }, [initialReminder, reminders]);
  const updateReminders = (updatedReminder: Reminder) => {
    const index = reminders.findIndex((t) => t.id === updatedReminder.id);
    const updatedReminders = [...reminders];
    index > -1 ? (updatedReminders[index] = updatedReminder) : updatedReminders.push(updatedReminder);
    setReminders(updatedReminders);
  };
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!dateTime) {
      newErrors.dateTime = 'Date and time are required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const newReminder: Reminder = {
      ...initialReminder, // Keep existing ID if updating
      id: initialReminder?.id || Date.now().toString(), // Simple ID generation
      title,
      description,
      dateTime,
      associatedContactId: associatedContactId || undefined, // Store as undefined if no contact selected
      googleCalendarEventId: initialReminder?.googleCalendarEventId, // Keep existing Google Calendar ID
    };

    try {
      // Sync with Google Calendar
      if (initialReminder?.googleCalendarEventId) {
        await updateReminderInGoogleCalendar(newReminder);
      } else {
        const googleEventId = await addReminderToGoogleCalendar(newReminder);
        newReminder.googleCalendarEventId = googleEventId;
      }

      onSave(newReminder);
      updateReminders(newReminder);
       setTimeout(() => {
         syncData(); // Trigger data sync after saving/updating
       }, 100);
    } catch (error) {
      console.error('Error saving reminder or syncing with Google Calendar:', error);
      // Handle error (e.g., show a toast notification)
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`mt-1 block w-full border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
        />
        {errors.title && <p className="mt-2 text-sm text-red-600">{errors.title}</p>}
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        ></textarea>
      </div>
      <div>
        <label htmlFor="dateTime" className="block text-sm font-medium text-gray-700">Date and Time</label>
        <input
          type="datetime-local"
          id="dateTime"
          value={dateTime}
          onChange={(e) => setDateTime(e.target.value)}
          className={`mt-1 block w-full border ${errors.dateTime ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
        />
        {errors.dateTime && <p className="mt-2 text-sm text-red-600">{errors.dateTime}</p>}
      </div>
      <div>
        <label htmlFor="associatedContact" className="block text-sm font-medium text-gray-700">Associated Contact (Optional)</label>
        <select
          id="associatedContact"
          value={associatedContactId}
          onChange={(e) => setAssociatedContactId(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="">Select a contact</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>{contact.name}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {initialReminder ? 'Update Reminder' : 'Add Reminder'}
        </button>
      </div>
    </form>
  );
};

export default ReminderForm;