import React, { useEffect, useState } from 'react';
import { Reminder, DataItemType } from '../lib/types';
import { useDataSync } from '../hooks/use-data-sync';
import { getData, deleteData } from '../lib/utils';

interface ReminderListProps {
  //onViewDetails: (reminder: Reminder) => void;
  //onMarkDismissed: (reminderId: string) => void;
  //onEdit: (reminder: Reminder) => void;
}

const ReminderList: React.FC<ReminderListProps> = ({
  //onViewDetails,
  //onMarkDismissed,
  //onEdit,
}) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const { triggerSync } = useDataSync();

  useEffect(() => {
    const fetchReminders = async () => {
      const storedReminders = await getData<Reminder[]>(DataItemType.Reminders);
      if (storedReminders) {
        setReminders(storedReminders);
      }
    };
    fetchReminders();
  }, []);

  const handleDelete = async (reminderId: string) => {
    const updatedReminders = await deleteData<Reminder>(DataItemType.Reminders, reminderId);
    setReminders(updatedReminders)
    triggerSync();
  };

  if (reminders.length === 0) {
    return <p>No reminders available.</p>;
  }
  return (
      <ul>
        {reminders.map((reminder) => (
          <li key={reminder.id}>
            <h3>{reminder.title}</h3>
            <p>{reminder.dateTime.toLocaleString()}</p>
            {/*
            <button onClick={() => onViewDetails(reminder)}>View Details</button>
            {!reminder.dismissed && (
              <button onClick={() => onMarkDismissed(reminder.id)}>Mark Dismissed</button>
            )}
            <button onClick={() => onEdit(reminder)}>Edit</button>
            */}
            <button onClick={() => handleDelete(reminder.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
  );
};

export default ReminderList;