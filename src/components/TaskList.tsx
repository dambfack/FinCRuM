import React, { useEffect, useState } from 'react';
import { Task, DataItemType } from '../lib/types';
import { useDataSync } from '../hooks/use-data-sync';
import { getData, saveData, deleteItemById, formatDateTime } from '../lib/utils'; // Added formatDateTime
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Trash2, Edit, Eye } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';


interface TaskListProps {
  // onViewTask: (task: Task) => void; // Keep if a detailed view modal is planned
  onEditTask: (task: Task) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  // onViewTask,
  onEditTask,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  // const { triggerSync } = useDataSync(); // syncData from useDataSync is now called in TaskForm

  useEffect(() => {
    const fetchTasks = () => { // Removed async
      const storedTasks = getData<Task[]>(DataItemType.Tasks) || [];
      setTasks(storedTasks);
    };
    fetchTasks();
  }, []); // Re-fetch if a task is saved (though TaskForm handles its own save)

  const handleDeleteTask = (taskId: string) => { // Removed async
    const updatedTasks = deleteItemById<Task>(DataItemType.Tasks, taskId);
    if (updatedTasks) {
      setTasks(updatedTasks);
    }
    // Consider if triggerSync is needed here or handled globally/periodically
  };

  const handleToggleComplete = (taskId: string) => { // Removed async
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed, status: !task.completed ? 'done' : 'todo' } : task
    );
    setTasks(updatedTasks);
    saveData<Task[]>(DataItemType.Tasks, updatedTasks);
    // Consider if triggerSync is needed here
  };

  const getPriorityBadgeVariant = (priority?: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary'; // or 'warning' if you add that variant
      case 'low': return 'outline';
      default: return 'outline';
    }
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
              <div className="flex items-center space-x-2 mt-1.5 text-xs text-muted-foreground">
                {task.dueDate && (
                  <span className={cn(task.completed && "line-through")}>
                    Due: {formatDateTime(task.dueDate)}
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
              </div>
            </div>
            <div className="flex space-x-1 rtl:space-x-reverse shrink-0">
              {/* <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onViewTask(task)}>
                <Eye className="h-4 w-4" />
              </Button> */}
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
