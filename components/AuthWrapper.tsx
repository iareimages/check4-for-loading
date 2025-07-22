import { useAuth } from '@/hooks/useAuth'
import React, { useEffect, useState } from 'react'
import LoginPage from './LoginPage'

interface AuthWrapperProps {
  children: React.ReactNode
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { user, loading, initialized } = useAuth()
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    // Only show login if auth is initialized and no user
    if (initialized && !user && !loading) {
      setShowLogin(true)
    } else if (user) {
      setShowLogin(false)
    }
  }, [user, loading, initialized])

  // Show loading spinner while auth is initializing
  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
          <p className="text-white text-lg">Loading your music...</p>
          <p className="text-gray-400 text-sm mt-2">
            {!initialized ? 'Initializing...' : 'Authenticating...'}
          </p>
        </div>
      </div>
    )
  }

  // Show login page if no user and auth is initialized
  if (!user && showLogin) {
    return <LoginPage />
  }

  // Show main app if user is authenticated
  return <>{children}</>
}

export default AuthWrapper