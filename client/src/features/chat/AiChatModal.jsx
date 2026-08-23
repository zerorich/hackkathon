import { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  Send,
  Bot,
  User,
  X,
  Plus,
  Trash2,
  MessageSquare,
  Loader2,
} from 'lucide-react'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/Button'

export function AiChatModal({ isOpen, onClose }) {
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loadingConv, setLoadingConv] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load conversations list
  const fetchConversations = async () => {
    setLoadingConv(true)
    try {
      const res = await api.chat.listConversations()
      const list = res.items || (Array.isArray(res) ? res : [])
      setConversations(list)
      if (list.length > 0 && !activeConvId) {
        setActiveConvId(list[0].id)
      } else if (list.length === 0) {
        // Auto create first conversation
        handleNewConversation('AI Tutor - Getting Started')
      }
    } catch (err) {
      console.error('Failed to load chat conversations:', err)
    } finally {
      setLoadingConv(false)
    }
  }

  // Load messages in active conversation
  const fetchMessages = async (convId) => {
    if (!convId) return
    setLoadingMessages(true)
    setError(null)
    try {
      const res = await api.chat.listMessages(convId, { limit: 50 })
      const list = res.items || (Array.isArray(res) ? res : [])
      setMessages(list)
      setTimeout(scrollToBottom, 100)
    } catch (err) {
      setError(err.message || 'Failed to load message history')
    } finally {
      setLoadingMessages(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchConversations()
    }
  }, [isOpen])

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId)
    }
  }, [activeConvId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleNewConversation = async (title = 'New Study Session') => {
    try {
      const res = await api.chat.createConversation(title)
      const newConv = res.data || res
      setConversations((prev) => [newConv, ...prev])
      setActiveConvId(newConv.id)
      setMessages([])
    } catch (err) {
      setError(err.message || 'Failed to create conversation')
    }
  }

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation()
    try {
      await api.chat.deleteConversation(convId)
      const nextList = conversations.filter((c) => c.id !== convId)
      setConversations(nextList)
      if (activeConvId === convId) {
        if (nextList.length > 0) {
          setActiveConvId(nextList[0].id)
        } else {
          setActiveConvId(null)
          setMessages([])
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault()
    const text = inputText.trim()
    if (!text || sending || !activeConvId) return

    setInputText('')
    setSending(true)
    setError(null)

    // Optimistic user message
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      const res = await api.chat.sendMessage(activeConvId, text)
      const assistantMsg = res.assistant_message
      if (assistantMsg) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          res.user_message || tempUserMsg,
          assistantMsg,
        ])
      }
    } catch (err) {
      setError(err.message || 'AI Tutor temporarily unavailable')
    } finally {
      setSending(false)
      setTimeout(scrollToBottom, 100)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100, backdropFilter: 'blur(8px)' }}>
      <div
        className="modal-content"
        style={{
          width: '90%',
          maxWidth: '860px',
          height: '80vh',
          maxHeight: '680px',
          padding: 0,
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.25)',
        }}
      >
        {/* Left Sidebar: Conversations */}
        <div
          style={{
            width: '240px',
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          {/* Header */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#fff' }}>AI Tutor Sessions</span>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              style={{ width: '100%', fontSize: '0.78rem' }}
              onClick={() => handleNewConversation(`Study Session #${conversations.length + 1}`)}
            >
              New Chat
            </Button>
          </div>

          {/* Conversations List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {conversations.map((conv) => {
              const isSel = conv.id === activeConvId
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: isSel ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                    border: isSel ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                    color: isSel ? '#818cf8' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: isSel ? '600' : '500',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conv.title || 'Untitled Session'}
                    </span>
                  </div>
                  {conversations.length > 1 && (
                    <button
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Delete chat"
                    >
                      <Trash2 className="w-3 h-3 hover:text-rose-400" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Main Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)' }}>
          {/* Chat Top Header */}
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#fff' }}>
                  AI Curriculum Assistant
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Ask questions, understand formulas, and get hints on topics
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Stream */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {loadingMessages ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', color: 'var(--text-muted)' }}>
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                <span style={{ fontSize: '0.85rem' }}>Loading discussion...</span>
              </div>
            ) : messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '20px' }}>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '16px',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px',
                  }}
                >
                  <Bot className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>
                  Ask your AI Tutor Anything!
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '380px', marginBottom: '20px' }}>
                  Get step-by-step explanations, math solutions, and personalized practice advice.
                </p>

                {/* Quick starter prompts */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '440px' }}>
                  {[
                    'Explain quadratic equations in simple terms',
                    'How does photosynthesis work?',
                    'Give me a tip to remember trigonometry formulas',
                  ].map((prompt, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => {
                        setInputText(prompt)
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '14px',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-subtle)',
                        color: '#c7d2fe',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      💡 {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isAssistant = msg.role === 'ASSISTANT'
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: isAssistant ? 'row' : 'row-reverse',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        backgroundColor: isAssistant ? 'rgba(99, 102, 241, 0.25)' : 'rgba(6, 182, 212, 0.25)',
                        border: isAssistant ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(6, 182, 212, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        flexShrink: 0,
                      }}
                    >
                      {isAssistant ? <Bot className="w-3.5 h-3.5 text-indigo-400" /> : <User className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>

                    <div
                      style={{
                        maxWidth: '75%',
                        padding: '12px 16px',
                        borderRadius: '14px',
                        backgroundColor: isAssistant ? 'rgba(30, 41, 59, 0.9)' : 'rgba(99, 102, 241, 0.25)',
                        border: isAssistant ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(99, 102, 241, 0.4)',
                        color: 'var(--text-primary)',
                        fontSize: '0.88rem',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                )
              })
            )}

            {sending && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontSize: '0.82rem', paddingLeft: '38px' }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI Tutor is thinking...</span>
              </div>
            )}

            {error && (
              <div style={{ color: '#f87171', fontSize: '0.8rem', textAlign: 'center', padding: '6px' }}>
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '10px',
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
            }}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a question about your lessons or challenges..."
              disabled={sending || !activeConvId}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-card)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!inputText.trim() || sending || !activeConvId}
              loading={sending}
              icon={Send}
            >
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
