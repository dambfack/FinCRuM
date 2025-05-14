
import React, { useState, useEffect } from 'react';
import { Reminder, Contact, DataItemType, User } from '../lib/types';
import { useDataSync } from '../hooks/use-data-sync';
import { createCalendarEvent as addReminderToGoogleCalendar, updateCalendarEvent as updateReminderInGoogleCalendar } from '../services/google-calendar';
import { getData, saveData, parseDate } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { cn } from '@/lib/utils';
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { X } from 'lucide-react';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';

interface ReminderFormProps {
  initialReminder?: Reminder;
  initialSelectedContactId?: string;
  onSave: (reminder: Reminder) => void;
  onCancel: () => void;
}

const ReminderForm: React.FC<ReminderFormProps> = ({ initialReminder, initialSelectedContactId, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reminderDateTime, setReminderDateTime] = useState<Date | null>(null);
  
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactSearchInput, setContactSearchInput] = useState('');
  const [contactSuggestions, setContactSuggestions] = useState<Contact[]>([]);
  const [showContactSuggestions, setShowContactSuggestions] = useState(false);

  const [assignedUserId, setAssignedUserId] = useState<string | undefined>(initialReminder?.assignedToUserId);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  const { syncCalendar } = useDataSync();
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const loadedContacts = getData<Contact[]>(DataItemType.Contacts) || [];
    setAllContacts(loadedContacts);
    const loadedUsers = getData<User[]>(DataItemType.Users) || [];
    setAllUsers(loadedUsers);

    let contactToSelect: Contact | null = null;
    if (initialReminder?.associatedContactId) {
      contactToSelect = loadedContacts.find(c => c.id === initialReminder.associatedContactId) || null;
    } else if (initialSelectedContactId) {
      contactToSelect = loadedContacts.find(c => c.id === initialSelectedContactId) || null;
    }
    
    setSelectedContact(contactToSelect);
    if (contactToSelect) {
        setContactSearchInput(`${contactToSelect.firstName} ${contactToSelect.lastName} (${contactToSelect.email})`);
    }


    if (initialReminder) {
      setTitle(initialReminder.title);
      setDescription(initialReminder.description || '');
      setReminderDateTime(initialReminder.dateTime ? parseDate(initialReminder.dateTime as string) : null);
      setAssignedUserId(initialReminder.assignedToUserId);
    } else {
      setTitle('');
      setDescription('');
      setReminderDateTime(null);
      setAssignedUserId(undefined);
      // Reset selected contact if not editing and no initial contact is passed
      if (!initialSelectedContactId) {
        setSelectedContact(null);
        setContactSearchInput('');
      }
    }
  }, [initialReminder, initialSelectedContactId]);


  const handleContactSearchChange = (value: string) => {
    setContactSearchInput(value);
    if (value.trim().length > 0) {
      setShowContactSuggestions(true);
      const suggestions = allContacts.filter(contact =>
        `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(value.toLowerCase()) ||
        contact.email.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setContactSuggestions(suggestions);
    } else {
      setShowContactSuggestions(true); // Keep open to show 'type to search' or clear
      setContactSuggestions([]);
      setSelectedContact(null); // Clear selection if input is empty
    }
  };

  const selectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setContactSearchInput(`${contact.firstName} ${contact.lastName} (${contact.email})`);
    setShowContactSuggestions(false);
    setContactSuggestions([]);
  };

  const clearSelectedContact = () => {
    setSelectedContact(null);
    setContactSearchInput('');
    setContactSuggestions([]);
    setShowContactSuggestions(false);
  };

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
      associatedContactId: selectedContact?.id || undefined,
      assignedToUserId: assignedUserId,
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

    toast({
      title: initialReminder?.id ? "Reminder Updated" : "Reminder Added",
      description: `Reminder "${newOrUpdatedReminder.title}" has been saved.`,
    });

    try {
      const googleTokens = typeof window !== 'undefined' ? {
        access_token: localStorage.getItem(DataItemType.GoogleDriveAccessToken),
        refresh_token: localStorage.getItem(DataItemType.GoogleDriveRefreshToken),
        expiry_date: parseInt(localStorage.getItem('googleDriveTokenExpiry') || '0', 10)
      } : null;

      if (!googleTokens || !googleTokens.access_token) {
        console.warn("No Google tokens found, skipping calendar sync for reminder.");
         toast({ title: "Google Calendar Sync Skipped", description: "Not authenticated with Google. Please link Google Calendar.", variant: "default"});
      } else {
        let result;
        if (initialReminder?.googleCalendarEventId) {
          result = await updateReminderInGoogleCalendar(initialReminder.googleCalendarEventId, newOrUpdatedReminder, 'reminder', googleTokens);
        } else {
          result = await addReminderToGoogleCalendar(newOrUpdatedReminder, 'reminder', googleTokens);
        }
        if (result.event && result.event.id && !newOrUpdatedReminder.googleCalendarEventId) {
            newOrUpdatedReminder.googleCalendarEventId = result.event.id;
            const updatedRemindersWithEventId = currentReminders.map(rem => rem.id === newOrUpdatedReminder.id ? newOrUpdatedReminder : rem);
            saveData<Reminder[]>(DataItemType.Reminders, updatedRemindersWithEventId);
        }
        if (result.newTokens && typeof window !== 'undefined') {
            if(result.newTokens.access_token) localStorage.setItem(DataItemType.GoogleDriveAccessToken, result.newTokens.access_token);
            if(result.newTokens.refresh_token) localStorage.setItem(DataItemType.GoogleDriveRefreshToken, result.newTokens.refresh_token);
            if(result.newTokens.expiry_date) localStorage.setItem('googleDriveTokenExpiry', result.newTokens.expiry_date.toString());
        }
        await syncCalendar(); 
      }
    } catch (error) {
      console.error('Error saving reminder or syncing with Google Calendar:', error);
      toast({ title: "Google Calendar Error", description: `Failed to sync reminder: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive"});
    }
    
    onSave(newOrUpdatedReminder);
  };

  const datePickerInputClassName = cn(
    "flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    "bg-neutral-100 dark:bg-neutral-900",
    "border-neutral-300 dark:border-neutral-700",
    "text-foreground placeholder:text-muted-foreground/70 dark:placeholder:text-muted-foreground/50",
    "mt-1", 
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
            popperClassName="react-datepicker-popper" 
        />
        {errors.dateTime && <p className="text-sm text-destructive mt-1">{errors.dateTime}</p>}
      </div>
      
      <div>
        <Label htmlFor="associatedContactSearch">Associated Contact (Optional)</Label>
        <Command shouldFilter={false} className="relative rounded-md border mt-1 overflow-visible">
          <CommandInput
            id="associatedContactSearch"
            value={contactSearchInput}
            onValueChange={handleContactSearchChange}
            onFocus={() => setShowContactSuggestions(true)}
            onBlur={() => setTimeout(() => setShowContactSuggestions(false), 150)}
            placeholder="Search or type contact name/email..."
            className="h-10"
          />
          {showContactSuggestions && (
            <div className="absolute z-[51] top-full mt-1 w-full rounded-md border bg-popover shadow-lg">
              <CommandList>
                {contactSuggestions.length === 0 && contactSearchInput.trim().length > 0 ? (
                  <CommandEmpty>No matching contacts found.</CommandEmpty>
                ) : contactSuggestions.length === 0 && contactSearchInput.trim().length === 0 ? (
                   <CommandEmpty>Type to search for contacts.</CommandEmpty>
                ) : (
                  contactSuggestions.map(contact => (
                    <CommandItem
                      key={contact.id}
                      value={`${contact.firstName} ${contact.lastName} (${contact.email})`}
                      onSelect={() => selectContact(contact)}
                      className="cursor-pointer"
                    >
                      {contact.firstName} {contact.lastName} ({contact.email})
                    </CommandItem>
                  ))
                )}
              </CommandList>
            </div>
          )}
        </Command>
        {selectedContact && (
          <div className="mt-2 flex items-center">
            <Badge variant="secondary" className="flex items-center gap-1 text-sm">
              {selectedContact.firstName} {selectedContact.lastName}
              <button type="button" onClick={clearSelectedContact} className="ml-1 rounded-full hover:bg-destructive/20 p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="assignedToUserIdReminder">Assign to User (Optional)</Label>
        <Select value={assignedUserId} onValueChange={(value) => setAssignedUserId(value === 'none' ? undefined : value)}>
          <SelectTrigger id="assignedToUserIdReminder" className="w-full mt-1">
            <SelectValue placeholder="Select user to assign" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {allUsers.map(user => (
              <SelectItem key={user.id} value={user.id}>
                {user.name} ({user.role})
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
          {initialReminder || initialSelectedContactId ? 'Update Reminder' : 'Add Reminder'}
        </Button>
      </div>
    </form>
  );
};

export default ReminderForm;
