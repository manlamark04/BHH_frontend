import { useState, useEffect } from 'react'
import {
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  RotateCcw,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import Modal from './Modal'
import { usersApi } from '../api/users'

interface ResetPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  user: {
    id: number
    unique_id?: string
    full_name?: string
    username?: string
    email?: string
    first_name?: string
    role?: string
  } | null
  onSuccess?: () => void
}

export default function ResetPasswordModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: ResetPasswordModalProps) {
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{
    temporary_password: string
    username: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  // Generate a friendly default password based on first name or random
  const generateSuggestedPassword = (name?: string) => {
    const clean = (name || 'guest').trim().split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
    const base = clean || 'guest'
    // e.g. juan123 or maria2026
    return `${base}123`
  }

  useEffect(() => {
    if (isOpen && user) {
      setTemporaryPassword(generateSuggestedPassword(user.first_name || user.full_name))
      setError('')
      setResult(null)
      setCopied(false)
      setShowPassword(false)
    }
  }, [isOpen, user])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!temporaryPassword || temporaryPassword.trim().length < 6) {
      setError('Temporary password must be at least 6 characters.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await usersApi.resetCustomerPassword(user.id, temporaryPassword.trim())
      setResult({
        temporary_password: res.temporary_password,
        username: res.username || user.username || '—',
      })
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to reset password.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!result) return
    const textToCopy = `BHH Guest Login Credentials:\nUsername: ${result.username}\nTemporary Password: ${result.temporary_password}\n(You will be asked to create a new password on login)`
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset Guest Password (Admin Only)"
      size="md"
    >
      <div className="space-y-4 text-xs font-sans">
        {user && !result && (
          <form onSubmit={handleReset} className="space-y-4">
            {/* User Target Card */}
            <div className="p-3.5 bg-[#F6F2E8] dark:bg-neutral-800/60 border border-stone/20 dark:border-neutral-700 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#6B7A5E]/15 text-[#6B7A5E] flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-ink dark:text-white truncate text-sm">
                    {user.full_name || 'Guest User'}
                  </h4>
                  <p className="font-mono text-[11px] text-ink-muted dark:text-neutral-400">
                    ID: {user.unique_id || user.id} · @{user.username || 'no-username'}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 shrink-0">
                Admin Action
              </span>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Temporary Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-ink dark:text-white uppercase tracking-wider">
                  Temporary Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setTemporaryPassword(generateSuggestedPassword(user.first_name || user.full_name))}
                  className="text-[10px] font-semibold text-[#6B7A5E] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to Suggested</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={temporaryPassword}
                  onChange={(e) => setTemporaryPassword(e.target.value)}
                  placeholder="Enter temporary password"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-stone/30 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-ink dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7A5E]/40"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-ink-muted dark:text-neutral-400 mt-1 block">
                Minimum 6 characters. The guest will use this to log in once.
              </span>
            </div>

            {/* Security Explanation Box */}
            <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span>Security Policy Enforcement</span>
              </div>
              <p className="text-[10px] leading-relaxed">
                Upon submitting, the account will be flagged with <strong>Must Change Password</strong>. When the guest logs in with this temporary password, the system will immediately require them to create their own new password.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone/15 dark:border-neutral-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-stone/30 dark:border-neutral-700 rounded-xl font-semibold text-ink dark:text-neutral-300 hover:bg-stone/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{loading ? 'Resetting Password...' : 'Confirm Reset Password'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Success State */}
        {result && (
          <div className="space-y-4 py-2 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h4 className="font-display font-bold text-base text-ink dark:text-white">
                Password Successfully Reset!
              </h4>
              <p className="text-[11px] text-ink-muted dark:text-neutral-400 mt-1 max-w-sm mx-auto leading-relaxed">
                Provide these temporary credentials to the guest. They will be prompted to create their own permanent password upon logging in.
              </p>
            </div>

            {/* Credentials Display Card */}
            <div className="p-4 bg-white dark:bg-neutral-900 border border-stone/20 dark:border-neutral-800 rounded-2xl text-left space-y-2 shadow-2xs">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-ink-muted">Username</span>
                <span className="font-mono font-bold text-ink dark:text-white">{result.username}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-stone/10 dark:border-neutral-800">
                <span className="text-[10px] uppercase font-bold tracking-wider text-ink-muted">Temporary Password</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md text-sm">
                  {result.temporary_password}
                </span>
              </div>
            </div>

            {/* Copy Button & Done */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-2.5 bg-[#F6F2E8] dark:bg-neutral-800 hover:bg-sand text-ink dark:text-white border border-stone/30 dark:border-neutral-700 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Credentials</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-[#6B7A5E] hover:bg-[#4F5D45] text-white rounded-xl font-bold transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
