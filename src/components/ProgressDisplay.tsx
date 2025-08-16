import { useTaskStore } from '../store/useTaskStore';

interface ProgressDisplayProps {
  taskId?: string;
  showLabel?: boolean;
  className?: string;
}

export function ProgressDisplay({ 
  taskId, 
  showLabel = true,
  className = ''
}: ProgressDisplayProps) {
  // Get task directly from store - this is reactive by default with Zustand
  const task = taskId ? useTaskStore(state => state.tasks[taskId]) : null;
  
  // Don't render anything if no task or if task is pending/completed
  if (!task || task.status === 'pending' || (task.status === 'completed' && task.progress === 100)) {
    return null;
  }
  
  // Get values directly from the task
  const { progress, status } = task;
  
  return (
    <div className={`progress-display ${className}`}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">
            {status === 'in_progress' ? 'Processing...' : 
             status === 'completed' ? 'Completed' : 
             status === 'failed' ? 'Failed' : 'Pending'}
          </span>
          <span className="text-sm font-medium">{progress}%</span>
        </div>
      )}
      
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div 
          className={`h-2.5 rounded-full transition-all duration-300 ease-in-out ${
            status === 'failed' ? 'bg-red-500' : 
            status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
