import React, { useEffect, useState } from 'react';
import { Appointment, LocalStorageKey } from '../lib/types';
import { useDataSync } from '../hooks/use-data-sync';
import { getLocalStorage, setLocalStorage } from '../lib/utils';

const AppointmentList: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const { triggerSync } = useDataSync();

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = () => {
    const storedAppointments = getLocalStorage<Appointment[]>(LocalStorageKey.Appointments) || [];
    setAppointments(storedAppointments);
  };

  const handleViewDetails = (appointmentId: string) => {
    console.log(`View details for appointment: ${appointmentId}`);
  };

  const handleEditAppointment = (appointmentId: string) => {
    console.log(`Edit appointment: ${appointmentId}`);
  };

  const handleDeleteAppointment = (appointmentId: string) => {
    const updatedAppointments = appointments.filter((appointment) => appointment.id !== appointmentId);
    setAppointments(updatedAppointments);
    setLocalStorage(LocalStorageKey.Appointments, updatedAppointments);
    triggerSync();
  };

  return (
    <div>
      <h2>Appointments</h2>
      {appointments.length === 0 ? (
        <p>No appointments yet.</p>
      ) : (
        <ul className="space-y-2">
          {appointments.map((appointment) => (
            <li key={appointment.id} className="border p-4 rounded-md">
              <h3>{appointment.title}</h3>
              <p>{new Date(appointment.dateTime).toLocaleString()}</p>
              <button className="mr-2" onClick={() => handleViewDetails(appointment.id)}>View Details</button>
              <button className="mr-2" onClick={() => handleEditAppointment(appointment.id)}>Edit</button>
              <button onClick={() => handleDeleteAppointment(appointment.id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AppointmentList;