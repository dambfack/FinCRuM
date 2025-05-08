import React, { useEffect, useState } from 'react';
import { Task } from '../lib/types';
import { useDataSync } from '../hooks/use-data-sync';
import { getLocalData, saveLocalData } from '../lib/utils';

interface TaskListProps {
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  onViewTask,
  onEditTask,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { triggerSync } = useDataSync();

  useEffect(() => {
    const fetchTasks = async () => {
      const data = await getLocalData();
      setTasks(data.tasks || []);
    };
    fetchTasks();
  }, []);

  const handleDeleteTask = async (taskId: string) => {
    const updatedTasks = tasks.filter((task) => task.id !== taskId);
    setTasks(updatedTasks);

    const data = await getLocalData();
    await saveLocalData({
      ...data,
      tasks: updatedTasks,
    });
    triggerSync();
  };

  const handleMarkComplete = async (taskId: string) => {
    const updatedTasks = tasks.map(task => task.id === taskId ? { ...task, completed: true } : task);
      setTasks(updatedTasks);
      const data = await getLocalData();
      await saveLocalData({
          ...data,
          tasks: updatedTasks,
      });
      triggerSync();
  }

  return (
    <div>
      <h2>Tasks</h2>
      {tasks?.length === 0 ? (
        <p>No tasks found.</p>
      ) : (
        <ul>
          {tasks.map((task) => (
            <li key={task.id}>
              <h3>{task.title}</h3>
              <p>{task.description}</p>
              <p>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</p>
              <p>Priority: {task.priority}</p>
              <p>Status: {task.status}</p>
              <button onClick={() => onViewTask(task)}>View</button>
              {!task.completed && (
                <button onClick={() => handleMarkComplete(task.id)}>Mark Complete</button>
              )}
              <button onClick={() => onEditTask(task)}>Edit</button>
              <button onClick={() => onDeleteTask(task.id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TaskList;