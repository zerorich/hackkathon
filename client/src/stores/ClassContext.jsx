import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'

const ClassContext = createContext(null)

export function ClassProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState(null)
  const [loadingClasses, setLoadingClasses] = useState(true)

  const fetchClasses = async () => {
    if (!isAuthenticated) return
    setLoadingClasses(true)
    try {
      const res = await api.get('/classes')
      const classList = Array.isArray(res) ? res : res.classes || []
      setClasses(classList)

      const saved = localStorage.getItem('maktab_student_class_id')
      if (saved && classList.some((c) => c.id === saved)) {
        setSelectedClassId(saved)
      } else if (classList.length > 0) {
        setSelectedClassId(classList[0].id)
        localStorage.setItem('maktab_student_class_id', classList[0].id)
      }
    } catch (err) {
      console.error('Failed to fetch student classes:', err)
    } finally {
      setLoadingClasses(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchClasses()
    }
  }, [isAuthenticated])

  const selectClass = (classId) => {
    setSelectedClassId(classId)
    localStorage.setItem('maktab_student_class_id', classId)
  }

  const joinClass = async (inviteCode) => {
    const res = await api.post('/classes/join', { invite_code: inviteCode })
    await fetchClasses()
    if (res.class_id) {
      selectClass(res.class_id)
    }
    return res
  }

  const activeClass = classes.find((c) => c.id === selectedClassId) || classes[0] || null

  return (
    <ClassContext.Provider
      value={{
        classes,
        activeClass,
        selectedClassId,
        loadingClasses,
        selectClass,
        joinClass,
        refreshClasses: fetchClasses,
      }}
    >
      {children}
    </ClassContext.Provider>
  )
}

export function useClass() {
  const context = useContext(ClassContext)
  if (!context) throw new Error('useClass must be used within a ClassProvider')
  return context
}
