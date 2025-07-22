import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let mounted = true

    // Get initial session with improved error handling
    const getInitialSession = async () => {
      try {
        // First try to get the session without timeout
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Session error:', error)
          // Don't immediately set user to null, try to refresh the session
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
            if (refreshError) {
              console.error('Refresh session error:', refreshError)
              if (mounted) {
                setUser(null)
                setLoading(false)
              }
              return
            }
            
            if (refreshData.session && mounted) {
              setUser(refreshData.session.user)
              setLoading(false)
              console.log('Session refreshed successfully')
              return
            }
          } catch (refreshErr) {
            console.error('Failed to refresh session:', refreshErr)
          }
          
          if (mounted) {
            setUser(null)
            setLoading(false)
          }
          return
        }

        if (mounted) {
          setUser(session?.user ?? null)
          setLoading(false)
          setInitialized(true)
          
          if (session?.user) {
            console.log('Session loaded successfully for:', session.user.email)
          }
        }
      } catch (error) {
        console.error('Failed to get session:', error)
        
        // Try one more time with refresh
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          if (!refreshError && refreshData.session && mounted) {
            setUser(refreshData.session.user)
            setLoading(false)
            console.log('Session recovered via refresh')
            return
          }
        } catch (refreshErr) {
          console.error('Recovery refresh failed:', refreshErr)
        }
        
        if (mounted) {
          setUser(null)
          setLoading(false)
          setInitialized(true)
          setInitialized(true)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes with improved handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        if (!mounted) return

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setLoading(false)
          setInitialized(true)
          return
        }

        if (event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setUser(session.user)
            setLoading(false)
            setInitialized(true)
            console.log('Token refreshed for:', session.user.email)
          }
          return
        }

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          setLoading(false)
          setInitialized(true)

          // Update last_login when user signs in
          try {
            await supabase
              .from('users')
              .upsert({
                id: session.user.id,
                email: session.user.email!,
                username: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
                avatar_url: session.user.user_metadata?.avatar_url,
                last_login: new Date().toISOString()
              })
          } catch (error) {
            console.error('Error updating user data:', error)
          }
        } else if (session?.user) {
          setUser(session.user)
          setLoading(false)
          setInitialized(true)
        } else if (!session && event !== 'SIGNED_OUT') {
          // Don't immediately sign out, try to recover the session
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
            if (!refreshError && refreshData.session) {
              setUser(refreshData.session.user)
              setLoading(false)
              setInitialized(true)
              console.log('Session recovered during auth state change')
              return
            }
          } catch (refreshErr) {
            console.error('Failed to recover session during auth state change:', refreshErr)
          }
          
          setUser(null)
          setLoading(false)
          setInitialized(true)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      if (error) {
        console.error('Error signing in:', error)
        setLoading(false)
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
      }
      // Clear any cached data
      localStorage.clear()
      sessionStorage.clear()
      setUser(null)
      setLoading(false)
    } catch (error) {
      console.error('Sign out error:', error)
      setLoading(false)
    }
  }

  return {
    user,
    loading,
    initialized,
    signInWithGoogle,
    signOut
  }
}