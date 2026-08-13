import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { Coffee, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Field from '../components/common/Field'
import LanguageSwitcher from '../components/layout/LanguageSwitcher'

export default function Login() {
  const { t } = useTranslation()
  const { session, signIn, sendPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  if (session) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error?.message === 'account_deactivated') {
      setError(t('auth.accountDeactivated'))
    } else if (error) {
      setError(t('auth.invalidCredentials'))
    }
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await sendPasswordReset(email)
    setBusy(false)
    if (error) {
      setError(t('auth.resetFailed'))
    } else {
      setResetSent(true)
    }
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
          <p className="text-center text-sm text-bark/60 mb-6">
            {forgotMode ? t('auth.resetSubtitle') : t('auth.subtitle')}
          </p>

          {forgotMode ? (
            resetSent ? (
              <div className="text-center">
                <CheckCircle2 className="mx-auto mb-3 text-forest" size={32} />
                <p className="text-sm text-bark/80 mb-6">{t('auth.resetSent', { email })}</p>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setForgotMode(false)
                    setResetSent(false)
                  }}
                >
                  {t('auth.backToSignIn')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit}>
                <Field label={t('auth.email')} required>
                  <Input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>

                {error && <p className="text-sm text-clay mb-3">{error}</p>}

                <Button type="submit" className="w-full" size="lg" disabled={busy}>
                  {busy ? t('auth.sendingReset') : t('auth.sendResetLink')}
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-sm text-bark/60 hover:text-forest mt-4"
                  onClick={() => {
                    setForgotMode(false)
                    setError('')
                  }}
                >
                  {t('auth.backToSignIn')}
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit}>
              <Field label={t('auth.email')} required>
                <Input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label={t('auth.password')} required>
                <Input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>

              {error && <p className="text-sm text-clay mb-3">{error}</p>}

              <Button type="submit" className="w-full" size="lg" disabled={busy}>
                {busy ? t('auth.signingIn') : t('auth.signInCta')}
              </Button>
              <button
                type="button"
                className="w-full text-center text-sm text-bark/60 hover:text-forest mt-4"
                onClick={() => {
                  setForgotMode(true)
                  setError('')
                }}
              >
                {t('auth.forgotPassword')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
