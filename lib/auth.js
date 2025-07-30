import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

export const authConfig = {
  JWT_SECRET,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  COOKIE_NAME: 'airo-auth-token',
  REMEMBER_ME_DURATION: 24 * 60 * 60, // 1 day in seconds
  SESSION_DURATION: 60 * 60 // 1 hour in seconds
}

export function generateToken(username, rememberMe = false) {
  const payload = {
    username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (rememberMe ? authConfig.REMEMBER_ME_DURATION : authConfig.SESSION_DURATION)
  }
  
  return jwt.sign(payload, JWT_SECRET)
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

export function validateCredentials(username, password) {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD
}

export function isTokenValid(token) {
  const decoded = verifyToken(token)
  if (!decoded) return false
  
  const now = Math.floor(Date.now() / 1000)
  return decoded.exp > now
}

// Browser-side authentication helpers
export const clientAuth = {
  setAuthCookie(token, rememberMe = false) {
    const expires = rememberMe ? new Date(Date.now() + authConfig.REMEMBER_ME_DURATION * 1000) : new Date(Date.now() + authConfig.SESSION_DURATION * 1000)
    document.cookie = `${authConfig.COOKIE_NAME}=${token}; expires=${expires.toUTCString()}; path=/; secure; samesite=strict`
  },

  getAuthCookie() {
    if (typeof document === 'undefined') return null
    
    const cookies = document.cookie.split(';')
    const authCookie = cookies.find(cookie => cookie.trim().startsWith(`${authConfig.COOKIE_NAME}=`))
    
    if (!authCookie) return null
    
    return authCookie.split('=')[1]
  },

  removeAuthCookie() {
    document.cookie = `${authConfig.COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  },

  isAuthenticated() {
    const token = this.getAuthCookie()
    return token && isTokenValid(token)
  },

  logout() {
    this.removeAuthCookie()
    window.location.href = '/login'
  }
}