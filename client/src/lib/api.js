const BASE_URL = '/api/v1'

class ApiClient {
  getAccessToken() {
    return localStorage.getItem('maktab_student_access_token')
  }

  getRefreshToken() {
    return localStorage.getItem('maktab_student_refresh_token')
  }

  setTokens(access, refresh) {
    if (access) localStorage.setItem('maktab_student_access_token', access)
    if (refresh) localStorage.setItem('maktab_student_refresh_token', refresh)
  }

  clearTokens() {
    localStorage.removeItem('maktab_student_access_token')
    localStorage.removeItem('maktab_student_refresh_token')
  }

  async request(path, options = {}) {
    const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
    const token = this.getAccessToken()

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    try {
      let res = await fetch(url, { ...options, headers })

      if (res.status === 401 && this.getRefreshToken()) {
        const refreshed = await this.refreshToken()
        if (refreshed) {
          headers.Authorization = `Bearer ${this.getAccessToken()}`
          res = await fetch(url, { ...options, headers })
        } else {
          this.clearTokens()
          window.location.reload()
          throw new Error('Session expired')
        }
      }

      const json = await res.json()

      if (!res.ok) {
        const errorMsg = json.error?.message || json.message || `Request failed with status ${res.status}`
        const code = json.error?.code || 'UNKNOWN_ERROR'
        const error = new Error(errorMsg)
        error.code = code
        error.details = json.error?.details
        throw error
      }

      return json.data !== undefined ? json.data : json
    } catch (err) {
      throw err
    }
  }

  async refreshToken() {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) return false

    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (res.ok) {
        const json = await res.json()
        const data = json.data || json
        this.setTokens(data.access_token, data.refresh_token)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  get(path) {
    return this.request(path, { method: 'GET' })
  }

  post(path, body) {
    return this.request(path, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  put(path, body) {
    return this.request(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  patch(path, body) {
    return this.request(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  }

  delete(path) {
    return this.request(path, { method: 'DELETE' })
  }

  // AI Chat Helpers
  chat = {
    listConversations: (params = {}) => {
      const query = new URLSearchParams()
      if (params.limit) query.set('limit', String(params.limit))
      if (params.offset) query.set('offset', String(params.offset))
      const qStr = query.toString()
      return this.get(`/ai/chat/conversations${qStr ? `?${qStr}` : ''}`)
    },
    createConversation: (title) =>
      this.post('/ai/chat/conversations', { title: title || 'AI Tutor Chat' }),
    getConversation: (conversationId) => this.get(`/ai/chat/conversations/${conversationId}`),
    deleteConversation: (conversationId) =>
      this.delete(`/ai/chat/conversations/${conversationId}`),
    listMessages: (conversationId, params = {}) => {
      const query = new URLSearchParams()
      if (params.limit) query.set('limit', String(params.limit))
      if (params.before) query.set('before', params.before)
      const qStr = query.toString()
      return this.get(`/ai/chat/conversations/${conversationId}/messages${qStr ? `?${qStr}` : ''}`)
    },
    sendMessage: (conversationId, content) =>
      this.post(`/ai/chat/conversations/${conversationId}/messages`, { content }),
  }
}

export const api = new ApiClient()
