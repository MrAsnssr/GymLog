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
  const { t, i18n } = useTranslation()
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
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
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

  const handleSend = async (content: string) => {
    if (!content.trim() || loading || !session) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content,
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

      addLog('request', 'LLMChat', { query: content, history })

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
            query: content,
            history,
            userProfile: userProfile,
            isPro: isPro,
            currentTime: new Date().toISOString(),
            currentLanguage: i18n.language // Pass current UI language
          }),
        }
      )

      if (!response.ok) throw new Error('Failed to fetch response')

      const data = await response.json()
      addLog('response', 'LLMChat', data)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error: any) {
      addLog('error', 'LLMChat', { message: error.message })
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSend(input)
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

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())
        await transcribeAndSend(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Failed to start recording:', err)
      alert('Microphone access denied')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const transcribeAndSend = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    try {
      // Send audio to transcribe function
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const transcribeRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: formData,
        }
      )

      const transcribeData = await transcribeRes.json()

      if (transcribeData.error) {
        throw new Error(transcribeData.error)
      }

      const transcribedText = transcribeData.text
      if (transcribedText && transcribedText.trim()) {
        await handleSend(transcribedText)
      }
    } catch (err) {
      console.error('Transcription failed:', err)
      alert('Voice transcription failed')
    } finally {
      setIsTranscribing(false)
    }
  }


  return (
    <div className="flex flex-col h-full relative">
      {/* Floating Pro Button - For non-pro users */}
      {!userProfile?.is_pro && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[45] w-[90%] max-w-sm">
          <button
            type="button"
            onClick={() => navigate('/pro')}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all bg-gradient-to-r from-primary to-emerald-500 text-surface-dark shadow-[0_8px_30px_rgb(0,0,0,0.5)] hover:scale-[1.02] active:scale-95 group"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl group-hover:rotate-12 transition-transform">workspace_premium</span>
              <div className="flex flex-col items-start translate-y-[1px]">
                <span className="text-[11px] font-black uppercase tracking-tighter leading-none">Upgrade to Pro</span>
                <span className="text-[10px] font-bold opacity-80 leading-none">Get GPT-5.2 Precision</span>
              </div>
            </div>
            <div className="bg-white/20 px-2 py-1 rounded-lg text-[10px] font-black">
              $5/mo
            </div>
          </button>
        </div>
      )}

      {/* Chat Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-20 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6 lg:gap-8 scroll-smooth" id="chat-container">


        {messages.map((message) => (
          <div
            key={message.id}
            className={`group flex items-start gap-2 sm:gap-4 max-w-3xl ${message.role === 'user' ? 'flex-row-reverse self-end' : ''}`}
          >
            {/* Avatar */}
            <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full shrink-0 flex items-center justify-center overflow-hidden border ${message.role === 'assistant' ? 'bg-surface-highlight border-primary/30 shadow-[0_0_10px_rgba(19,236,91,0.2)]' : 'bg-gradient-to-tr from-primary to-emerald-600 text-surface-dark font-bold text-[10px] sm:text-xs shadow-md'}`}>
              {message.role === 'assistant' ? (
                <span className="material-symbols-outlined text-primary text-lg sm:text-xl">smart_toy</span>
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
                <div className={`select-text p-3 sm:p-4 rounded-2xl ${message.role === 'assistant' ? 'rounded-tl-none bg-surface-highlight text-white' : 'rounded-tr-none bg-primary text-surface-dark font-medium shadow-[0_4px_15px_-3px_rgba(19,236,91,0.3)]'} text-sm sm:text-base leading-relaxed shadow-sm`}>
                  {message.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none prose-p:my-0.5 prose-strong:text-primary">
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
      <div className="px-2 pb-4 lg:px-40 pt-1 bg-gradient-to-t from-background-dark via-background-dark to-transparent z-10">
        <div className="max-w-[960px] mx-auto flex flex-col gap-2">
          {userProfile?.is_pro && !isPro && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl animate-[fadeIn_0.5s_ease-out]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xs">info</span>
                <p className="text-[9px] text-primary font-bold uppercase tracking-wider">
                  Base Mode Active. Switch to Pro?
                </p>
              </div>
              <button
                onClick={() => setIsPro(true)}
                className="text-[9px] bg-primary text-surface-dark px-2 py-0.5 rounded-lg font-black uppercase hover:scale-105 transition-transform"
              >
                Switch
              </button>
            </div>
          )}
          {/* Input Bar */}
          <form onSubmit={handleSubmit} className="relative flex items-center w-full bg-surface-highlight/40 rounded-[20px] border border-white/5 focus-within:border-primary/40 transition-all shadow-xl min-h-[52px]">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isTranscribing ? 'Transcribing...' : (isRecording ? 'Recording...' : t('common.type_workout_details'))}
              className="flex-1 bg-transparent py-4 px-6 text-white placeholder-text-muted focus:outline-none text-base"
              disabled={loading || isRecording || isTranscribing}
            />
            <div className="flex items-center gap-2 pe-3 ps-1">
              {/* Mode Toggle (Pro Only) */}
              {userProfile?.is_pro && (
                <button
                  type="button"
                  onClick={() => setIsPro(!isPro)}
                  className={`flex items-center gap-1.5 h-11 px-3 rounded-full text-[10px] font-bold uppercase transition-all border ${isPro
                    ? 'bg-primary/20 text-primary border-primary/30 shadow-[0_0_10px_rgba(19,236,91,0.2)]'
                    : 'bg-surface-dark/50 text-text-muted border-white/5 hover:border-white/20'
                    }`}
                  title={isPro ? 'Switch to Mini Model' : 'Switch to Pro Model'}
                >
                  <span className="material-symbols-outlined text-[18px]">{isPro ? 'stars' : 'bolt'}</span>
                  <span className="hidden sm:inline">{isPro ? 'PRO 5.2' : 'MINI'}</span>
                </button>
              )}

              {/* Mic Button */}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={loading || isTranscribing}
                className={`h-11 w-11 rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${isRecording
                  ? 'bg-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                  : isTranscribing
                    ? 'bg-amber-500'
                    : 'bg-surface-dark/50 hover:bg-surface-dark border border-white/10'
                  }`}
              >
                {isTranscribing ? (
                  <span className="material-symbols-outlined text-lg sm:text-xl text-white animate-spin">hourglass_empty</span>
                ) : isRecording ? (
                  <span className="material-symbols-outlined text-lg sm:text-xl text-white">stop</span>
                ) : (
                  <span className="material-symbols-outlined text-lg sm:text-xl text-primary">mic</span>
                )}
              </button>
              {/* Send Button */}
              <button type="submit" disabled={loading || !input.trim() || isRecording || isTranscribing} className="h-11 w-11 sm:w-auto sm:px-6 rounded-full sm:rounded-xl bg-primary hover:bg-primary/90 text-surface-dark font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(19,236,91,0.2)] active:scale-95">
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
