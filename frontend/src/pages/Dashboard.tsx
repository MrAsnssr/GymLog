import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { LLMChat } from '../components/llm/LLMChat'
import type { LLMChatRef } from '../components/llm/LLMChat'
import { MainLayout } from '../components/layout/MainLayout'

export function Dashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const chatRef = useRef<LLMChatRef>(null)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return
    try {
      // In this chat-centric version, we primarily just need the session
      // but we keep the loading state for consistency if needed later
    } catch (err: any) {
      console.error('Error loading dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-dark text-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary shadow-[0_0_15px_rgba(19,236,91,0.3)]"></div>
          <span className="text-primary font-display font-bold tracking-widest animate-pulse">LOADING</span>
        </div>
      </div>
    )
  }

  return (
    <MainLayout
      actions={
        <>
          <button
            className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-surface-highlight text-text-muted hover:text-white transition-colors"
            title={t('common.clear_chat')}
            onClick={() => chatRef.current?.reset()}
          >
            <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
          </button>
        </>
      }
    >
      <div className="flex-1 flex flex-col h-full bg-background-dark/30">
        <LLMChat ref={chatRef} showResetButton={false} />
      </div>
    </MainLayout>
  )
}
