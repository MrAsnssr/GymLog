import { LLMChat } from '../components/llm/LLMChat'
import { MainLayout } from '../components/layout/MainLayout'
import { useTranslation } from 'react-i18next'

export function Assistant() {
  const { t } = useTranslation()

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col h-full bg-background-dark/30">
        <LLMChat />
      </div>
    </MainLayout>
  )
}
