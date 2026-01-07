import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { MainLayout } from '../components/layout/MainLayout'
import { format } from 'date-fns'

interface ExerciseStat {
    exercise_id: string
    name: string
    category: string
    max_weight: number
    max_reps: number
    total_sets: number
    last_date: string
    personal_record?: boolean
}

export function ExerciseStats() {
    const { user } = useAuth()
    const { t } = useTranslation()
    const [stats, setStats] = useState<ExerciseStat[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        if (user) {
            loadStats()
        }
    }, [user])

    const loadStats = async () => {
        if (!user) return
        setLoading(true)
        setError(null)

        try {
            // Fetch combined stats for all exercises
            const { data, error: fetchError } = await supabase
                .from('workout_sets')
                .select(`
          weight_lbs,
          reps,
          created_at,
          exercise_id,
          exercises (name, category),
          workout_sessions (session_date)
        `)
                .eq('user_id', user.id)

            if (fetchError) throw fetchError

            if (data) {
                // Group by exercise
                const grouped = data.reduce((acc: Record<string, any>, curr: any) => {
                    const exId = curr.exercise_id
                    if (!acc[exId]) {
                        const exercise = Array.isArray(curr.exercises) ? curr.exercises[0] : curr.exercises
                        const session = Array.isArray(curr.workout_sessions) ? curr.workout_sessions[0] : curr.workout_sessions

                        acc[exId] = {
                            exercise_id: exId,
                            name: exercise?.name || 'Unknown',
                            category: exercise?.category || 'other',
                            max_weight: 0,
                            max_reps: 0,
                            total_sets: 0,
                            last_date: session?.session_date || curr.created_at
                        }
                    }

                    acc[exId].total_sets += 1

                    if (curr.weight_lbs > acc[exId].max_weight) {
                        acc[exId].max_weight = curr.weight_lbs
                        acc[exId].max_reps = curr.reps
                    } else if (curr.weight_lbs === acc[exId].max_weight && curr.reps > acc[exId].max_reps) {
                        acc[exId].max_reps = curr.reps
                    }

                    const session = Array.isArray(curr.workout_sessions) ? curr.workout_sessions[0] : curr.workout_sessions
                    const currDate = session?.session_date || curr.created_at
                    if (new Date(currDate) > new Date(acc[exId].last_date)) {
                        acc[exId].last_date = currDate
                    }

                    return acc
                }, {})

                const statsArray = Object.values(grouped) as ExerciseStat[]
                // Sort by last date
                statsArray.sort((a, b) => new Date(b.last_date).getTime() - new Date(a.last_date).getTime())
                setStats(statsArray)
            }
        } catch (err: any) {
            console.error('Error loading stats:', err)
            setError(err.message || 'Failed to load stats')
        } finally {
            setLoading(false)
        }
    }

    const filteredStats = stats.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background-dark text-primary">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary shadow-[0_0_15px_rgba(19,236,91,0.3)]"></div>
                    <span className="text-primary font-display font-bold tracking-widest animate-pulse uppercase">ANALYZING GAINS</span>
                </div>
            </div>
        )
    }

    return (
        <MainLayout title={t('common.exercise_stats', 'Exercise Stats')} showAssistantStatus={false}>
            <div className="h-full overflow-y-auto px-6 lg:px-20 py-8 scroll-smooth">
                <div className="max-w-6xl mx-auto">

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div>
                            <h2 className="text-3xl font-display font-black text-white tracking-tight">EXERCISE STATS</h2>
                            <p className="text-text-muted mt-1 uppercase text-xs font-bold tracking-widest">Track your progression & PRs</p>
                        </div>

                        <div className="relative group">
                            <span className="absolute inset-y-0 left-4 flex items-center text-text-muted group-focus-within:text-primary transition-colors">
                                <span className="material-symbols-outlined text-xl">search</span>
                            </span>
                            <input
                                type="text"
                                placeholder={t('common.search_exercises', 'Search exercises...')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full md:w-80 bg-surface-dark border border-surface-highlight focus:border-primary/50 text-white pl-12 pr-4 py-3 rounded-2xl outline-none transition-all placeholder:text-text-muted/50 font-medium"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3 animate-shake">
                            <span className="material-symbols-outlined">error</span>
                            <span className="font-medium">{error}</span>
                        </div>
                    )}

                    {filteredStats.length === 0 ? (
                        <div className="bg-surface-dark/50 border border-surface-highlight rounded-3xl p-16 text-center backdrop-blur-sm border-dashed">
                            <div className="h-20 w-20 bg-surface-highlight/30 rounded-full flex items-center justify-center mx-auto mb-6 text-text-muted">
                                <span className="material-symbols-outlined text-4xl">monitoring</span>
                            </div>
                            <h3 className="text-white text-xl font-bold mb-2">No stats found</h3>
                            <p className="text-text-muted">Start logging workouts with Hazem to see your progress here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredStats.map((stat) => (
                                <div
                                    key={stat.exercise_id}
                                    className="group relative bg-surface-dark/40 border border-surface-highlight hover:border-primary/40 rounded-3xl p-6 transition-all backdrop-blur-sm overflow-hidden"
                                >
                                    {/* Background decoration */}
                                    <div className="absolute -right-4 -top-4 text-white/5 group-hover:text-primary/10 transition-colors">
                                        <span className="material-symbols-outlined text-8xl leading-none">fitness_center</span>
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-6">
                                            <div>
                                                <span className="text-[10px] font-black tracking-widest text-primary/70 uppercase mb-1 block">
                                                    {stat.category}
                                                </span>
                                                <h4 className="text-white text-xl font-bold group-hover:text-primary transition-all">
                                                    {stat.name}
                                                </h4>
                                            </div>
                                            <div className="h-10 w-10 rounded-xl bg-surface-highlight/30 flex items-center justify-center text-primary">
                                                <span className="material-symbols-outlined text-xl">trending_up</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="bg-surface-highlight/10 rounded-2xl p-4 border border-white/5 group-hover:border-primary/20 transition-all">
                                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Max Weight</p>
                                                <p className="text-2xl font-display font-black text-white leading-none">
                                                    {stat.max_weight} <span className="text-sm font-body font-bold text-text-muted">LBS</span>
                                                </p>
                                            </div>
                                            <div className="bg-surface-highlight/10 rounded-2xl p-4 border border-white/5 group-hover:border-primary/20 transition-all">
                                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Best Reps</p>
                                                <p className="text-2xl font-display font-black text-white leading-none">
                                                    {stat.max_reps} <span className="text-sm font-body font-bold text-text-muted">REPS</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-surface-highlight/50">
                                            <div className="flex items-center gap-2 text-text-muted">
                                                <span className="material-symbols-outlined text-sm">view_timeline</span>
                                                <span className="text-xs font-bold uppercase tracking-wider">{stat.total_sets} Sets Logged</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">
                                                Last: {format(new Date(stat.last_date), 'MMM d, yyyy')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    )
}
