import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'
import { useAiDebug } from '../../context/AiDebugContext'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface UserProfile {
  display_name: string | null
  gender: 'male' | 'female' | null
  height_cm: number | null
  weight_kg: number | null
  age: number | null
  is_pro: boolean
}

export interface LLMChatRef {
  reset: () => void;
}

interface LLMChatProps {
  showResetButton?: boolean;
}

export const LLMChat = forwardRef<LLMChatRef, LLMChatProps>(({ showResetButton = true }, ref) => {
  const { session, user } = useAuth()
  const { t } = useTranslation()
  const { addLog } = useAiDebug()
  const navigate = useNavigate()

  // Load messages from localStorage or use default welcome message
  const getInitialMessages = (): Message[] => {
    if (typeof window !== 'undefined' && user) {
      const saved = localStorage.getItem(`chat_messages_${user.id}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          return parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        } catch {
          // Invalid JSON, use default
        }
      }
    }
    return [{
      id: '1',
      role: 'assistant',
      content: t('dashboard.welcome'),
      timestamp: new Date(),
    }]
  }

  const [messages, setMessages] = useState<Message[]>(getInitialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Expose reset function via ref
  useImperativeHandle(ref, () => ({
    reset: () => {
      if (confirm(t('common.confirm_reset') || 'Reset conversation?')) {
        clearChat()
      }
    }
  }));

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (user && messages.length > 1) {
      localStorage.setItem(`chat_messages_${user.id}`, JSON.stringify(messages))
    }
  }, [messages, user])

  // Load saved messages when user changes
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`chat_messages_${user.id}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setMessages(parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          })))
        } catch {
          // Invalid JSON, keep default
        }
      }
    }
  }, [user])

  // Load user profile
  useEffect(() => {
    async function loadProfile() {
      if (!user) return
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, gender, height_cm, weight_kg, age, is_pro')
          .eq('user_id', user.id)
          .single()

        if (error) throw error
        if (data) {
          setUserProfile(data)
          // If user isn't pro, make sure pro mode is off
          if (!data.is_pro) setIsPro(false)
        }
      } catch (err) {
        console.error('Failed to load profile:', err)
      }
    }
    loadProfile()
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading || !session) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Build conversation history for context
      const history = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }))

      addLog('request', 'LLMChat', { query: input, history }) // Log Request

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/llm-query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            query: input,
            history,
            userProfile: userProfile,
            isPro: isPro
          }),
        }
      )

      if (!response.ok) throw new Error('Failed to fetch response')

      const data = await response.json()
      addLog('response', 'LLMChat', data) // Log Response

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error: any) {
      addLog('error', 'LLMChat', { message: error.message }) // Log Error
      console.error('Error calling LLM:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ ${error.message || 'Connection lost. Please try again.'}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    const defaultMessages: Message[] = [{
      id: '1',
      role: 'assistant',
      content: t('dashboard.welcome'),
      timestamp: new Date(),
    }]
    setMessages(defaultMessages)
    if (user) {
      localStorage.removeItem(`chat_messages_${user.id}`)
    }
  }

  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Auto-hide confirmation after 3 seconds
  useEffect(() => {
    if (showResetConfirm) {
      const timer = setTimeout(() => setShowResetConfirm(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [showResetConfirm])

  return (
    <div className="flex flex-col h-full relative">
      {/* Sticky Pro Button Header - For non-pro users */}
      {!userProfile?.is_pro && (
        <div className="sticky top-0 z-50 bg-surface-dark/90 backdrop-blur-sm border-b border-white/5 px-3 py-2 flex justify-center">
          <button
            type="button"
            onClick={() => navigate('/pro')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide transition-all bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg hover:scale-105"
          >
            <span className="material-symbols-outlined text-sm">star</span>
            <span className="hidden sm:inline">Upgrade to</span> Hazem Pro
            <span className="opacity-80 text-[9px] sm:text-xs">$5/mo</span>
          </button>
        </div>
      )}

      {/* Chat Stream */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-20 py-8 flex flex-col gap-8 scroll-smooth" id="chat-container">
        {/* Date Separator with Clear Chat */}
        <div className="flex justify-center items-center gap-3">
          <span className="text-xs font-medium text-text-muted uppercase tracking-widest bg-surface-highlight/30 px-3 py-1 rounded-full">
            Today, {format(new Date(), 'h:mm a')}
          </span>
          {showResetButton && messages.length > 1 && (
            <button
              id="reset-chat-btn"
              type="button"
              onClick={(e) => {
                e.preventDefault()
                // Logic handled in onPointerDown for better responsiveness
              }}
              onPointerDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('Reset button pointer down')
                if (showResetConfirm) {
                  clearChat()
                  setShowResetConfirm(false)
                } else {
                  setShowResetConfirm(true)
                }
              }}
              className={`relative z-50 cursor-pointer select-none text-xs font-medium uppercase tracking-widest px-4 py-2 rounded-full transition-all flex items-center gap-2 shadow-sm border border-transparent ${showResetConfirm
                ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse border-red-400'
                : 'text-text-muted hover:text-red-400 bg-surface-highlight/30 hover:bg-surface-highlight hover:border-surface-highlight'
                }`}
              title={showResetConfirm ? 'Click again to confirm' : (t('common.reset') || 'Reset conversation')}
            >
              <span className="material-symbols-outlined text-sm">{showResetConfirm ? 'check' : 'delete_sweep'}</span>
              {showResetConfirm ? (t('common.confirm') || 'Confirm?') : (t('common.clear') || 'Clear')}
            </button>
          )}

          {/* Hazem Pro/Mini Toggle - Only for Pro subscribers */}
          {userProfile?.is_pro && (
            <button
              type="button"
              onClick={() => setIsPro(!isPro)}
              className={`relative z-50 flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all border ${isPro
                ? 'bg-gradient-to-r from-primary to-emerald-500 text-surface-dark border-transparent shadow-[0_0_15px_rgba(19,236,91,0.4)] scale-105'
                : 'bg-surface-highlight/20 text-text-muted border-white/5 hover:border-white/10'}`}
            >
              <span className={`material-symbols-outlined text-sm ${isPro ? 'animate-pulse' : ''}`}>
                {isPro ? 'workspace_premium' : 'bolt'}
              </span>
              {isPro ? 'Hazem Pro (5.2)' : 'Hazem Mini'}
            </button>
          )}
        </div>


        {messages.map((message) => (
          <div
            key={message.id}
            className={`group flex items-start gap-4 max-w-3xl ${message.role === 'user' ? 'flex-row-reverse self-end' : ''}`}
          >
            {/* Avatar */}
            <div className={`h-10 w-10 rounded-full shrink-0 flex items-center justify-center overflow-hidden border ${message.role === 'assistant' ? 'bg-surface-highlight border-primary/30 shadow-[0_0_10px_rgba(19,236,91,0.2)]' : 'bg-gradient-to-tr from-primary to-emerald-600 text-surface-dark font-bold text-xs shadow-md'}`}>
              {message.role === 'assistant' ? (
                <span className="material-symbols-outlined text-primary text-xl">smart_toy</span>
              ) : (
                <span>ME</span>
              )}
            </div>

            <div className={`flex flex-col gap-2 ${message.role === 'user' ? 'items-end' : ''} max-w-[calc(100%-3rem)]`}>
              <div className={`flex items-baseline gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <span className={`${message.role === 'assistant' ? (isPro ? 'text-primary' : 'text-emerald-400') : 'text-white'} text-sm font-bold`}>
                  {message.role === 'assistant' ? (isPro ? 'Hazem Pro' : 'Hazem Mini') : t('common.you', 'You')}
                </span>
                <span className="text-text-muted text-xs">{format(message.timestamp, 'h:mm a')}</span>
              </div>
              <div className="relative group/bubble">
                <div className={`select-text p-4 rounded-2xl ${message.role === 'assistant' ? 'rounded-tl-none bg-surface-highlight text-white' : 'rounded-tr-none bg-primary text-surface-dark font-medium shadow-[0_4px_15px_-3px_rgba(19,236,91,0.3)]'} text-base leading-relaxed shadow-sm`}>
                  {message.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-strong:text-primary">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
                {/* Copy Button */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(message.content)
                    // Optional: Show toast or visual feedback
                  }}
                  className={`absolute ${message.role === 'user' ? '-left-8' : '-right-8'} top-2 opacity-0 group-hover/bubble:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-surface-highlight/50 text-text-muted hover:text-white`}
                  title="Copy text"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-4 max-w-3xl animate-[fadeIn_0.3s_ease-out]">
            <div className="h-10 w-10 rounded-full bg-surface-highlight shrink-0 flex items-center justify-center overflow-hidden border border-primary/30 shadow-[0_0_15px_rgba(19,236,91,0.25)]">
              <span className="material-symbols-outlined text-primary text-xl animate-pulse">smart_toy</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-primary text-sm font-bold">{isPro ? 'Hazem Pro' : 'Hazem'}</span>
              <div className="bg-surface-highlight rounded-2xl rounded-tl-none p-4 shadow-sm">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer Area */}
      <div className="px-4 pb-6 lg:px-40 pt-2 bg-gradient-to-t from-background-dark via-background-dark to-transparent z-10">
        <div className="max-w-[960px] mx-auto flex flex-col gap-3">
          {userProfile?.is_pro && !isPro && (
            <div className="flex items-center justify-between px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl animate-[fadeIn_0.5s_ease-out]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm animate-pulse">info</span>
                <p className="text-[10px] text-primary font-bold uppercase tracking-wider">
                  You're in Base mode. Switch to Pro for GPT-5.2 precision.
                </p>
              </div>
              <button
                onClick={() => setIsPro(true)}
                className="text-[10px] bg-primary text-surface-dark px-2 py-0.5 rounded font-black uppercase hover:scale-105 transition-transform"
              >
                Switch Now
              </button>
            </div>
          )}
          {/* Input Bar */}
          <form onSubmit={handleSubmit} className="relative flex items-center w-full bg-surface-highlight rounded-2xl border border-white/5 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all shadow-xl min-h-[56px]">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('common.type_workout_details')}
              className="flex-1 bg-transparent py-4 px-6 text-white placeholder-text-muted focus:outline-none text-base"
              disabled={loading}
            />
            <div className="flex items-center gap-2 pe-3 ps-1">
              <button type="submit" disabled={loading || !input.trim()} className="h-11 w-11 sm:w-auto sm:px-6 rounded-full sm:rounded-xl bg-primary hover:bg-primary/90 text-surface-dark font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(19,236,91,0.2)] active:scale-95">
                <span className="hidden sm:inline">{t('common.send')}</span>
                <span className="material-symbols-outlined text-xl rtl:rotate-180">send</span>
              </button>
            </div>
          </form>
          <div className="text-center">
            <p className="text-[10px] text-text-muted opacity-50">{t('common.mistakes_disclaimer', 'Muscle Log can make mistakes. Verify important information.')}</p>
          </div>
        </div>
      </div>
    </div>
  )
})
