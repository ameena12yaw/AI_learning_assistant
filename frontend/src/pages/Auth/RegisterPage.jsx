import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import authService from '../../services/authService.js'
import { BrainCircuit, Mail, Lock, User, ArrowRight } from 'lucide-react'
import ThemeToggle from '../../Components/common/ThemeToggle'
import toast from 'react-hot-toast'

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await authService.register(username, email, password);
      toast.success("Account created! Please sign in.");
      navigate("/login");
    } catch (error) {
      setError(error.message || "Register failed, please try again.");
      toast.error(error.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center px-4 py-12 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-lg">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 shadow-xl space-y-6">
          {/* Header inside the card */}
          <div className="flex flex-col items-start gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <BrainCircuit className="h-6 w-6" strokeWidth={2.25} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600/80 dark:text-emerald-400/80">AI Learning Assistant</p>
              <h1 className="text-3xl font-semibold">Create your account</h1>
              <p className="text-slate-600 dark:text-slate-400">Join and start your learning journey.</p>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Username</label>
              <div className="relative">
                <div className={`absolute inset-y-0 left-0 flex pl-4 items-center pointer-events-none transition-colors duration-200 ${focusedField === 'username' ? 'text-emerald-500' : 'text-slate-400'}`}>
                  <User className="h-4 w-4" strokeWidth={2} />
                </div>
                <input
                  type="text"
                  className={`w-full rounded-xl border bg-white dark:bg-slate-800 pl-11 pr-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${focusedField === 'username' ? 'border-emerald-500/60' : 'border-slate-200 dark:border-slate-600'}`}
                  placeholder="Your name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Email Address</label>
              <div className="relative">
                <div className={`absolute inset-y-0 left-0 flex pl-4 items-center pointer-events-none transition-colors duration-200 ${focusedField === 'email' ? 'text-emerald-500' : 'text-slate-400'}`}>
                  <Mail className="h-4 w-4" strokeWidth={2} />
                </div>
                <input
                  type="email"
                  className={`w-full rounded-xl border bg-white dark:bg-slate-800 pl-11 pr-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${focusedField === 'email' ? 'border-emerald-500/60' : 'border-slate-200 dark:border-slate-600'}`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Password</label>
              <div className="relative">
                <div className={`absolute inset-y-0 left-0 flex pl-4 items-center pointer-events-none transition-colors duration-200 ${focusedField === 'password' ? 'text-emerald-500' : 'text-slate-400'}`}>
                  <Lock className="h-4 w-4" strokeWidth={2} />
                </div>
                <input
                  type="password"
                  className={`w-full rounded-xl border bg-white dark:bg-slate-800 pl-11 pr-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${focusedField === 'password' ? 'border-emerald-500/60' : 'border-slate-200 dark:border-slate-600'}`}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* error message */}
            {error && (
              <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {/* submit button */}
            <button
              type="submit"
              disabled={loading}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-900 border-t-transparent" />
                  Creating...
                </span>
              ) : (
                <span className="flex items-center gap-2">Create account <ArrowRight className="h-4 w-4" strokeWidth={2.5} /></span>
              )}
            </button>

            {/* footer  */}
            <div className="flex items-center justify-start text-sm text-slate-600 dark:text-slate-400">
              <span>
                Already have an account?{' '}
                <Link to="/login" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-semibold">
                  Sign in
                </Link>
              </span>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500">
            By continuing you agree to our Terms of Service and Privacy Policy.
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterPage