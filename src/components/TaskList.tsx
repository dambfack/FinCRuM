
import React, { useEffect, useState } from 'react';
import { type Task, DataItemType, type Contact, type User } from '../lib/types'; // Changed import for DataItemType
import { getData, deleteItemById, formatDateTime, saveData } from '../lib/utils';
import { deleteCalendarEventAction } from '@/app/actions/google-calendar-actions';
import { deleteGoogleTaskAction } from '@/app/actions/google-tasks-actions';
import { useDataSync, getGoogleCalendarTokensFromStorage } from '../hooks/use-data-sync';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Trash2, Edit, User as UserIcon, CheckSquare, Square } from 'lucide-react'; // Renamed User to UserIcon
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';


interface TaskListProps {
  onEditTask: (task: Task) => void;
}

const TaskList: React.FC<TaskListProps> = ({ onEditTask }) => {
  const { performSync } = useDataSync();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchTasksAndContacts = () => {
      const storedTasks = getData<Task[]>(DataItemType.Tasks) || [];
      const storedContacts = getData<Contact[]>(DataItemType.Contacts) || [];
      const storedUsers = getData<User[]>(DataItemType.Users) || [];
      setTasks(storedTasks
        .filter(task => task.updatedAt) // Filter out tasks without updatedAt
        .sort((a, b) => {
          const dateA = a.updatedAt ? new Date(a.updatedAt as string).getTime() : 0;
          const dateB = b.updatedAt ? new Date(b.updatedAt as string).getTime() : 0;
          return dateB - dateA;
        })
      );
      setContacts(storedContacts);
      setUsers(storedUsers);
    };
    fetchTasksAndContacts();
  }, []);

  const handleDeleteTask = async (taskId: string) => {
    // Find the task to get its Google Task ID
    const taskToDelete = tasks.find(task => task.id === taskId);
    
    // Delete from local storage first
    const updatedTasks = deleteItemById<Task>(DataItemType.Tasks, taskId);
    if (updatedTasks) {
      setTasks(updatedTasks);
    }
    
    // If the task has a Google Task ID, delete it from Google Tasks
    if (taskToDelete?.googleTaskId) {
      try {
        const googleTokens = getGoogleCalendarTokensFromStorage();
        if (googleTokens && googleTokens.access_token) {
          await deleteGoogleTaskAction(taskToDelete.googleTaskId, googleTokens);
        }
      } catch (error) {
        console.error('Failed to delete task from Google Tasks:', error);
        // Note: We don't show an error toast here as the local deletion was successful
      }
    }
  };

  const handleToggleComplete = (taskId: string) => {
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        const newCompleted = !task.completed;
        const updatedTask: Task = {
          ...task,
          completed: newCompleted,
          status: newCompleted ? 'done' : 'todo'
        };
        return updatedTask;
      }
      return task;
    });
    setTasks(updatedTasks as Task[]);
    saveData<Task[]>(DataItemType.Tasks, updatedTasks as Task[]);
  };

  const getPriorityBadgeVariant = (priority?: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return 'destructive' as const;
      case 'medium': return 'secondary' as const;
      case 'low':
      default: return 'outline' as const;
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

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">No tasks available. Create one to get started!</p>;
  }

  return (
    <ul className="space-y-3">
      {tasks.map((task) => (
        <li key={task.id} className="p-3 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-card">
          <div className="flex items-start space-x-3">
            <Checkbox
              id={`task-${task.id}`}
              checked={task.completed}
              onCheckedChange={() => handleToggleComplete(task.id)}
              className="mt-1"
            />
            <div className="flex-1">
              <label
                htmlFor={`task-${task.id}`}
                className={cn(
                  "font-semibold text-card-foreground cursor-pointer",
                  task.completed && "line-through text-muted-foreground"
                )}
              >
                {task.title}
              </label>
              {task.description && (
                <p className={cn("text-xs text-muted-foreground mt-0.5", task.completed && "line-through")}>
                  {task.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                {task.dueDate && (
                  <span className={cn(task.completed && "line-through")}>
                    Due: {formatDateTime(task.dueDate as string)}
                  </span>
                )}
                {task.priority && (
                  <Badge variant={getPriorityBadgeVariant(task.priority)} className={cn("capitalize", task.completed && "opacity-60")}>
                    {task.priority}
                  </Badge>
                )}
                 {task.status && (
                  <Badge variant={task.status === 'done' ? 'default' : 'secondary'} className={cn("capitalize", task.completed && "opacity-60")}>
                    {task.status.replace('-', ' ')}
                  </Badge>
                )}
                {task.associatedContactId && (
                  <Badge variant="outline" className={cn("flex items-center gap-1", task.completed && "opacity-60")}>
                    <UserIcon className="h-3 w-3" /> For: {getContactName(task.associatedContactId)}
                  </Badge>
                )}
                 {task.assignedToUserId && (
                  <Badge variant="outline" className={cn("flex items-center gap-1", task.completed && "opacity-60")}>
                    <UserIcon className="h-3 w-3" /> Assigned: {getUserName(task.assignedToUserId)}
                  </Badge>
                )}
              </div>
              {task.checklist && task.checklist.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Checklist:</p>
                  <ul className="space-y-0.5 pl-2">
                    {task.checklist.map(item => (
                      <li key={item.id} className="flex items-center gap-1.5 text-xs">
                        {item.completed ? <CheckSquare className="h-3.5 w-3.5 text-green-600" /> : <Square className="h-3.5 w-3.5 text-muted-foreground/70" />}
                        <span className={cn(item.completed && "line-through text-muted-foreground")}>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                   <p className="text-xs text-muted-foreground/80 pl-2">
                      ({task.checklist.filter(i => i.completed).length} of {task.checklist.length} completed)
                    </p>
                </div>
              )}
            </div>
            <div className="flex space-x-1 rtl:space-x-reverse shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditTask(task)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteTask(task.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default TaskList;
