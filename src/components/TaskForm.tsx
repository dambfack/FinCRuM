
import React, { useState, useEffect } from 'react';
import { type Task, DataItemType, type Contact, type ChecklistItem, type User } from '../lib/types';
import { useDataSync } from '../hooks/use-data-sync';
import { getData, saveData, parseDate, createNotification } from '../lib/utils'; // Added createNotification
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '@/lib/utils';
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { X, PlusCircle, Trash2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

interface TaskFormProps {
  task?: Task;
  initialSelectedContactId?: string;
  onSave: () => void;
  onCancel: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ task, initialSelectedContactId, onSave, onCancel }) => {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [dueDate, setDueDate] = useState<Date | null>(
    task?.dueDate ? parseDate(task.dueDate as string) : null
  );
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(task?.priority || 'medium');
  const [status, setStatus] = useState<'todo' | 'in-progress' | 'done'>(task?.status || 'todo');
  
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactSearchInput, setContactSearchInput] = useState('');
  const [contactSuggestions, setContactSuggestions] = useState<Contact[]>([]);
  const [showContactSuggestions, setShowContactSuggestions] = useState(false);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);

  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(task?.checklist || []);
  const [newChecklistItemText, setNewChecklistItemText] = useState('');

  const [assignedUserId, setAssignedUserId] = useState<string | undefined>(task?.assignedToUserId);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { syncCalendar } = useDataSync();
  const { toast } = useToast();
  const { currentUser } = useAuth(); // Get current user

  useEffect(() => {
    const loadedContacts = getData<Contact[]>(DataItemType.Contacts) || [];
    setAllContacts(loadedContacts);
    const loadedUsers = getData<User[]>(DataItemType.Users) || [];
    setAllUsers(loadedUsers);

    let contactToSelect: Contact | null = null;
    if (task?.associatedContactId) {
      contactToSelect = loadedContacts.find(c => c.id === task.associatedContactId) || null;
    } else if (initialSelectedContactId) {
      contactToSelect = loadedContacts.find(c => c.id === initialSelectedContactId) || null;
    }
    setSelectedContact(contactToSelect);
    if (contactToSelect) {
      setContactSearchInput(`${contactToSelect.firstName} ${contactToSelect.lastName} (${contactToSelect.email})`);
    } else {
      setContactSearchInput('');
    }

    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDueDate(task.dueDate ? parseDate(task.dueDate as string) : null);
      setPriority(task.priority || 'medium');
      setStatus(task.status || 'todo');
      setChecklistItems(task.checklist || []);
      setAssignedUserId(task.assignedToUserId);
    } else {
      // Reset for new task
      setTitle('');
      setDescription('');
      setDueDate(null);
      setPriority('medium');
      setStatus('todo');
      setChecklistItems([]);
      setAssignedUserId(undefined);
    }
  }, [task, initialSelectedContactId]);

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
      setShowContactSuggestions(true);
      setContactSuggestions([]);
      setSelectedContact(null); 
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

  const handleAddChecklistItem = () => {
    if (newChecklistItemText.trim() === '') {
      toast({ title: "Cannot add empty item", variant: "destructive" });
      return;
    }
    setChecklistItems(prev => [...prev, { id: `chk-${Date.now()}`, text: newChecklistItemText.trim(), completed: false }]);
    setNewChecklistItemText('');
  };

  const handleToggleChecklistItem = (itemId: string) => {
    setChecklistItems(prev => prev.map(item => item.id === itemId ? { ...item, completed: !item.completed } : item));
  };

  const handleRemoveChecklistItem = (itemId: string) => {
    setChecklistItems(prev => prev.filter(item => item.id !== itemId));
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const previousAssignedUserId = task?.assignedToUserId;

    const newTaskData: Task = {
      id: task?.id || Date.now().toString(),
      title,
      description,
      dueDate: dueDate ? dueDate.toISOString() : undefined,
      priority,
      status,
      completed: status === 'done',
      associatedContactId: selectedContact?.id || undefined,
      checklist: checklistItems,
      assignedToUserId: assignedUserId,
      createdAt: task?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      googleCalendarEventId: task?.googleCalendarEventId
    };

    const tasks = getData<Task[]>(DataItemType.Tasks) || [];
    const taskIndex = tasks.findIndex((t: Task) => t.id === newTaskData.id);
    
    if (taskIndex > -1) {
      tasks[taskIndex] = newTaskData;
    } else {
      tasks.push(newTaskData);
    }
    saveData<Task[]>(DataItemType.Tasks, tasks);
    
    toast({
      title: task?.id ? "Task Updated" : "Task Added",
      description: `Task "${newTaskData.title}" has been saved.`,
    });

    // Create notification for assignment if assignee changed or is new
    if (assignedUserId && assignedUserId !== previousAssignedUserId) {
      const assignedUser = allUsers.find(u => u.id === assignedUserId);
      createNotification({
        recipientUserId: assignedUserId,
        type: 'assignment',
        title: 'New Task Assignment',
        message: `You have been assigned a new task: "${newTaskData.title}".`,
        relatedItemId: newTaskData.id,
        relatedItemType: DataItemType.Tasks,
      });
    }


    try {
      await syncCalendar();
    } catch (error) {
      console.error('Failed to sync task to Google Calendar:', error);
      toast({ title: "Calendar Sync Error", description: `Failed to sync task: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
    }
    onSave();
  };

  const datePickerInputClassName = cn(
    "flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    "bg-neutral-100 dark:bg-neutral-900",
    "border-neutral-300 dark:border-neutral-700",
    "text-foreground placeholder:text-muted-foreground/70 dark:placeholder:text-muted-foreground/50",
    "mt-1"
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
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
          <Label htmlFor="dueDate">Due Date</Label>
          <DatePicker
            selected={dueDate}
            onChange={(date: Date | null) => setDueDate(date)}
            dateFormat="dd/MM/yyyy"
            className={datePickerInputClassName}
            wrapperClassName="w-full"
            placeholderText="Select a due date"
            popperClassName="react-datepicker-popper"
          />
        </div>
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select value={priority} onValueChange={(value: 'low' | 'medium' | 'high') => setPriority(value)}>
              <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
              </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={(value: 'todo' | 'in-progress' | 'done') => setStatus(value)}>
            <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
            </SelectContent>
        </Select>
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
            placeholder="Search contact name/email..."
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
        <Label htmlFor="assignedToUserId">Assign to User (Optional)</Label>
        <Select value={assignedUserId} onValueChange={(value) => setAssignedUserId(value === 'none' ? undefined : value)}>
          <SelectTrigger id="assignedToUserId" className="w-full mt-1">
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

      <div className="space-y-3">
        <Label>Checklist (Optional)</Label>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={newChecklistItemText}
            onChange={(e) => setNewChecklistItemText(e.target.value)}
            placeholder="Add new checklist item"
            className="h-10 flex-grow"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newChecklistItemText.trim() !== '') {
                e.preventDefault();
                handleAddChecklistItem();
              }
            }}
          />
          <Button type="button" onClick={handleAddChecklistItem} variant="outline" size="icon" title="Add checklist item" disabled={!newChecklistItemText.trim()}>
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>
        {checklistItems.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2 bg-muted/30">
            {checklistItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 p-1.5 hover:bg-muted/50 rounded">
                <div className="flex items-center gap-2 flex-grow">
                  <Checkbox
                    id={`chk-${item.id}`}
                    checked={item.completed}
                    onCheckedChange={() => handleToggleChecklistItem(item.id)}
                  />
                  <Label
                    htmlFor={`chk-${item.id}`}
                    className={cn("text-sm cursor-pointer", item.completed && "line-through text-muted-foreground")}
                  >
                    {item.text}
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveChecklistItem(item.id)}
                  className="h-6 w-6 text-destructive/70 hover:text-destructive"
                  title="Remove item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {task?.id ? 'Update Task' : 'Save Task'}
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;
