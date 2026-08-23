const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

export class ApiError extends Error {
  constructor(message, code = 'API_ERROR', status = 500, details = null) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  const token = localStorage.getItem('access_token')

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const config = {
    ...options,
    headers,
  }

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body)
  }

  let response
  try {
    response = await fetch(url, config)
  } catch {
    throw new ApiError('Unable to connect to server. Check network or server status.', 'NETWORK_ERROR', 0)
  }

  // Handle 401 Unauthorized - try token refresh or logout
  if (response.status === 401 && !endpoint.includes('/auth/')) {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json()
          const newAccess = refreshData.data?.access_token || refreshData.access_token
          if (newAccess) {
            localStorage.setItem('access_token', newAccess)
            headers.Authorization = `Bearer ${newAccess}`
            const retryRes = await fetch(url, { ...config, headers })
            const retryJson = await retryRes.json()
            if (!retryRes.ok) {
              throw new ApiError(
                retryJson.error?.message || 'Request failed',
                retryJson.error?.code,
                retryRes.status,
                retryJson.error?.details
              )
            }
            return retryJson.data !== undefined ? retryJson.data : retryJson
          }
        }
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
      }
    }
  }

  let json = null
  const text = await response.text()
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = { raw: text }
    }
  }

  if (!response.ok) {
    const errorData = json?.error || {}
    const message = errorData.message || json?.detail || `HTTP error ${response.status}`
    const code = errorData.code || 'HTTP_ERROR'
    throw new ApiError(message, code, response.status, errorData.details)
  }

  return json?.data !== undefined ? json.data : json
}

