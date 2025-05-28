
import React, { useEffect, useState } from 'react';
import { Appointment, DataItemType, Contact, User } from '../lib/types'; // Updated import
import { useDataSync } from '../hooks/use-data-sync';
import { getData, deleteItemById, formatDateTime } from '../lib/utils'; // Updated import
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Trash2, Edit, Eye, User as UserIcon } from 'lucide-react'; // Icons
import { Badge } from './ui/badge'; // Added Badge
import { cn } from '@/lib/utils'; // Added cn

interface AppointmentListProps {
  onEditAppointment: (appointment: Appointment) => void;
}


const AppointmentList: React.FC<AppointmentListProps> = ({ onEditAppointment }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]); // State for users
  const { performSync } = useDataSync();

  useEffect(() => {
    loadAppointmentsAndUsers();
  }, []);

  const loadAppointmentsAndUsers = () => {
    const storedAppointments = getData<Appointment[]>(DataItemType.Appointments) || [];
    const storedUsers = getData<User[]>(DataItemType.Users) || [];
    setAppointments(storedAppointments.sort((a,b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime()));
    setUsers(storedUsers);
  };

  const handleDeleteAppointment = (appointmentId: string) => {
    const updatedAppointments = deleteItemById<Appointment>(DataItemType.Appointments, appointmentId);
    if (updatedAppointments) {
      setAppointments(updatedAppointments);
    }
  };

  const getUserName = (userId?: string) => {
    if (!userId) return null;
    const user = users.find(u => u.id === userId);
    return user ? user.name : `User ID: ${userId}`;
  };


  if (appointments.length === 0) {
    return <p className="text-sm text-muted-foreground">No appointments scheduled. Add one to get started!</p>;
  }

  return (
    <ul className="space-y-3">
      {appointments.map((appointment) => (
        <li key={appointment.id} className="p-3 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-card">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-card-foreground">{appointment.title}</h3>
              {appointment.description && <p className="text-xs text-muted-foreground mt-1">{appointment.description}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                Date: {formatDateTime(appointment.date)} {/* Assuming 'date' holds the primary datetime */}
              </p>
              {appointment.location && <p className="text-xs text-muted-foreground mt-0.5">Location: {appointment.location}</p>}
               <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs">
                {appointment.assignedToUserId && (
                    <Badge variant="outline" className="flex items-center gap-1">
                        <UserIcon className="h-3 w-3" /> Assigned: {getUserName(appointment.assignedToUserId)}
                    </Badge>
                )}
                {appointment.attendeesList && appointment.attendeesList.length > 0 && (
                     <Badge variant="secondary" className="flex items-center gap-1">
                        Attendees: {appointment.attendeesList.map(a => a.displayName || a.email).join(', ').substring(0, 30)}{appointment.attendeesList.map(a => a.displayName || a.email).join(', ').length > 30 ? '...' : ''}
                    </Badge>
                )}
               </div>
            </div>
            <div className="flex space-x-1 rtl:space-x-reverse shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditAppointment(appointment)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteAppointment(appointment.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default AppointmentList;
