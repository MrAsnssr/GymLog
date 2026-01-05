import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { WorkoutSessionForm } from '../components/workouts/WorkoutSessionForm'
import type { WorkoutSession } from '../lib/types'
import { MainLayout } from '../components/layout/MainLayout'

export function NewWorkout() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleSessionCreated = (newSession: WorkoutSession) => {
    navigate(`/workouts/${newSession.id}`)
  }

  return (
    <MainLayout title={t('common.sessions')} showAssistantStatus={false}>
      <div className="h-full overflow-y-auto px-6 lg:px-20 py-8 scroll-smooth">
        <div className="max-w-2xl mx-auto">
          <div className="mb-10 flex flex-col gap-4">
            <h1 className="text-white text-3xl font-black tracking-tight uppercase">
              {t('sessions.start_new' || 'Start New Workout')}
            </h1>
          </div>

          <div className="bg-surface-dark border border-surface-highlight rounded-3xl p-8 lg:p-10 shadow-2xl backdrop-blur-sm">
            <WorkoutSessionForm onSessionCreated={handleSessionCreated} />
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
