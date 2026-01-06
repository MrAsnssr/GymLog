import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ProFeatures() {
    const navigate = useNavigate()

    const handleSubscribe = async () => {
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

    const features = [
        {
            icon: 'psychology',
            title: 'GPT-5.2 Powered',
            description: 'The most advanced AI model available. Superior precision and understanding for complex workout logging.',
            highlight: true
        },
        {
            icon: 'analytics',
            title: 'Data Summaries',
            description: 'See your progress data after each log. "10 باوند زيادة عن آخر مرة"'
        },
        {
            icon: 'target',
            title: 'Goal Tracking',
            description: 'Set daily calorie, protein, carb & fat goals. See totals vs your targets.'
        },
        {
            icon: 'edit_note',
            title: 'Custom Instructions',
            description: 'Write your own rules for the AI. "دايم احسب 3 سيت" or "Respond in English"'
        },
        {
            icon: 'download',
            title: 'Export to PDF/CSV',
            description: 'Download your workout and nutrition data for analysis or sharing.'
        },
        {
            icon: 'mail',
            title: 'Weekly Summary Email',
            description: 'Get a weekly report of your progress delivered to your inbox.'
        }
    ]

    return (
        <div className="min-h-screen bg-surface-dark text-white">
            {/* Hero */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
                <div className="max-w-4xl mx-auto px-6 py-16 relative">
                    <button
                        onClick={() => navigate(-1)}
                        className="mb-8 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                        Back
                    </button>

                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-full mb-6">
                            <span className="material-symbols-outlined">star</span>
                            <span className="font-bold">HAZEM PRO</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black mb-4">
                            Upgrade Your<br />
                            <span className="text-primary">Fitness Tracking</span>
                        </h1>

                        <p className="text-xl text-white/60 mb-8">
                            Powered by GPT-5.2 - The most advanced AI available
                        </p>

                        <div className="flex items-center justify-center gap-4 mb-8">
                            <span className="text-5xl font-black text-primary">$5</span>
                            <div className="text-left">
                                <div className="text-white/60">per month</div>
                                <div className="text-sm text-white/40">Cancel anytime</div>
                            </div>
                        </div>

                        <button
                            onClick={handleSubscribe}
                            className="bg-gradient-to-r from-primary to-green-400 text-surface-dark font-black text-lg px-12 py-4 rounded-2xl hover:scale-105 transition-transform shadow-lg shadow-primary/20"
                        >
                            Subscribe Now
                        </button>
                    </div>
                </div>
            </div>

            {/* Features Grid */}
            <div className="max-w-4xl mx-auto px-6 py-16">
                <h2 className="text-2xl font-bold text-center mb-12">Everything in Pro</h2>

                <div className="grid md:grid-cols-2 gap-6">
                    {features.map((feature, i) => (
                        <div
                            key={i}
                            className={`p-6 rounded-2xl border ${feature.highlight
                                    ? 'bg-primary/10 border-primary/30'
                                    : 'bg-white/5 border-white/5'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.highlight ? 'bg-primary text-surface-dark' : 'bg-white/10 text-primary'
                                }`}>
                                <span className="material-symbols-outlined text-2xl">{feature.icon}</span>
                            </div>
                            <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                            <p className="text-white/60 text-sm">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <div className="max-w-4xl mx-auto px-6 py-16">
                <div className="bg-gradient-to-r from-primary/20 to-green-400/20 rounded-3xl p-8 text-center border border-primary/20">
                    <h3 className="text-2xl font-bold mb-4">Ready to level up?</h3>
                    <p className="text-white/60 mb-6">Join Pro and unlock the full potential of Hazem.</p>
                    <button
                        onClick={handleSubscribe}
                        className="bg-primary text-surface-dark font-bold px-8 py-3 rounded-xl hover:scale-105 transition-transform"
                    >
                        Get Pro - $5/month
                    </button>
                </div>
            </div>
        </div>
    )
}