export const api = {
  // Generic HTTP helpers
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options) => request(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),

  // Auth API
  auth: {
    requestOtp: (identifier) =>
      request('/auth/otp/request', {
        method: 'POST',
        body: { identifier },
      }),
    verifyOtp: (identifier, code) =>
      request('/auth/otp/verify', {
        method: 'POST',
        body: { identifier, code },
      }),
    me: () => request('/auth/me'),
    updateMe: (data) =>
      request('/auth/me', {
        method: 'PATCH',
        body: data,
      }),
    refresh: (refreshToken) =>
      request('/auth/refresh', {
        method: 'POST',
        body: { refresh_token: refreshToken },
      }),
    logout: (refreshToken) =>
      request('/auth/logout', {
        method: 'POST',
        body: refreshToken ? { refresh_token: refreshToken } : undefined,
      }),
  },

  // Classes & Members API (Aziz Part A)
  classes: {
    list: () => request('/classes'),
    get: (classId) => request(`/classes/${classId}`),
    create: (data) =>
      request('/classes', {
        method: 'POST',
        body: data,
      }),
    listMembers: (classId) => request(`/classes/${classId}/members`),
    removeMember: (classId, userId) =>
      request(`/classes/${classId}/members/${userId}`, {
        method: 'DELETE',
      }),
  },

  // Subjects API (Aziz Part A)
  subjects: {
    list: (classId) => request(`/classes/${classId}/subjects`),
    create: (classId, data) =>
      request(`/classes/${classId}/subjects`, {
        method: 'POST',
        body: data,
      }),
    update: (subjectId, data) =>
      request(`/subjects/${subjectId}`, {
        method: 'PATCH',
        body: data,
      }),
    archive: (subjectId) =>
      request(`/subjects/${subjectId}`, {
        method: 'DELETE',
      }),
  },

  // Topics API (Aziz Part A)
  topics: {
    list: (subjectId) => request(`/subjects/${subjectId}/topics`),
    get: (topicId) => request(`/topics/${topicId}`),
    create: (subjectId, data) =>
      request(`/subjects/${subjectId}/topics`, {
        method: 'POST',
        body: data,
      }),
    update: (topicId, data) =>
      request(`/topics/${topicId}`, {
        method: 'PATCH',
        body: data,
      }),
    archive: (topicId) =>
      request(`/topics/${topicId}`, {
        method: 'DELETE',
      }),
  },

  // Challenges API (Aziz Part A)
  challenges: {
    listByTopic: (topicId) => request(`/topics/${topicId}/challenges`),
    get: (challengeId) => request(`/challenges/${challengeId}`),
    generate: (topicId, data) =>
      request(`/topics/${topicId}/challenges/generate`, {
        method: 'POST',
        body: data,
      }),
    getStatus: (challengeId) => request(`/challenges/${challengeId}/status`),
    createManual: (topicId, data) =>
      request(`/topics/${topicId}/challenges`, {
        method: 'POST',
        body: data,
      }),
    updateStatus: (challengeId, status) =>
      request(`/challenges/${challengeId}/status`, {
        method: 'PATCH',
        body: { status },
      }),
  },

  // Teacher / Analytics API (Muhammad Ali Part B)
  teacher: {
    getDashboard: (classId) => request(`/teacher/classes/${classId}/dashboard`),
    getOverview: (classId, params = {}) => {
      const query = new URLSearchParams()
      if (params.from) query.set('from', params.from)
      if (params.to) query.set('to', params.to)
      const qStr = query.toString()
      return request(`/teacher/classes/${classId}/reports/overview${qStr ? `?${qStr}` : ''}`)
    },
    getTopicsAnalytics: (classId) => request(`/teacher/classes/${classId}/topics/analytics`),
    getTopicAnalytics: (topicId) => request(`/teacher/topics/${topicId}/analytics`),
    getStudents: (classId) => request(`/teacher/classes/${classId}/students`),
    getStudentDetail: (classId, studentUserId) =>
      request(`/teacher/classes/${classId}/students/${studentUserId}`),
    getLeaderboard: (classId, params = {}) => {
      const query = new URLSearchParams()
      if (params.period) query.set('period', params.period)
      if (params.limit) query.set('limit', String(params.limit))
      const qStr = query.toString()
      return request(`/teacher/classes/${classId}/reports/leaderboard${qStr ? `?${qStr}` : ''}`)
    },
    getActivity: (classId, params = {}) => {
      const query = new URLSearchParams()
      if (params.limit) query.set('limit', String(params.limit))
      if (params.cursor) query.set('cursor', params.cursor)
      if (params.type) query.set('type', params.type)
      const qStr = query.toString()
      return request(`/teacher/classes/${classId}/activity${qStr ? `?${qStr}` : ''}`)
    },
  },

  // AI Chat API
  chat: {
    listConversations: (params = {}) => {
      const query = new URLSearchParams()
      if (params.limit) query.set('limit', String(params.limit))
      if (params.offset) query.set('offset', String(params.offset))
      const qStr = query.toString()
      return request(`/ai/chat/conversations${qStr ? `?${qStr}` : ''}`)
    },
    createConversation: (title) =>
      request('/ai/chat/conversations', {
        method: 'POST',
        body: { title: title || 'New Conversation' },
      }),
    getConversation: (conversationId) => request(`/ai/chat/conversations/${conversationId}`),
    deleteConversation: (conversationId) =>
      request(`/ai/chat/conversations/${conversationId}`, { method: 'DELETE' }),
    listMessages: (conversationId, params = {}) => {
      const query = new URLSearchParams()
      if (params.limit) query.set('limit', String(params.limit))
      if (params.before) query.set('before', params.before)
      const qStr = query.toString()
      return request(`/ai/chat/conversations/${conversationId}/messages${qStr ? `?${qStr}` : ''}`)
    },
    sendMessage: (conversationId, content) =>
      request(`/ai/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: { content },
      }),
  },

  // Admin Monitoring & Moderation API
  admin: {
    getOverview: () => request('/admin/overview'),
    getUsers: (params = {}) => {
      const query = new URLSearchParams()
      if (params.role) query.set('role', params.role)
      if (params.status) query.set('status', params.status)
      if (params.search) query.set('search', params.search)
      const qStr = query.toString()
      return request(`/admin/users${qStr ? `?${qStr}` : ''}`)
    },
    updateUserStatus: (userId, status) =>
      request(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: { status },
      }),
    getChallenges: (params = {}) => {
      const query = new URLSearchParams()
      if (params.status) query.set('status', params.status)
      if (params.origin) query.set('origin', params.origin)
      if (params.search) query.set('search', params.search)
      const qStr = query.toString()
      return request(`/admin/challenges${qStr ? `?${qStr}` : ''}`)
    },
    updateChallengeStatus: (challengeId, status) =>
      request(`/admin/challenges/${challengeId}/status`, {
        method: 'PATCH',
        body: { status },
      }),
    getAiJobs: (params = {}) => {
      const query = new URLSearchParams()
      if (params.status) query.set('status', params.status)
      const qStr = query.toString()
      return request(`/admin/ai-jobs${qStr ? `?${qStr}` : ''}`)
    },
    retryAiJob: (jobId) =>
      request(`/admin/ai-jobs/${jobId}/retry`, {
        method: 'POST',
      }),
  },
}
