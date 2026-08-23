import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'

const ClassContext = createContext(null)

export function ClassProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState(() => {
    return localStorage.getItem('selected_class_id') || ''
  })
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [classError, setClassError] = useState(null)

  const fetchClasses = useCallback(async () => {
    if (!isAuthenticated) {
      setClasses([])
      return
    }
    try {
      setLoadingClasses(true)
      setClassError(null)
      const data = await api.classes.list()
      const list = Array.isArray(data) ? data : data?.items || []
      setClasses(list)

      if (list.length > 0) {
        const stillExists = list.some((c) => c.id === selectedClassId)
        if (!selectedClassId || !stillExists) {
          const defaultId = list[0].id
          setSelectedClassId(defaultId)
          localStorage.setItem('selected_class_id', defaultId)
        }
      }
    } catch (err) {
      setClassError(err.message || 'Failed to load classes')
    } finally {
      setLoadingClasses(false)
    }
  }, [isAuthenticated, selectedClassId])

  useEffect(() => {
    let isMounted = true
    if (isAuthenticated) {
      setLoadingClasses(true)
      api.classes.list()
        .then((data) => {
          if (!isMounted) return
          const list = Array.isArray(data) ? data : data?.items || []
          setClasses(list)
          if (list.length > 0) {
            setSelectedClassId((prev) => {
              const stillExists = list.some((c) => c.id === prev)
              if (!prev || !stillExists) {
                const defaultId = list[0].id
                localStorage.setItem('selected_class_id', defaultId)
                return defaultId
              }
              return prev
            })
          }
        })
        .catch((err) => {
          if (!isMounted) return
          setClassError(err.message || 'Failed to load classes')
        })
        .finally(() => {
          if (isMounted) setLoadingClasses(false)
        })
    } else {
      setClasses([])
    }
    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  const selectClass = (classId) => {
    setSelectedClassId(classId)
    localStorage.setItem('selected_class_id', classId)
  }

  const selectedClass = classes.find((c) => c.id === selectedClassId) || null

  const value = {
    classes,
    selectedClassId,
    selectedClass,
    selectClass,
    loadingClasses,
    classError,
    refreshClasses: fetchClasses,
  }

  return <ClassContext.Provider value={value}>{children}</ClassContext.Provider>
}

export function useClass() {
  const ctx = useContext(ClassContext)
  if (!ctx) throw new Error('useClass must be used within a ClassProvider')
  return ctx
}
