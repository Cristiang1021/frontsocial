/**
 * Simple authentication utilities
 * Uses localStorage to store session
 */

const ACCESS_CODE_KEY = 'social_analytics_access_code'
const ACCESS_CODE = process.env.NEXT_PUBLIC_ACCESS_CODE || '1221'

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem(ACCESS_CODE_KEY)
  return stored === ACCESS_CODE
}

/**
 * Authenticate user with access code
 */
export function authenticate(code: string): boolean {
  if (code === ACCESS_CODE) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCESS_CODE_KEY, code)
    }
    return true
  }
  return false
}

/**
 * Logout user
 */
export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ACCESS_CODE_KEY)
  }
}

/**
 * Get access code from environment
 */
export function getAccessCode(): string {
  return ACCESS_CODE
}
