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
  Calendar,
  MapPin,
  Heart,
  UserCheck,
} from 'lucide-react'
import { authApi } from '../../api/auth'
import { ApiError } from '../../api/client'

interface CustomerProfileProps {
  userName: string
  userId: string
}

export default function CustomerProfile({ userName, userId }: CustomerProfileProps) {
  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState('')
  const [dob, setDob] = useState('')
  const [civilStatus, setCivilStatus] = useState('')
  const [address, setAddress] = useState('')
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
      // Split full name if individual name fields are empty
      const parts = (user.full_name || userName || '').trim().split(/\s+/)
      setFirstName(user.first_name || (parts.length > 0 ? parts[0] : ''))
      setLastName(user.last_name || (parts.length > 1 ? parts[parts.length - 1] : ''))
      setMiddleName(user.middle_name || (parts.length > 2 ? parts.slice(1, -1).join(' ') : ''))

      setPhone(user.phone || '')
      setEmail(user.email)
      setGender(user.gender || '')
      setDob(user.dob ? String(user.dob).substring(0, 10) : '')
      setCivilStatus(user.civil_status || '')
      setAddress(user.address || '')
      setStatus(user.status || 'ACTIVE')
      setCreatedAt(String(user.created_at || '').substring(0, 10))
    }).catch(() => {})
  }, [userName])

  const fullNameDisplay = [firstName, middleName, lastName].filter(Boolean).join(' ') || userName

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      alert('First Name and Last Name are required.')
      return
    }
    setSaving(true)
    try {
      const updated = await authApi.updateProfile({
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        last_name: lastName.trim(),
        full_name: [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(' '),
        phone: phone.trim() || undefined,
        gender: gender || undefined,
        dob: dob || undefined,
        civil_status: civilStatus || undefined,
        address: address.trim() || undefined,
      })

      setFirstName(updated.first_name || firstName)
      setMiddleName(updated.middle_name || middleName)
      setLastName(updated.last_name || lastName)
      setPhone(updated.phone || '')
      setGender(updated.gender || '')
      setDob(updated.dob ? String(updated.dob).substring(0, 10) : '')
      setCivilStatus(updated.civil_status || '')
      setAddress(updated.address || '')
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
    <div className="p-4 sm:p-5 max-w-4xl mx-auto space-y-4 font-sans">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-emerald-700 text-white font-medium text-xs rounded-2xl shadow-xl border border-emerald-500 animate-slideDown flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-200" strokeWidth={2} />
          <span>{toast}</span>
        </div>
      )}

      {/* ─── 1. MEMBER OVERVIEW BANNER CARD ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#B48454] text-white font-display text-lg font-bold flex items-center justify-center shadow-xs shrink-0">
            {(firstName || fullNameDisplay).charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg sm:text-xl font-bold text-neutral-900 dark:text-white leading-tight">
                {fullNameDisplay}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 uppercase">
                ● {status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Guest ID: <strong className="font-mono text-[#B48454] font-bold">{userId}</strong> · Member since {createdAt || '2026'}
            </p>
          </div>
        </div>

        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-3.5 py-1.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-lg font-semibold text-xs shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {/* ─── 2. PERSONAL DETAILS CARD ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 sm:p-5 space-y-4">
        <div className="pb-2.5 border-b border-black/[0.06] dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-neutral-900 dark:text-white">Personal Information</h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">Your official registered details for reservations & check-in</p>
          </div>
        </div>

        {editing ? (
          <div className="space-y-3.5 text-xs">
            
            {/* Name Fields: First Name, Middle Name, Last Name */}
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                  First Name *
                </label>
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Mark"
                  className="w-full px-3.5 py-2 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>
              <div>
                <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                  Middle Name
                </label>
                <input
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="e.g. Jaime"
                  className="w-full px-3.5 py-2 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>
              <div>
                <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                  Last Name *
                </label>
                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Manla"
                  className="w-full px-3.5 py-2 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>
            </div>

            {/* Demographics: Gender & Date of Birth */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 cursor-pointer"
                >
                  <option value="">-- Select Gender --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3.5 py-2 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>
            </div>

            {/* Civil Status & Phone Number */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                  Civil Status
                </label>
                <select
                  value={civilStatus}
                  onChange={(e) => setCivilStatus(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 cursor-pointer"
                >
                  <option value="">-- Select Civil Status --</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Separated">Separated</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0917-123-4567"
                  className="w-full px-3.5 py-2 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                Complete Address
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address, Barangay, City/Municipality, Province, ZIP"
                rows={2}
                className="w-full px-3.5 py-2 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#B48454]/40 resize-none"
              />
            </div>

            {/* Registered Email (Read Only) */}
            <div>
              <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">
                Registered Email (Read Only)
              </label>
              <input
                disabled
                value={email}
                className="w-full px-3.5 py-2 rounded-lg border border-black/[0.06] dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 font-mono text-xs cursor-not-allowed"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 py-2.5 border border-black/[0.08] dark:border-neutral-700 rounded-lg font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
              >
                {saving ? 'Saving Changes...' : 'Save Profile Details'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3 bg-neutral-50/70 dark:bg-[#14171C] border border-black/[0.06] dark:border-neutral-800 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider block">FIRST NAME</span>
              <p className="font-semibold text-neutral-900 dark:text-white text-xs mt-0.5">{firstName || '—'}</p>
            </div>

            <div className="p-3 bg-neutral-50/70 dark:bg-[#14171C] border border-black/[0.06] dark:border-neutral-800 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider block">MIDDLE NAME</span>
              <p className="font-semibold text-neutral-900 dark:text-white text-xs mt-0.5">{middleName || '—'}</p>
            </div>

            <div className="p-3 bg-neutral-50/70 dark:bg-[#14171C] border border-black/[0.06] dark:border-neutral-800 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider block">LAST NAME</span>
              <p className="font-semibold text-neutral-900 dark:text-white text-xs mt-0.5">{lastName || '—'}</p>
            </div>

            <div className="p-3 bg-neutral-50/70 dark:bg-[#14171C] border border-black/[0.06] dark:border-neutral-800 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider block">GENDER</span>
              <p className="font-medium text-neutral-900 dark:text-white text-xs mt-0.5">{gender || 'Not specified'}</p>
            </div>

            <div className="p-3 bg-neutral-50/70 dark:bg-[#14171C] border border-black/[0.06] dark:border-neutral-800 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider block">DATE OF BIRTH</span>
              <p className="font-medium text-neutral-900 dark:text-white text-xs mt-0.5">{dob || 'Not specified'}</p>
            </div>

            <div className="p-3 bg-neutral-50/70 dark:bg-[#14171C] border border-black/[0.06] dark:border-neutral-800 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider block">CIVIL STATUS</span>
              <p className="font-medium text-neutral-900 dark:text-white text-xs mt-0.5">{civilStatus || 'Not specified'}</p>
            </div>

            <div className="p-3 bg-neutral-50/70 dark:bg-[#14171C] border border-black/[0.06] dark:border-neutral-800 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider block">CONTACT NUMBER</span>
              <p className="font-medium text-neutral-900 dark:text-white text-xs mt-0.5">{phone || 'Not provided'}</p>
            </div>

            <div className="p-3 bg-neutral-50/70 dark:bg-[#14171C] border border-black/[0.06] dark:border-neutral-800 rounded-lg md:col-span-2">
              <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider block">REGISTERED EMAIL</span>
              <p className="font-mono text-neutral-900 dark:text-white text-xs mt-0.5">{email || '—'}</p>
            </div>

            <div className="p-3 bg-neutral-50/70 dark:bg-[#14171C] border border-black/[0.06] dark:border-neutral-800 rounded-lg sm:col-span-2 md:col-span-3">
              <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider block">COMPLETE ADDRESS</span>
              <p className="font-medium text-neutral-900 dark:text-white text-xs mt-0.5">{address || 'No address provided'}</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── 3. CHANGE PASSWORD CARD ─── */}
      <div className="bg-white dark:bg-[#181B20] rounded-xl border border-black/[0.07] dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 sm:p-5 space-y-4">
        <div className="pb-2.5 border-b border-black/[0.06] dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-neutral-900 dark:text-white">Account Security & Password</h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">Ensure your customer portal account stays protected</p>
          </div>

          {!changingPassword && (
            <button
              onClick={() => setChangingPassword(true)}
              className="px-3.5 py-1.5 border border-[#B48454] text-[#B48454] hover:bg-[#B48454] hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Change Password</span>
            </button>
          )}
        </div>

        {changingPassword ? (
          <div className="space-y-3 text-xs">
            {pwError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-lg text-rose-800 dark:text-rose-300 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{pwError}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">Current Password *</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3.5 py-2 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">New Password *</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2 rounded-lg border border-black/[0.08] dark:border-neutral-700 bg-white dark:bg-[#20252E] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#B48454]/40"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => { setChangingPassword(false); setPwError(''); }}
                className="flex-1 py-2 border border-black/[0.08] dark:border-neutral-700 rounded-lg font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={saving}
                className="flex-1 py-2 bg-[#B48454] hover:bg-[#9E6E3E] text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
              >
                {saving ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Your login password protects your reservation statements and transactions. We recommend choosing a strong password with letters, numbers, and symbols.
          </p>
        )}
      </div>

    </div>
  )
}
