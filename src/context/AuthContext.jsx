import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { i18n } = useTranslation()
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (!error && data) {
      setProfile(data)
      // Respect the language the person set on their account, if it differs from the browser default
      if (data.preferred_language && data.preferred_language !== i18n.language) {
        i18n.changeLanguage(data.preferred_language)
      }
    }
  }, [i18n])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      if (session?.user) loadProfile(session.user.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  // Self-service password change — requires an active session, re-verifies the
  // current password first so someone who walked away from an unlocked device
  // can't change it without knowing it.
  const changePassword = async (currentPassword, newPassword) => {
    if (!session?.user?.email) return { error: new Error('No active session') }
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: currentPassword
    })
    if (verifyError) return { error: verifyError }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }

  // "Forgot password" — sends a reset link to the given email. The link lands
  // the person on /reset-password with a temporary recovery session already set.
  const sendPasswordReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    return { error }
  }

  // Called from the /reset-password page once a recovery session is active.
  const completePasswordReset = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }

  // Persists the language choice to the person's profile so it follows them to any device
  const setLanguage = async (lang) => {
    i18n.changeLanguage(lang)
    if (profile?.id) {
      await supabase.from('profiles').update({ preferred_language: lang }).eq('id', profile.id)
      setProfile((p) => (p ? { ...p, preferred_language: lang } : p))
    }
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    loading,
    signIn,
    signOut,
    changePassword,
    sendPasswordReset,
    completePasswordReset,
    setLanguage
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
