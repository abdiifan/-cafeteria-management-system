import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyRound, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/common/Card'
import Field from '../../components/common/Field'
import Input from '../../components/common/Input'
import Button from '../../components/common/Button'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { profile, changePassword } = useAuth()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (newPassword.length < 8) {
      setError(t('settings.passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('settings.passwordMismatch'))
      return
    }

    setBusy(true)
    const { error } = await changePassword(currentPassword, newPassword)
    setBusy(false)

    if (error) {
      setError(t('settings.currentPasswordWrong'))
      return
    }

    setSuccess(true)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="font-display text-2xl text-ink">{t('settings.title')}</h1>

      <Card title={profile?.full_name} subtitle={profile?.email} />

      <Card title={t('settings.changePassword')} subtitle={t('settings.changePasswordSubtitle')}>
        <form onSubmit={submit}>
          <Field label={t('settings.currentPassword')} required>
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          <Field label={t('settings.newPassword')} required>
            <Input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Field label={t('settings.confirmPassword')} required>
            <Input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>

          {error && <p className="text-sm text-clay mb-3">{error}</p>}
          {success && (
            <p className="text-sm text-forest mb-3 flex items-center gap-1.5">
              <CheckCircle2 size={16} /> {t('settings.passwordUpdated')}
            </p>
          )}

          <Button type="submit" disabled={busy} className="w-full sm:w-auto">
            <KeyRound size={16} />
            {busy ? t('settings.updating') : t('settings.updatePassword')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
