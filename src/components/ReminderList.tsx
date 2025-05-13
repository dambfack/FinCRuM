import React, { useEffect, useState } from 'react';
import { Reminder, DataItemType } from '../lib/types';
import { useDataSync } from '../hooks/use-data-sync';
import { getData, deleteItemById, formatDateTime } from '../lib/utils'; // Added formatDateTime
import { Button } from './ui/button'; // Assuming Button component is available
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Trash2, Edit, Eye } from 'lucide-react'; // Icons

interface ReminderListProps {
  onEdit: (reminder: Reminder) => void; // Added onEdit prop
  // onViewDetails: (reminder: Reminder) => void; // Can be added if needed
  // onMarkDismissed: (reminderId: string) => void;
}

const ReminderList: React.FC<ReminderListProps> = ({
  onEdit,
  // onViewDetails,
  // onMarkDismissed,
}) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const { triggerSync } = useDataSync(); // Assuming triggerSync is still relevant for other data types

  useEffect(() => {
    const fetchReminders = () => { // Removed async as getData is synchronous
      const storedReminders = getData<Reminder[]>(DataItemType.Reminders);
      if (storedReminders) {
        setReminders(storedReminders);
      }
    };
    fetchReminders();
  }, []);

  const handleDelete = (reminderId: string) => { // Removed async
    const updatedReminders = deleteItemById<Reminder>(DataItemType.Reminders, reminderId);
    if (updatedReminders) {
      setReminders(updatedReminders);
    }
    // triggerSync(); // Re-evaluate if sync is needed immediately after every delete
  };

  if (reminders.length === 0) {
    return <p className="text-sm text-muted-foreground">No reminders available. Add one to get started!</p>;
  }
  return (
      <ul className="space-y-3">
        {reminders.map((reminder) => (
          <li key={reminder.id} className="p-3 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-card">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-card-foreground">{reminder.title}</h3>
                {reminder.description && <p className="text-xs text-muted-foreground mt-1">{reminder.description}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  Due: {formatDateTime(reminder.dateTime)}
                </p>
                {reminder.associatedContactId && <p className="text-xs text-muted-foreground mt-0.5">For: Contact ID {reminder.associatedContactId}</p>}
              </div>
              <div className="flex space-x-1 rtl:space-x-reverse shrink-0">
                {/* <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onViewDetails(reminder)}>
                  <Eye className="h-4 w-4" />
                </Button> */}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(reminder)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(reminder.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* {!reminder.dismissed && (
              <Button size="sm" variant="outline" className="mt-2" onClick={() => onMarkDismissed(reminder.id)}>Mark Dismissed</Button>
            )} */}
          </li>
        ))}
      </ul>
  );
};

export default ReminderList;
