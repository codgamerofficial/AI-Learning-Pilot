import { useState, useCallback } from 'react'
import type { Task, TaskApplication } from '../types'

// Mock data for initial implementation
const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Grocery Delivery',
    description: 'Need someone to pick up groceries from local market and deliver to address. List of items will be provided.',
    price: 250,
    category: 'delivery',
    location: 'Koramangala, Bangalore',
    deadline: '2026-04-12',
    requirements: ['Two wheeler', 'Own bag'],
    isActive: true,
    createdAt: new Date().toISOString(),
    applicantCount: 3
  },
  {
    id: '2',
    title: 'Math Tutoring for Class 10',
    description: 'Looking for experienced tutor for CBSE class 10 mathematics. 2 hours daily 5 days a week.',
    price: 800,
    category: 'tutoring',
    location: 'Indiranagar, Bangalore',
    deadline: '2026-04-15',
    requirements: ['10th pass with good marks', 'Previous tutoring experience'],
    contact: '9876543210',
    isActive: true,
    createdAt: new Date().toISOString(),
    applicantCount: 7
  },
  {
    id: '3',
    title: 'Document Submission at Office',
    description: 'Need someone to submit important documents at government office during working hours.',
    price: 300,
    category: 'errands',
    location: 'MG Road, Bangalore',
    deadline: '2026-04-11',
    requirements: ['Valid ID proof'],
    isActive: true,
    createdAt: new Date().toISOString(),
    applicantCount: 2
  },
  {
    id: '4',
    title: 'Website Bug Fix',
    description: 'Small bug fixes required on React website. Knowledge of TypeScript required.',
    price: 1500,
    category: 'tech',
    location: 'Remote',
    deadline: '2026-04-14',
    requirements: ['React', 'TypeScript', 'Git'],
    isActive: true,
    createdAt: new Date().toISOString(),
    applicantCount: 12
  },
  {
    id: '5',
    title: 'Pet Walking',
    description: 'Walk my golden retriever for 1 hour every evening. Must be comfortable with dogs.',
    price: 200,
    category: 'other',
    location: 'HSR Layout, Bangalore',
    deadline: '2026-04-20',
    requirements: ['Experience with dogs', 'Love for animals'],
    isActive: true,
    createdAt: new Date().toISOString(),
    applicantCount: 5
  },
  {
    id: '6',
    title: 'Parcel Pickup from Courier',
    description: 'Pick up parcel from courier office and deliver to home address.',
    price: 180,
    category: 'delivery',
    location: 'Jayanagar, Bangalore',
    deadline: '2026-04-12',
    requirements: ['Two wheeler'],
    isActive: true,
    createdAt: new Date().toISOString(),
    applicantCount: 4
  }
]

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Real API call will be here:
      // const response = await fetch('/api/v1/tasks')
      // const data = await response.json()
      // setTasks(data)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 600))
      setTasks(mockTasks)
    } catch (err) {
      setError('Failed to load tasks. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const applyToTask = useCallback(async (taskId: string, application: Omit<TaskApplication, 'createdAt'>) => {
    setLoading(true)
    setError(null)
    try {
      // Real API call will be here:
      // const response = await fetch(`/api/v1/tasks/${taskId}/apply`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(application)
      // })
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1200))
      
      return { success: true }
    } catch (err) {
      setError('Failed to submit application. Please try again.')
      return { success: false, error: 'Failed to submit application' }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    applyToTask
  }
}
