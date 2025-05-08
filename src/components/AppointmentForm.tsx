import React, { useState, useEffect } from 'react';
import { Appointment, LocalData } from '../lib/types';
import { useDataSync } from '../hooks/use-data-sync';
import { syncWithGoogleCalendar, createGoogleCalendarEvent, updateGoogleCalendarEvent } from '../services/google-calendar'; // Assuming this function exists

interface AppointmentFormProps {
  initialData?: Appointment;
  onSave: (appointment: Appointment) => void;
  onCancel: () => void;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ initialData, onSave, onCancel }) => {
  const [localData, setLocalData] = useState<LocalData | null>(null);
  useEffect(() => {
    const storedData = localStorage.getItem('localData');
    if (storedData) {
      setLocalData(JSON.parse(storedData));
    }
  }, []);

  const updateLocalData = (newData: LocalData) => {
    localStorage.setItem('localData', JSON.stringify(newData));
  };
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [date, setDate] = useState(initialData?.date || '');
  const [time, setTime] = useState(initialData?.time || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [invitedContacts, setInvitedContacts] = useState<string[]>(initialData?.invitedContacts || []);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  const { triggerSync } = useDataSync(); // Assuming useDataSync provides triggerSync

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!date.trim()) {
      newErrors.date = 'Date is required';
    }
    if (!time.trim()) {
      newErrors.time = 'Time is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const newAppointment: Appointment = {
      id: initialData?.id || Date.now().toString(), // Simple ID generation
      title,
      description,
      date,
      time,
      location,
      invitedContacts,
      googleCalendarEventId: initialData?.googleCalendarEventId, // Preserve existing Google Calendar ID
    };

    if (localData) {
        const updatedData = { ...localData };
        let existingAppointmentIndex = -1;
        if (updatedData.appointments) {
          existingAppointmentIndex = updatedData.appointments.findIndex((a) => a.id === newAppointment.id);
        }
    
        if (existingAppointmentIndex >= 0) {
          // Update existing appointment
          updatedData.appointments[existingAppointmentIndex] = newAppointment;
        } else {
          // Add new appointment
          if (!updatedData.appointments) {
            updatedData.appointments = [];
          }
          updatedData.appointments.push(newAppointment);
        }
        updateLocalData(updatedData);
      }

    // Sync with Google Calendar
    try {
      if (!newAppointment.googleCalendarEventId){
        const googleEventId = await createGoogleCalendarEvent(newAppointment);
        newAppointment.googleCalendarEventId = googleEventId;
        if (localData) {
            updateLocalData({ ...localData, appointments: localData.appointments.map(appointment => appointment.id === newAppointment.id ? newAppointment : appointment) });
          }
      } else {
        await updateGoogleCalendarEvent(newAppointment)
      }

    } catch (error) {
      console.error('Error saving or updating with Google Calendar:', error);
      // Handle error (e.g., show a toast notification)
    }


    onSave(newAppointment);
    triggerSync(); // Trigger data sync after saving
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title
        </label>
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
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        ></textarea>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`mt-1 block w-full border ${errors.date ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
          />
          {errors.date && <p className="mt-2 text-sm text-red-600">{errors.date}</p>}
        </div>
        <div>
          <label htmlFor="time" className="block text-sm font-medium text-gray-700">
            Time
          </label>
          <input
            type="time"
            id="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={`mt-1 block w-full border ${errors.time ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
          />
          {errors.time && <p className="mt-2 text-sm text-red-600">{errors.time}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
          Location
        </label>
        <input
          type="text"
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      {/* Add multi-select or input for invited contacts */}
      {/* <div>
        <label htmlFor="invitedContacts" className="block text-sm font-medium text-gray-700">
          Invited Contacts
        </label>
        {/* Implement multi-select or tag input for contacts }
      </div> */}
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Save Appointment
        </button>
      </div>
    </form>
  );
};

export default AppointmentForm;