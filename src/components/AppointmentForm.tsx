
import React, { useState, useEffect, useCallback } from 'react';
import { DataItemType, type Appointment, type Contact, type AppointmentAttendee, type User } from '../lib/types';
import { useDataSync } from '../hooks/use-data-sync';
import { createCalendarEventAction, updateCalendarEventAction } from '../app/actions/google-calendar-actions';
import { getData, saveData, parseDate, createNotification } from '../lib/utils'; // Added createNotification
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { X, UserPlus } from 'lucide-react';
import { Badge } from './ui/badge';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth


interface AppointmentFormProps {
  initialData?: Appointment;
  initialSelectedContactId?: string; // New prop
  onSave: (appointment: Appointment) => void;
  onCancel: () => void;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ initialData, initialSelectedContactId, onSave, onCancel }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(initialData?.date ? parseDate(initialData.date as string) : null);
  const [time, setTime] = useState(initialData?.time || '');
  const [location, setLocation] = useState(initialData?.location || '');
  
  const [currentAttendees, setCurrentAttendees] = useState<AppointmentAttendee[]>([]);
  const [attendeeInput, setAttendeeInput] = useState('');
  const [contactSuggestions, setContactSuggestions] = useState<Contact[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [assignedUserId, setAssignedUserId] = useState<string | undefined>(initialData?.assignedToUserId);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  const { syncCalendar } = useDataSync();
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const { toast } = useToast();
  const { currentUser } = useAuth(); // Get current user

  // Load all contacts and users once on mount
  useEffect(() => {
    const loadedContacts = getData<Contact[]>(DataItemType.Contacts) || [];
    setAllContacts(loadedContacts);
    const loadedUsers = getData<User[]>(DataItemType.Users) || [];
    setAllUsers(loadedUsers);
  }, []);

  // Effect for handling initialData, initialSelectedContactId and resetting form
  useEffect(() => {
    if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description || '');
        setAppointmentDate(initialData.date ? parseDate(initialData.date as string) : null);
        setTime(initialData.time || '');
        setLocation(initialData.location || '');
        setAssignedUserId(initialData.assignedToUserId);

        if (initialData.attendeesList) {
            setCurrentAttendees(initialData.attendeesList);
        } else if (initialData.invitedContacts && initialData.invitedContacts.length > 0 && allContacts.length > 0) {
            const mappedAttendees = initialData.invitedContacts
                .map(contactId => {
                    const contact = allContacts.find(c => c.id === contactId);
                    if (contact) {
                        return {
                            email: contact.email,
                            displayName: `${contact.firstName} ${contact.lastName}`,
                            contactId: contact.id
                        };
                    }
                    return null;
                })
                .filter(Boolean) as AppointmentAttendee[];
            setCurrentAttendees(mappedAttendees);
        } else {
             setCurrentAttendees([]); // Ensure it's an empty array if no initial attendees
        }
    } else if (initialSelectedContactId && allContacts.length > 0) {
      // If creating new with a pre-selected contact
      setTitle('');
      setDescription('');
      setAppointmentDate(null);
      setTime('');
      setLocation('');
      setAssignedUserId(undefined);
      const contact = allContacts.find(c => c.id === initialSelectedContactId);
      if (contact) {
        setCurrentAttendees([{
          email: contact.email,
          displayName: `${contact.firstName} ${contact.lastName}`,
          contactId: contact.id
        }]);
      } else {
        setCurrentAttendees([]);
      }
    } else {
      // Reset for new form without pre-selection
      setTitle('');
      setDescription('');
      setAppointmentDate(null);
      setTime('');
      setLocation('');
      setAssignedUserId(undefined);
      setCurrentAttendees([]);
    }
  }, [initialData, initialSelectedContactId, allContacts]);

  const handleAttendeeInputChange = (value: string) => {
    setAttendeeInput(value);
    if (value.trim().length > 0) { 
        setShowSuggestions(true); 
        const suggestions = allContacts.filter(contact =>
            `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(value.toLowerCase()) ||
            contact.email.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 5); 
        setContactSuggestions(suggestions);
    } else {
        setShowSuggestions(true); 
        setContactSuggestions([]);
    }
  };

  const addExistingContactAsAttendee = (contact: Contact) => {
    if (!currentAttendees.find(a => a.contactId === contact.id || a.email.toLowerCase() === contact.email.toLowerCase())) {
        setCurrentAttendees(prev => [...prev, {
            email: contact.email,
            displayName: `${contact.firstName} ${contact.lastName}`,
            contactId: contact.id
        }]);
    }
    setAttendeeInput('');
    setContactSuggestions([]);
    setShowSuggestions(false); // Close after selection
  };

  const addManualAttendee = () => {
    const input = attendeeInput.trim();
    if (input) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        let email = '';
        let displayName = input;

        if (emailPattern.test(input)) {
            email = input;
        }
        
        if (email && !currentAttendees.find(a => a.email.toLowerCase() === email.toLowerCase())) {
             setCurrentAttendees(prev => [...prev, { email, displayName }]);
        } else if (!email && displayName && !currentAttendees.find(a => a.displayName?.toLowerCase() === displayName.toLowerCase())) {
            setCurrentAttendees(prev => [...prev, { email: '', displayName }]); // Email can be empty if only name provided
             toast({ title: "Attendee Added by Name", description: "Note: Email is needed for calendar invitations.", variant: "default" });
        } else if (email) {
            toast({ title: "Attendee Exists", description: "This email is already in the attendee list.", variant: "default" });
        } else if (displayName) {
            toast({ title: "Attendee Exists", description: "This name is already in the attendee list.", variant: "default" });
        }
        setAttendeeInput('');
        setContactSuggestions([]);
        setShowSuggestions(false); // Close after adding
    }
  };
  
  const removeAttendee = (emailToRemove: string, displayNameToRemove?: string) => {
    setCurrentAttendees(prev => prev.filter(attendee => {
        if (emailToRemove && attendee.email) return attendee.email.toLowerCase() !== emailToRemove.toLowerCase();
        if (displayNameToRemove && attendee.displayName) return attendee.displayName.toLowerCase() !== displayNameToRemove.toLowerCase();
        if (emailToRemove && !attendee.email && attendee.displayName) return attendee.displayName.toLowerCase() !== emailToRemove.toLowerCase(); // Case where input was name, stored as displayName
        return true; // Keep if no match
    }));
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!appointmentDate) newErrors.date = 'Date is required';
    if (!time.trim()) newErrors.time = 'Time is required';
    else if (!/^\d{2}:\d{2}$/.test(time)) newErrors.time = 'Time must be in HH:MM format';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !appointmentDate) {
      return;
    }

    const appointmentDateTimeString = `${appointmentDate.toISOString().split('T')[0]}T${time}:00`;
    const appointmentDateTime = new Date(appointmentDateTimeString);
    
    if (isNaN(appointmentDateTime.getTime())) {
        setErrors(prev => ({...prev, time: "Invalid date or time combination"}));
        return;
    }

    const previousAssignedUserId = initialData?.assignedToUserId;

    const newOrUpdatedAppointment: Appointment = {
      id: initialData?.id || Date.now().toString(),
      title,
      description,
      date: appointmentDate.toISOString(),
      time,
      start: appointmentDateTime.toISOString(),
      end: new Date(appointmentDateTime.getTime() + 60 * 60 * 1000).toISOString(), 
      location,
      attendeesList: currentAttendees, 
      invitedContacts: currentAttendees.filter(a => a.contactId).map(a => a.contactId!), 
      assignedToUserId: assignedUserId,
      googleCalendarEventId: initialData?.googleCalendarEventId,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const appointments = getData<Appointment[]>(DataItemType.Appointments) || [];
    const existingIndex = appointments.findIndex(a => a.id === newOrUpdatedAppointment.id);

    if (existingIndex >= 0) {
      appointments[existingIndex] = newOrUpdatedAppointment;
    } else {
      appointments.push(newOrUpdatedAppointment);
    }
    saveData<Appointment[]>(DataItemType.Appointments, appointments);

    toast({
      title: initialData?.id ? "Appointment Updated" : "Appointment Added",
      description: `Appointment "${newOrUpdatedAppointment.title}" has been saved.`,
    });

    // Create notification for assignment if assignee changed or is new
    if (assignedUserId && assignedUserId !== previousAssignedUserId) {
      const assignedUser = allUsers.find(u => u.id === assignedUserId);
      createNotification({
        recipientUserId: assignedUserId,
        type: 'assignment',
        title: 'New Appointment Assignment',
        message: `You have been assigned to an appointment: "${newOrUpdatedAppointment.title}".`,
        relatedItemId: newOrUpdatedAppointment.id,
        relatedItemType: DataItemType.Appointments,
      });
    }

    try {
      const googleTokens = typeof window !== 'undefined' ? {
        access_token: localStorage.getItem(DataItemType.GoogleDriveAccessToken),
        refresh_token: localStorage.getItem(DataItemType.GoogleDriveRefreshToken),
        expiry_date: parseInt(localStorage.getItem('googleDriveTokenExpiry') || '0', 10)
      } : null;

      if (!googleTokens || !googleTokens.access_token) {
        console.warn("No Google tokens found, skipping calendar sync for appointment.");
        toast({ title: "Google Calendar Sync Skipped", description: "Not authenticated with Google. Please link Google Calendar.", variant: "default"});
      } else {
        let result;
        if (newOrUpdatedAppointment.googleCalendarEventId){
          result = await updateCalendarEventAction(newOrUpdatedAppointment.googleCalendarEventId, newOrUpdatedAppointment, 'appointment', googleTokens);
        } else {
          result = await createCalendarEventAction(newOrUpdatedAppointment, 'appointment', googleTokens);
        }
        
        if (result.success && result.data) {
          if (result.data.event && result.data.event.id && !newOrUpdatedAppointment.googleCalendarEventId) {
            newOrUpdatedAppointment.googleCalendarEventId = result.data.event.id;
            const updatedAppointmentsWithEventId = appointments.map(app => app.id === newOrUpdatedAppointment.id ? newOrUpdatedAppointment : app);
            saveData<Appointment[]>(DataItemType.Appointments, updatedAppointmentsWithEventId);
          }
          if (result.data.newTokens && typeof window !== 'undefined') {
            if(result.data.newTokens.access_token) localStorage.setItem(DataItemType.GoogleDriveAccessToken, result.data.newTokens.access_token);
            if(result.data.newTokens.refresh_token) localStorage.setItem(DataItemType.GoogleDriveRefreshToken, result.data.newTokens.refresh_token);
            if(result.data.newTokens.expiry_date) localStorage.setItem('googleDriveTokenExpiry', result.data.newTokens.expiry_date.toString());
          }
          toast({ title: "Google Calendar Synced", description: "Appointment synced with Google Calendar successfully.", variant: "default"});
        } else {
          throw new Error(result.error || 'Failed to sync with Google Calendar');
        }
        // Remove the syncCalendar() call to prevent duplicates - individual sync is already done above
      }
    } catch (error) {
      console.error('Error saving or updating appointment with Google Calendar:', error);
      toast({ title: "Google Calendar Error", description: `Failed to sync appointment: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive"});
    }

    onSave(newOrUpdatedAppointment);
  };

  const datePickerInputClassName = cn(
    "flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    "bg-neutral-100 dark:bg-neutral-900",
    "border-neutral-300 dark:border-neutral-700",
    "text-foreground placeholder:text-muted-foreground/70 dark:placeholder:text-muted-foreground/50",
    "mt-1",
    errors.date ? 'border-destructive' : ''
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date">Date</Label>
          <DatePicker
            selected={appointmentDate}
            onChange={(date: Date | null) => setAppointmentDate(date)}
            className={datePickerInputClassName}
            wrapperClassName="w-full"
            dateFormat="dd/MM/yyyy"
            popperClassName="react-datepicker-popper"
          />
          {errors.date && <p className="text-sm text-destructive mt-1">{errors.date}</p>}
        </div>
        <div>
          <Label htmlFor="time">Time (HH:MM)</Label>
          <Input
            type="time"
            id="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={errors.time ? 'border-destructive' : ''}
          />
          {errors.time && <p className="text-sm text-destructive mt-1">{errors.time}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="attendeeInput">Attendees</Label>
        <div className="flex items-center gap-2">
            <Command shouldFilter={false} className="relative rounded-md border overflow-visible">
                <CommandInput
                    id="attendeeInput"
                    value={attendeeInput}
                    onValueChange={handleAttendeeInputChange}
                    onFocus={() => setShowSuggestions(true)} 
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} 
                    placeholder="Type name or email..."
                    className="h-10"
                />
                {showSuggestions && (
                    <div className="absolute z-[51] top-full mt-1 w-full rounded-md border bg-popover shadow-lg">
                        <CommandList>
                            {contactSuggestions.length === 0 && attendeeInput.trim().length > 0 ? ( 
                                <CommandEmpty>No matching contacts found.</CommandEmpty>
                            ) : contactSuggestions.length === 0 && attendeeInput.trim().length === 0 ? (
                                <CommandEmpty>Type to search for contacts.</CommandEmpty>
                            ) : (
                                contactSuggestions.map(contact => (
                                    <CommandItem
                                        key={contact.id}
                                        value={`${contact.firstName} ${contact.lastName} (${contact.email})`}
                                        onSelect={() => addExistingContactAsAttendee(contact)}
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
            <Button type="button" onClick={addManualAttendee} variant="outline" size="icon" title="Add manual attendee" disabled={!attendeeInput.trim()}>
                <UserPlus className="h-4 w-4"/>
            </Button>
        </div>
        {currentAttendees.length > 0 && (
            <div className="space-y-1 pt-2">
                <p className="text-xs text-muted-foreground">Added Attendees:</p>
                <div className="flex flex-wrap gap-2">
                    {currentAttendees.map((attendee, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {attendee.displayName || attendee.email}
                            <button type="button" onClick={() => removeAttendee(attendee.email, attendee.displayName)} className="ml-1 rounded-full hover:bg-destructive/20 p-0.5">
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            </div>
        )}
      </div>

      <div>
        <Label htmlFor="assignedToUserIdAppointment">Assign to User (Optional)</Label>
        <Select value={assignedUserId} onValueChange={(value) => setAssignedUserId(value === 'none' ? undefined : value)}>
          <SelectTrigger id="assignedToUserIdAppointment" className="w-full mt-1">
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
          {initialData || initialSelectedContactId ? 'Update Appointment' : 'Save Appointment'}
        </Button>
      </div>
    </form>
  );
};

export default AppointmentForm;
