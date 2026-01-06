import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface AIPreferences {
    weight_unit: 'lbs' | 'kg'
    ai_language: 'ar' | 'en'
    calorie_goal: number | null
    protein_goal: number | null
    carb_goal: number | null
    fat_goal: number | null
    custom_instructions: string | null
    weekly_email: boolean
    is_pro: boolean
}

export default function AIPreferences() {
    const { user } = useAuth()
    const [preferences, setPreferences] = useState<AIPreferences | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showUpgradeModal, setShowUpgradeModal] = useState(false)

    useEffect(() => {
        if (user) {
            loadPreferences()
        }
    }, [user])

    const loadPreferences = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('weight_unit, ai_language, calorie_goal, protein_goal, carb_goal, fat_goal, custom_instructions, weekly_email, is_pro')
            .eq('user_id', user?.id)
            .single()

        if (!error && data) {
            setPreferences(data as AIPreferences)
        }
        setLoading(false)
    }

    const savePreferences = async (updates: Partial<AIPreferences>) => {
        setSaving(true)
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('user_id', user?.id)

        if (!error) {
            setPreferences(prev => prev ? { ...prev, ...updates } : null)
        }
        setSaving(false)
    }

    const handleProClick = () => {
        if (!preferences?.is_pro) {
            setShowUpgradeModal(true)
        }
    }

    const handleUpgrade = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
            }
        })
        const { url } = await res.json()
        if (url) window.location.href = url
    }

    if (loading) {
        return <div className="animate-pulse bg-surface-dark rounded-2xl h-64"></div>
    }

    return (
        <div className="bg-surface-dark rounded-2xl border border-white/5 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">smart_toy</span>
                    AI Preferences
                </h3>
            </div>

            {/* Basic Settings */}
            <div className="p-6 border-b border-white/5">
                <h4 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">Basic Settings</h4>

                <div className="grid grid-cols-2 gap-4">
                    {/* Weight Unit */}
                    <div>
                        <label className="block text-sm text-white/60 mb-2">Weight Unit</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => savePreferences({ weight_unit: 'lbs' })}
                                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${preferences?.weight_unit === 'lbs'
                                        ? 'bg-primary text-surface-dark'
                                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                                    }`}
                            >
                                lbs
                            </button>
                            <button
                                onClick={() => savePreferences({ weight_unit: 'kg' })}
                                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${preferences?.weight_unit === 'kg'
                                        ? 'bg-primary text-surface-dark'
                                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                                    }`}
                            >
                                kg
                            </button>
                        </div>
                    </div>

                    {/* Language */}
                    <div>
                        <label className="block text-sm text-white/60 mb-2">AI Language</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => savePreferences({ ai_language: 'ar' })}
                                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${preferences?.ai_language === 'ar'
                                        ? 'bg-primary text-surface-dark'
                                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                                    }`}
                            >
                                عربي
                            </button>
                            <button
                                onClick={() => savePreferences({ ai_language: 'en' })}
                                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${preferences?.ai_language === 'en'
                                        ? 'bg-primary text-surface-dark'
                                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                                    }`}
                            >
                                English
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pro Settings */}
            <div
                className={`p-6 ${!preferences?.is_pro ? 'opacity-60 cursor-pointer' : ''}`}
                onClick={!preferences?.is_pro ? handleProClick : undefined}
            >
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-white/60 uppercase tracking-wider flex items-center gap-2">
                        Pro Settings
                        {!preferences?.is_pro && (
                            <span className="material-symbols-outlined text-sm">lock</span>
                        )}
                    </h4>
                    {preferences?.is_pro && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-bold">PRO</span>
                    )}
                </div>

                {/* Goals */}
                <div className="mb-6">
                    <h5 className="text-sm text-white/80 mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">target</span>
                        Daily Goals
                    </h5>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-white/40 mb-1">Calories (kcal)</label>
                            <input
                                type="number"
                                value={preferences?.calorie_goal || ''}
                                onChange={(e) => preferences?.is_pro && savePreferences({ calorie_goal: parseInt(e.target.value) || null })}
                                disabled={!preferences?.is_pro}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm disabled:cursor-not-allowed"
                                placeholder="2200"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-white/40 mb-1">Protein (g)</label>
                            <input
                                type="number"
                                value={preferences?.protein_goal || ''}
                                onChange={(e) => preferences?.is_pro && savePreferences({ protein_goal: parseInt(e.target.value) || null })}
                                disabled={!preferences?.is_pro}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm disabled:cursor-not-allowed"
                                placeholder="150"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-white/40 mb-1">Carbs (g)</label>
                            <input
                                type="number"
                                value={preferences?.carb_goal || ''}
                                onChange={(e) => preferences?.is_pro && savePreferences({ carb_goal: parseInt(e.target.value) || null })}
                                disabled={!preferences?.is_pro}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm disabled:cursor-not-allowed"
                                placeholder="250"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-white/40 mb-1">Fat (g)</label>
                            <input
                                type="number"
                                value={preferences?.fat_goal || ''}
                                onChange={(e) => preferences?.is_pro && savePreferences({ fat_goal: parseInt(e.target.value) || null })}
                                disabled={!preferences?.is_pro}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm disabled:cursor-not-allowed"
                                placeholder="70"
                            />
                        </div>
                    </div>
                </div>

                {/* Custom Instructions */}
                <div className="mb-6">
                    <h5 className="text-sm text-white/80 mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">edit_note</span>
                        Custom Instructions
                    </h5>
                    <textarea
                        value={preferences?.custom_instructions || ''}
                        onChange={(e) => preferences?.is_pro && savePreferences({ custom_instructions: e.target.value || null })}
                        disabled={!preferences?.is_pro}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm disabled:cursor-not-allowed h-24 resize-none"
                        placeholder='e.g. "دايم احسب 3 سيت 10 تكرار" or "Always respond in English"'
                    />
                </div>

                {/* Weekly Email */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-white/60">mail</span>
                        <span className="text-sm text-white/80">Weekly Summary Email</span>
                    </div>
                    <button
                        onClick={() => preferences?.is_pro && savePreferences({ weekly_email: !preferences.weekly_email })}
                        disabled={!preferences?.is_pro}
                        className={`w-12 h-6 rounded-full transition-all ${preferences?.weekly_email ? 'bg-primary' : 'bg-white/10'
                            } disabled:cursor-not-allowed`}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${preferences?.weekly_email ? 'translate-x-6' : 'translate-x-0.5'
                            }`} />
                    </button>
                </div>

                {/* Unlock Pro Button */}
                {!preferences?.is_pro && (
                    <button
                        onClick={handleUpgrade}
                        className="w-full mt-6 bg-gradient-to-r from-primary to-green-400 text-surface-dark font-bold py-3 rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">lock_open</span>
                        Unlock Pro - $5/mo
                    </button>
                )}
            </div>

            {/* Saving indicator */}
            {saving && (
                <div className="absolute top-4 right-4">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Upgrade Modal */}
            {showUpgradeModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface-dark rounded-2xl p-6 max-w-md w-full border border-primary/20">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">star</span>
                            Hazem Pro
                        </h3>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-3 text-white/80">
                                <span className="material-symbols-outlined text-primary">psychology</span>
                                <span>GPT-5.2 - Most Advanced AI</span>
                            </div>
                            <div className="flex items-center gap-3 text-white/80">
                                <span className="material-symbols-outlined text-primary">target</span>
                                <span>Daily Macro Goals</span>
                            </div>
                            <div className="flex items-center gap-3 text-white/80">
                                <span className="material-symbols-outlined text-primary">edit_note</span>
                                <span>Custom AI Instructions</span>
                            </div>
                            <div className="flex items-center gap-3 text-white/80">
                                <span className="material-symbols-outlined text-primary">download</span>
                                <span>Export to PDF/CSV</span>
                            </div>
                            <div className="flex items-center gap-3 text-white/80">
                                <span className="material-symbols-outlined text-primary">mail</span>
                                <span>Weekly Summary Email</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowUpgradeModal(false)}
                                className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 font-medium hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpgrade}
                                className="flex-1 py-3 rounded-xl bg-primary text-surface-dark font-bold hover:scale-[1.02] transition-transform"
                            >
                                Subscribe - $5/mo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
