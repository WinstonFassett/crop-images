import { emitter } from 'matchina'

// Event to show all result tabs (optimistic UI)
export const [onShowAllResultTabs, showAllResultTabs] = emitter<void>()

// Event for task progress updates
export const [onTaskProgress, updateTaskProgress] = emitter<{
  taskId: string,
  progress: number,
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
}>()

