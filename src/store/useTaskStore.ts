import { create } from 'zustand'
import { updateTaskProgress } from './events'

interface Task {
  id: string
  progress: number
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
}

interface TaskStore {
  tasks: Record<string, Task>
  createTask: (id?: string) => Task
  updateTask: (id: string, progress: number, status: 'pending' | 'in_progress' | 'completed' | 'failed') => void
  deleteTask: (id: string) => void
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: {},
  
  createTask: (id = crypto.randomUUID()) => {
    const task = { 
      id, 
      progress: 0, 
      status: 'pending' as const 
    };
    
    set(state => ({
      tasks: { ...state.tasks, [id]: task }
    }));
    
    return task;
  },
  
  updateTask: (id, progress, status) => {
    set(state => {
      if (!state.tasks[id]) return state;
      
      const updatedTask = {
        ...state.tasks[id],
        progress,
        status
      };
      
      // Emit event for subscribers
      updateTaskProgress({
        taskId: id,
        progress,
        status
      });
      
      return {
        tasks: { ...state.tasks, [id]: updatedTask }
      };
    });
  },
  
  deleteTask: (id) => {
    set(state => {
      const newTasks = { ...state.tasks };
      delete newTasks[id];
      return { tasks: newTasks };
    });
  }
}));
