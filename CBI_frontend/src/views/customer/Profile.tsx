import { useState, useEffect } from 'react'
import {
  User,
  Edit3,
  Lock,
  Key,
  Check,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Mail,
  Phone,
} from 'lucide-react'
import { authApi } from '../../api/auth'
import { ApiError } from '../../api/client'

interface CustomerProfileProps {
  userName: string
  userId: string
}

export default function CustomerProfile({ userName, userId }: CustomerProfileProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(userName)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const [createdAt, setCreatedAt] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')

  const fireToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4500)
  }

  useEffect(() => {
    authApi.getMe().then((user) => {
      setName(user.full_name)
      setPhone(user.phone || '')
      setEmail(user.email)
      setStatus(user.status || 'ACTIVE')
      setCreatedAt(String(user.created_at || '').substring(0, 10))
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await authApi.updateProfile({ full_name: name, phone })
      setName(updated.full_name)
      setPhone(updated.phone || '')
      setEditing(false)
      fireToast('Profile details updated successfully.')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPwError('')
    if (!currentPw || !newPw || !confirmPw) {
      setPwError('Please fill in all password fields.')
      return
    }
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match.')
      return
    }
    if (newPw.length < 6) {
      setPwError('Password must be at least 6 characters.')
      return
    }

    setSaving(true)
    try {
      await authApi.changePassword({ current_password: currentPw, new_password: newPw })
      setChangingPassword(false)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      fireToast('Password updated successfully.')
    } catch (err) {
      if (err instanceof ApiError) {
        const errors = (err.data.errors as string[])
        setPwError(errors ? errors.join(' ') : err.message)
      } else {
        setPwError('Failed to change password')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6 font-sans">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200" strokeWidth={2} />
          <span>{toast}</span>
        </div>
      )}

      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone/20">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">Guest Profile</h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">Manage personal information, contact credentials & account security</p>
        </div>

        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-5 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold text-xs shadow-sm hover:shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Edit3 className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {/* ─── 2. MEMBER OVERVIEW BANNER CARD ─── */}
      <div className="bg-white rounded-2xl border border-stone/20 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#B48454] text-white font-display text-2xl font-bold flex items-center justify-center shadow-sm shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold text-ink leading-tight">{name}</h2>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                ● {status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              Guest ID: <strong className="font-mono text-[#B48454] font-bold">{userId}</strong> · Member since {createdAt || '2026'}
            </p>
          </div>
        </div>
      </div>

      {/* ─── 3. PERSONAL DETAILS CARD ─── */}
      <div className="bg-white rounded-2xl border border-stone/20 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="pb-3 border-b border-stone/15 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-xl text-ink">Personal Information</h3>
            <p className="text-xs text-ink-muted mt-0.5">Your official registered details for reservations & check-in</p>
          </div>
        </div>

        {editing ? (
          <div className="space-y-4 text-xs">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1.5">Full Name *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>
              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1.5">Phone Number</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0917-123-4567"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1.5">Registered Email (Read Only)</label>
              <input
                disabled
                value={email}
                className="w-full px-4 py-2.5 rounded-xl border border-stone/30 bg-sand/30 text-ink-muted cursor-not-allowed font-mono"
              />
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 py-2.5 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !name}
                className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 transition-all"
              >
                {saving ? 'Saving Changes...' : 'Save Profile Details'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6 text-xs">
            <div className="p-4 bg-[#FAF8F5] border border-stone/20 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-ink-muted tracking-wider block">FULL NAME</span>
              <p className="font-display font-bold text-ink text-base mt-1">{name}</p>
            </div>

            <div className="p-4 bg-[#FAF8F5] border border-stone/20 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-ink-muted tracking-wider block">CUSTOMER ID</span>
              <p className="font-mono font-bold text-[#B48454] text-sm mt-1">{userId}</p>
            </div>

            <div className="p-4 bg-[#FAF8F5] border border-stone/20 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-ink-muted tracking-wider block">EMAIL ADDRESS</span>
              <p className="font-medium text-ink text-sm mt-1">{email}</p>
            </div>

            <div className="p-4 bg-[#FAF8F5] border border-stone/20 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-ink-muted tracking-wider block">CONTACT NUMBER</span>
              <p className="font-medium text-ink text-sm mt-1">{phone || 'Not provided'}</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── 4. CHANGE PASSWORD CARD ─── */}
      <div className="bg-white rounded-2xl border border-stone/20 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="pb-3 border-b border-stone/15 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-xl text-ink">Account Security & Password</h3>
            <p className="text-xs text-ink-muted mt-0.5">Ensure your customer portal account stays protected</p>
          </div>

          {!changingPassword && (
            <button
              onClick={() => setChangingPassword(true)}
              className="px-4 py-2 border border-[#B48454] text-[#B48454] hover:bg-[#B48454] hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Change Password</span>
            </button>
          )}
        </div>

        {changingPassword ? (
          <div className="space-y-4 text-xs">
            {pwError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{pwError}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-ink uppercase tracking-wider mb-1.5">Current Password *</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-4 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1.5">New Password *</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink uppercase tracking-wider mb-1.5">Confirm New Password *</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone/30 bg-[#FAF8F5] text-ink focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => { setChangingPassword(false); setPwError(''); }}
                className="flex-1 py-2.5 border border-stone/30 rounded-xl font-semibold text-ink-muted hover:bg-sand transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={saving}
                className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-xl font-semibold shadow-sm disabled:opacity-50 transition-all"
              >
                {saving ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-ink-muted leading-relaxed">
            Your login password protects your reservation statements and transactions. We recommend choosing a strong password with letters, numbers, and symbols.
          </p>
        )}
      </div>

    </div>
  )
}
