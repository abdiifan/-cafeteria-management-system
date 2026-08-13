import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Coffee, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Field from '../components/common/Field'
import LanguageSwitcher from '../components/layout/LanguageSwitcher'

// Landed on from the email link Supabase sends via resetPasswordForEmail.
// Supabase exchanges the link's token for a temporary "recovery" session
// automatically (via onAuthStateChange / detectSessionInUrl), so by the time
// this page mounts there should already be a session — we just confirm the
// new password and call updateUser.
export default function ResetPassword() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { completePasswordReset } = useAuth()

  const [ready, setReady] = useState(false)
  const [invalidLink, setInvalidLink] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
      else setInvalidLink(true)
    })
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError(t('settings.passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('settings.passwordMismatch'))
      return
    }

    setBusy(true)
    const { error } = await completePasswordReset(newPassword)
    setBusy(false)

    if (error) {
      setError(t('common.error'))
      return
    }
    setSuccess(true)
    setTimeout(() => navigate('/', { replace: true }), 1500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-forest px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <LanguageSwitcher />
        </div>
        <div className="bg-parchment rounded-card p-8 shadow-xl">
          <div className="flex items-center gap-2 justify-center mb-1 text-forest">
            <Coffee size={26} />
            <span className="font-display text-2xl">{t('app.name')}</span>
          </div>
          <p className="text-center text-sm text-bark/60 mb-6">{t('auth.setNewPassword')}</p>

          {invalidLink ? (
            <p className="text-sm text-clay text-center">{t('auth.resetLinkInvalid')}</p>
          ) : success ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-3 text-forest" size={32} />
              <p className="text-sm text-bark/80">{t('settings.passwordUpdated')}</p>
            </div>
          ) : (
            ready && (
              <form onSubmit={submit}>
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

                <Button type="submit" className="w-full" size="lg" disabled={busy}>
                  {busy ? t('settings.updating') : t('settings.updatePassword')}
                </Button>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  )
}
