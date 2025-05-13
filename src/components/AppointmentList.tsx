import React, { useEffect, useState } from 'react';
import { Appointment, DataItemType } from '../lib/types'; // Updated import
import { useDataSync } from '../hooks/use-data-sync';
import { getData, deleteItemById, formatDateTime } from '../lib/utils'; // Updated import
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Trash2, Edit, Eye } from 'lucide-react'; // Icons


interface AppointmentListProps {
  onEditAppointment: (appointment: Appointment) => void;
  // handleViewDetails?: (appointmentId: string) => void; // Optional
}


const AppointmentList: React.FC<AppointmentListProps> = ({ onEditAppointment }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const { triggerSync } = useDataSync(); // Assuming this is for broader sync, not just appointments

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = () => {
    const storedAppointments = getData<Appointment[]>(DataItemType.Appointments) || [];
    setAppointments(storedAppointments);
  };

  // const handleViewDetails = (appointmentId: string) => {
  //   console.log(`View details for appointment: ${appointmentId}`);
  //   // Implement view logic, e.g., open a modal
  // };

  const handleDeleteAppointment = (appointmentId: string) => {
    const updatedAppointments = deleteItemById<Appointment>(DataItemType.Appointments, appointmentId);
    if (updatedAppointments) {
      setAppointments(updatedAppointments);
    }
    // triggerSync(); // Consider if needed immediately or handled by form save/global sync
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
            </div>
            <div className="flex space-x-1 rtl:space-x-reverse shrink-0">
              {/* <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewDetails(appointment.id)}>
                <Eye className="h-4 w-4" />
              </Button> */}
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
