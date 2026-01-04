import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

export default function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetMode, setResetMode] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            await login(email, password);
        } catch (err) {
            setError('Invalid email or password.');
        }
        setLoading(false);
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!email) {
            setError('Please enter your email address.');
            return;
        }

        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setSuccess('Password reset email sent! Check your inbox.');
        } catch (err) {
            if (err.code === 'auth/user-not-found') {
                setError('No account found with this email.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Please enter a valid email address.');
            } else {
                setError('Failed to send reset email. Please try again.');
            }
        }
        setLoading(false);
    };

    const toggleResetMode = () => {
        setResetMode(!resetMode);
        setError('');
        setSuccess('');
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
                <div className="text-center mb-8">
                    <img src="./logos/ai-logo.png" alt="Logo" className="h-20 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-100">
                        {resetMode ? 'Reset Password' : 'Welcome Back'}
                    </h1>
                    <p className="text-slate-400 text-sm">
                        {resetMode
                            ? "Enter your email and we'll send you a reset link"
                            : 'Sign in to Accurate Industries Portal'
                        }
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg mb-4 text-sm text-center">
                        {success}
                    </div>
                )}

                {resetMode ? (
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                placeholder="user@accurateindustries.com.au"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-cyan-900/20 disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                        <button
                            type="button"
                            onClick={toggleResetMode}
                            className="w-full text-slate-400 hover:text-slate-200 text-sm py-2 transition-colors"
                        >
                            ← Back to Sign In
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                placeholder="user@accurateindustries.com.au"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-cyan-900/20 disabled:opacity-50"
                        >
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>
                        <button
                            type="button"
                            onClick={toggleResetMode}
                            className="w-full text-slate-400 hover:text-cyan-400 text-sm py-2 transition-colors"
                        >
                            Forgot Password?
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
