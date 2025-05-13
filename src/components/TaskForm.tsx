import React, { useState, useEffect } from 'react';
import { Task, DataItemType } from '../lib/types'; // Import DataItemType
import { useDataSync } from '../hooks/use-data-sync';
import { getData, saveData, parseDate } from '../lib/utils'; // Import helpers
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface TaskFormProps {
  task?: Task;
  onSave: () => void; // Callback after save
  onCancel: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ task, onSave, onCancel }) => {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [dueDate, setDueDate] = useState<Date | null>(
    task?.dueDate ? parseDate(task.dueDate as string) : null
  );
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(task?.priority || 'medium');
  const [status, setStatus] = useState<'todo' | 'in-progress' | 'done'>(task?.status || 'todo');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const { syncCalendar } = useDataSync(); // Assuming syncData is a broader cloud sync

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDueDate(task.dueDate ? parseDate(task.dueDate as string) : null);
      setPriority(task.priority || 'medium');
      setStatus(task.status || 'todo');
    }
  }, [task]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const newTaskData: Task = {
      id: task?.id || Date.now().toString(),
      title,
      description,
      dueDate: dueDate ? dueDate.toISOString() : undefined,
      priority,
      status,
      completed: status === 'done', // Set completed based on status
      createdAt: task?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      googleCalendarEventId: task?.googleCalendarEventId // Preserve existing ID
    };

    const tasks = getData<Task[]>(DataItemType.Tasks) || [];
    const taskIndex = tasks.findIndex((t: Task) => t.id === newTaskData.id);
    
    if (taskIndex > -1) {
      tasks[taskIndex] = newTaskData;
    } else {
      tasks.push(newTaskData);
    }
    saveData<Task[]>(DataItemType.Tasks, tasks);
    
    try {
      // Sync this specific task with Google Calendar
      // This part needs to be adapted based on how create/updateCalendarEvent is structured in google-calendar.ts
      // For simplicity, assuming a function that handles both create and update based on googleCalendarEventId
      // await syncTaskToGoogleCalendar(newTaskData); 
      await syncCalendar(); // This might sync all items, adjust if granular control is needed
    } catch (error) {
        console.error('Failed to sync task to Google Calendar:', error);
    }

    onSave(); // Call the onSave callback
  };

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
        <Label htmlFor="dueDate">Due Date</Label>
        <DatePicker
          selected={dueDate}
          onChange={(date: Date | null) => setDueDate(date)}
          dateFormat="MM/dd/yyyy"
          className="w-full mt-1 block border rounded-md shadow-sm focus:ring-ring focus:border-ring sm:text-sm p-2 h-10"
          wrapperClassName="w-full"
          placeholderText="Select a due date"
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

      <div className="flex justify-end space-x-2">
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
