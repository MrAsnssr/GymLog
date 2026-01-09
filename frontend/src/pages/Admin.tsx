import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { MainLayout } from '../components/layout/MainLayout'
import { format } from 'date-fns'
import { useAiDebug } from '../context/AiDebugContext'

interface WorkoutSet {
    id: string
    session_id: string
    exercise_id: string
    set_number: number
    weight_lbs: number | null
    reps: number | null
    created_at: string
    exercise?: {
        name: string
    }
}

interface FoodLog {
    id: string
    meal_date: string
    meal_type: string
    food_name: string
    calories: number | null
    protein_g: number | null
    carbs_g: number | null
    fat_g: number | null
    created_at: string
}

export function AdminPage() {
    const { user } = useAuth()
    const { logs, clearLogs, enabled, setEnabled } = useAiDebug()
    const [activeTab, setActiveTab] = useState<'workouts' | 'food' | 'users' | 'debug'>('workouts')
    const [workoutSets, setWorkoutSets] = useState<WorkoutSet[]>([])
    const [foodLogs, setFoodLogs] = useState<FoodLog[]>([])
    const [profiles, setProfiles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const isAdmin = user?.email === 'asnssrr@gmail.com'

    useEffect(() => {
        if (user) {
            loadData()
        }
    }, [user])

    const loadData = async () => {
        if (!user) return
        setLoading(true)

        try {
            // Load workout sets with exercise names
            // Load workout sets with exercise names
            const { data: workouts } = await supabase
                .from('workout_sets')
                .select(`
          *,
          exercise:exercises(name),
          session:workout_sessions(session_date)
        `)
                .order('created_at', { ascending: false })
                .limit(100)

            if (workouts) {
                setWorkoutSets(workouts as any)
            }

            // Load food logs
            const { data: foods } = await supabase
                .from('food_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100)

            if (foods) {
                setFoodLogs(foods)
            }

            // Load all profiles
            const { data: allProfiles } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })

            if (allProfiles) {
                setProfiles(allProfiles)
            }
        } catch (err) {
            console.error('Error loading admin data:', err)
        } finally {
            setLoading(false)
        }
    }

    const deleteWorkoutSet = async (id: string) => {
        if (!confirm('Delete this workout set?')) return
        await supabase.from('workout_sets').delete().eq('id', id)
        setWorkoutSets(prev => prev.filter(w => w.id !== id))
    }

    const deleteFoodLog = async (id: string) => {
        if (!confirm('Delete this food log?')) return
        await supabase.from('food_logs').delete().eq('id', id)
        setFoodLogs(prev => prev.filter(f => f.id !== id))
    }

    const togglePro = async (userId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus
        let endsAt = null

        if (newStatus) {
            const months = prompt('How many months of Pro?', '1')
            if (months === null) return
            const date = new Date()
            date.setMonth(date.getMonth() + parseInt(months))
            endsAt = date.toISOString()
        }

        const { error } = await supabase
            .from('profiles')
            .update({
                is_pro: newStatus,
                subscription_ends_at: endsAt
            })
            .eq('user_id', userId)

        if (error) {
            alert('Error updating Pro status: ' + error.message)
        } else {
            setProfiles(prev => prev.map(p => p.user_id === userId ? { ...p, is_pro: newStatus, subscription_ends_at: endsAt } : p))
        }
    }


    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background-dark text-white p-6">
                <span className="material-symbols-outlined text-red-500 text-6xl mb-4">gpp_maybe</span>
                <h1 className="text-2xl font-black mb-2 uppercase tracking-tighter">Access Restricted</h1>
                <p className="text-text-muted text-center max-w-sm">This area is reserved for the High Council of Muscle. You do not have the required permissions.</p>
                <button
                    onClick={() => window.location.href = '/'}
                    className="mt-8 px-8 py-3 bg-primary text-surface-dark font-bold rounded-xl"
                >
                    Return to Dashboard
                </button>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background-dark text-primary">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    <span className="text-primary font-display font-bold tracking-widest animate-pulse">LOADING ADMIN</span>
                </div>
            </div>
        )
    }

    return (
        <MainLayout title="Admin Panel" showAssistantStatus={false}>
            <div className="h-full overflow-y-auto px-6 lg:px-10 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight">🔧 Admin Panel</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={loadData}
                            className="px-4 py-2 bg-surface-highlight text-white rounded-lg hover:bg-surface-highlight/80 transition-colors text-sm font-bold flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">refresh</span>
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('workouts')}
                        className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${activeTab === 'workouts'
                            ? 'bg-primary text-surface-dark'
                            : 'bg-surface-highlight text-text-muted hover:text-white'
                            }`}
                    >
                        💪 Workouts ({workoutSets.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('food')}
                        className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${activeTab === 'food'
                            ? 'bg-primary text-surface-dark'
                            : 'bg-surface-highlight text-text-muted hover:text-white'
                            }`}
                    >
                        🍖 Food ({foodLogs.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${activeTab === 'users'
                            ? 'bg-primary text-surface-dark'
                            : 'bg-surface-highlight text-text-muted hover:text-white'
                            }`}
                    >
                        👥 Users ({profiles.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('debug')}
                        className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${activeTab === 'debug'
                            ? 'bg-primary text-surface-dark'
                            : 'bg-surface-highlight text-text-muted hover:text-white'
                            }`}
                    >
                        🐛 AI Logs
                    </button>
                </div>

                {/* Content */}
                <div className="bg-surface-dark border border-surface-highlight rounded-2xl overflow-hidden">
                    {activeTab === 'debug' ? (
                        <div className="p-4 space-y-4">
                            <div className="flex justify-between items-center">
                                <button
                                    onClick={() => setEnabled(!enabled)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${enabled
                                        ? 'bg-primary/20 text-primary border border-primary/30'
                                        : 'bg-surface-highlight text-text-muted border border-surface-highlight'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-sm">{enabled ? 'toggle_on' : 'toggle_off'}</span>
                                    {enabled ? 'Logging ON' : 'Logging OFF'}
                                </button>
                                <button
                                    onClick={clearLogs}
                                    className="text-xs text-red-400 hover:text-white uppercase font-bold tracking-widest"
                                >
                                    Clear Logs
                                </button>
                            </div>
                            <div className="space-y-4 max-h-[600px] overflow-y-auto">
                                {logs.length === 0 ? (
                                    <div className="text-center text-text-muted py-8">No interaction logs yet. Chat with the AI to see data here.</div>
                                ) : (
                                    logs.map((log) => (
                                        <div key={log.id} className="bg-surface-default p-4 rounded-lg border border-surface-highlight">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${log.type === 'error' ? 'bg-red-500/20 text-red-500' :
                                                        log.type === 'request' ? 'bg-blue-500/20 text-blue-500' :
                                                            'bg-green-500/20 text-green-500'
                                                        }`}>
                                                        {log.type}
                                                    </span>
                                                    <span className="text-xs text-text-muted">{format(log.timestamp, 'HH:mm:ss')}</span>
                                                    <span className="text-xs text-text-muted font-mono">[{log.source}]</span>
                                                </div>
                                            </div>
                                            <pre className="bg-black/50 p-3 rounded text-xs font-mono text-text-muted overflow-x-auto">
                                                {JSON.stringify(log.payload, null, 2)}
                                            </pre>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'workouts' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-surface-highlight/50">
                                    <tr className="text-left text-text-muted uppercase text-xs tracking-wider">
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Exercise</th>
                                        <th className="px-4 py-3">Set #</th>
                                        <th className="px-4 py-3">Weight</th>
                                        <th className="px-4 py-3">Reps</th>
                                        <th className="px-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-highlight">
                                    {workoutSets.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                                                No workout sets logged yet
                                            </td>
                                        </tr>
                                    ) : (
                                        workoutSets.map((set) => (
                                            <tr key={set.id} className="hover:bg-surface-highlight/20 transition-colors">
                                                <td className="px-4 py-3 text-text-muted">
                                                    {format(new Date(set.created_at), 'MMM d, h:mm a')}
                                                </td>
                                                <td className="px-4 py-3 text-white font-medium">
                                                    {(set.exercise as any)?.name || 'Unknown'}
                                                </td>
                                                <td className="px-4 py-3 text-text-muted">{set.set_number}</td>
                                                <td className="px-4 py-3 text-primary font-bold">
                                                    {set.weight_lbs ? `${set.weight_lbs} lbs` : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-white">{set.reps || '-'}</td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => deleteWorkoutSet(set.id)}
                                                        className="text-red-400 hover:text-red-300 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : activeTab === 'food' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-surface-highlight/50">
                                    <tr className="text-left text-text-muted uppercase text-xs tracking-wider">
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Meal</th>
                                        <th className="px-4 py-3">Food</th>
                                        <th className="px-4 py-3">Calories</th>
                                        <th className="px-4 py-3">Protein</th>
                                        <th className="px-4 py-3">Carbs</th>
                                        <th className="px-4 py-3">Fat</th>
                                        <th className="px-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-highlight">
                                    {foodLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-8 text-center text-text-muted">
                                                No food logs yet
                                            </td>
                                        </tr>
                                    ) : (
                                        foodLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-surface-highlight/20 transition-colors">
                                                <td className="px-4 py-3 text-text-muted">
                                                    {format(new Date(log.created_at), 'MMM d, h:mm a')}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${log.meal_type === 'breakfast' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        log.meal_type === 'lunch' ? 'bg-blue-500/20 text-blue-400' :
                                                            log.meal_type === 'dinner' ? 'bg-purple-500/20 text-purple-400' :
                                                                'bg-orange-500/20 text-orange-400'
                                                        }`}>
                                                        {log.meal_type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-white font-medium">{log.food_name}</td>
                                                <td className="px-4 py-3 text-primary font-bold">{log.calories || '-'}</td>
                                                <td className="px-4 py-3 text-text-muted">{log.protein_g ? `${log.protein_g}g` : '-'}</td>
                                                <td className="px-4 py-3 text-text-muted">{log.carbs_g ? `${log.carbs_g}g` : '-'}</td>
                                                <td className="px-4 py-3 text-text-muted">{log.fat_g ? `${log.fat_g}g` : '-'}</td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => deleteFoodLog(log.id)}
                                                        className="text-red-400 hover:text-red-300 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-surface-highlight/50">
                                    <tr className="text-left text-text-muted uppercase text-xs tracking-wider">
                                        <th className="px-4 py-3">User</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Pro Until</th>
                                        <th className="px-4 py-3">Joined</th>
                                        <th className="px-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-highlight">
                                    {profiles.map((profile) => (
                                        <tr key={profile.user_id} className="hover:bg-surface-highlight/20 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-white font-bold">{profile.display_name || 'Anonymous Orc'}</span>
                                                    <span className="text-[10px] text-text-muted font-mono">{profile.user_id}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {profile.is_pro ? (
                                                    <span className="px-2 py-1 rounded bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/30">PRO MEMBER</span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded bg-surface-highlight text-text-muted text-[10px] font-bold uppercase tracking-wider">BASE USER</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-text-muted font-mono text-xs">
                                                {profile.subscription_ends_at ? format(new Date(profile.subscription_ends_at), 'yyyy-MM-dd') : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-text-muted text-xs">
                                                {format(new Date(profile.created_at), 'MMM d, yyyy')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => togglePro(profile.user_id, profile.is_pro)}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${profile.is_pro
                                                        ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white'
                                                        : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary hover:text-surface-dark'}`}
                                                >
                                                    {profile.is_pro ? 'Revoke Pro' : 'Grant Pro'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                    <div className="bg-surface-highlight/30 border border-surface-highlight rounded-xl p-4">
                        <div className="text-3xl font-black text-primary">{workoutSets.length}</div>
                        <div className="text-text-muted text-xs uppercase tracking-wider mt-1">Total Sets Logged</div>
                    </div>
                    <div className="bg-surface-highlight/30 border border-surface-highlight rounded-xl p-4">
                        <div className="text-3xl font-black text-primary">{foodLogs.length}</div>
                        <div className="text-text-muted text-xs uppercase tracking-wider mt-1">Total Meals Logged</div>
                    </div>
                    <div className="bg-surface-highlight/30 border border-surface-highlight rounded-xl p-4">
                        <div className="text-3xl font-black text-primary">
                            {foodLogs.reduce((sum, f) => sum + (f.calories || 0), 0)}
                        </div>
                        <div className="text-text-muted text-xs uppercase tracking-wider mt-1">Total Calories</div>
                    </div>
                    <div className="bg-surface-highlight/30 border border-surface-highlight rounded-xl p-4">
                        <div className="text-3xl font-black text-primary">
                            {foodLogs.reduce((sum, f) => sum + (f.protein_g || 0), 0)}g
                        </div>
                        <div className="text-text-muted text-xs uppercase tracking-wider mt-1">Total Protein</div>
                    </div>
                </div>
            </div>
        </MainLayout>
    )
}
