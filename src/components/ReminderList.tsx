
import React, { useEffect, useState } from 'react';
import { Reminder, DataItemType, Contact, User } from '../lib/types'; // Added Contact, User
import { useDataSync, getGoogleCalendarTokensFromStorage } from '../hooks/use-data-sync';
import { getData, deleteItemById, formatDateTime } from '../lib/utils';
import { deleteCalendarEventAction } from '@/app/actions/google-calendar-actions'; 
import { Button } from './ui/button'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Trash2, Edit, Eye, User as UserIcon } from 'lucide-react'; // Added UserIcon
import { Badge } from './ui/badge'; // Added Badge
import { cn } from '@/lib/utils'; // Added cn

interface ReminderListProps {
  onEdit: (reminder: Reminder) => void; 
}

const ReminderList: React.FC<ReminderListProps> = ({ onEdit }) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const { performSync } = useDataSync();

  useEffect(() => {
    const fetchRemindersData = () => { 
      const storedReminders = getData<Reminder[]>(DataItemType.Reminders) || [];
      const storedContacts = getData<Contact[]>(DataItemType.Contacts) || [];
      const storedUsers = getData<User[]>(DataItemType.Users) || [];
      setReminders(storedReminders
        .filter(reminder => reminder.dateTime) // Filter out reminders without dateTime
        .sort((a, b) => {
          const dateA = a.dateTime ? new Date(a.dateTime as string).getTime() : 0;
          const dateB = b.dateTime ? new Date(b.dateTime as string).getTime() : 0;
          return dateA - dateB;
        })
      );
      setContacts(storedContacts);
      setUsers(storedUsers);
    };
    fetchRemindersData();
  }, []);

  const handleDelete = async (reminderId: string) => { 
    // Find the reminder to get its Google Calendar event ID
    const reminderToDelete = reminders.find(reminder => reminder.id === reminderId);
    
    // Delete from local storage first
    const updatedReminders = deleteItemById<Reminder>(DataItemType.Reminders, reminderId);
    if (updatedReminders) {
      setReminders(updatedReminders);
    }
    
    // If the reminder has a Google Calendar event ID, delete it from Google Calendar
    if (reminderToDelete?.googleCalendarEventId) {
      try {
        const googleTokens = getGoogleCalendarTokensFromStorage();
        if (googleTokens && googleTokens.access_token) {
          await deleteCalendarEventAction(reminderToDelete.googleCalendarEventId, googleTokens);
        }
      } catch (error) {
        console.error('Failed to delete reminder from Google Calendar:', error);
        // Note: We don't show an error toast here as the local deletion was successful
      }
    }
  };

  const getContactName = (contactId?: string) => {
    if (!contactId) return null;
    const contact = contacts.find(c => c.id === contactId);
    return contact ? `${contact.firstName} ${contact.lastName}` : `Contact ID: ${contactId}`;
  };

  const getUserName = (userId?: string) => {
    if (!userId) return null;
    const user = users.find(u => u.id === userId);
    return user ? user.name : `User ID: ${userId}`;
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
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs">
                    {reminder.associatedContactId && (
                        <Badge variant="outline" className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3" /> For: {getContactName(reminder.associatedContactId)}
                        </Badge>
                    )}
                    {reminder.assignedToUserId && (
                        <Badge variant="outline" className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3" /> Assigned: {getUserName(reminder.assignedToUserId)}
                        </Badge>
                    )}
                </div>
              </div>
              <div className="flex space-x-1 rtl:space-x-reverse shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(reminder)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(reminder.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
  );
};

export default ReminderList;
