
import React, { useEffect, useState } from 'react';
import { type Task, DataItemType, type Contact } from '../lib/types'; // Changed import for DataItemType
import { useDataSync } from '../hooks/use-data-sync';
import { getData, saveData, deleteItemById, formatDateTime } from '../lib/utils';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Trash2, Edit, User, CheckSquare, Square } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';


interface TaskListProps {
  onEditTask: (task: Task) => void;
}

const TaskList: React.FC<TaskListProps> = ({ onEditTask }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    const fetchTasksAndContacts = () => {
      const storedTasks = getData<Task[]>(DataItemType.Tasks) || [];
      const storedContacts = getData<Contact[]>(DataItemType.Contacts) || [];
      setTasks(storedTasks.sort((a, b) => new Date(b.updatedAt as string).getTime() - new Date(a.updatedAt as string).getTime()));
      setContacts(storedContacts);
    };
    fetchTasksAndContacts();
  }, []);

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = deleteItemById<Task>(DataItemType.Tasks, taskId);
    if (updatedTasks) {
      setTasks(updatedTasks);
    }
  };

  const handleToggleComplete = (taskId: string) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed, status: !task.completed ? 'done' : 'todo' } : task
    );
    setTasks(updatedTasks);
    saveData<Task[]>(DataItemType.Tasks, updatedTasks);
  };

  const getPriorityBadgeVariant = (priority?: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getContactName = (contactId?: string) => {
    if (!contactId) return null;
    const contact = contacts.find(c => c.id === contactId);
    return contact ? `${contact.firstName} ${contact.lastName}` : `Contact ID: ${contactId}`;
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
                    <User className="h-3 w-3" /> {getContactName(task.associatedContactId)}
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
