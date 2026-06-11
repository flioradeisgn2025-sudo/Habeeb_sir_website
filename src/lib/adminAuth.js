import axios from 'axios'

// Central admin-auth helpers. The JWT lives in sessionStorage and is attached
// to every request via an axios interceptor (only admin endpoints need it, but
// attaching it everywhere is harmless and simpler).

const TOKEN_KEY = 'nalamvaazha_admin_token'
const USER_KEY = 'nalamvaazha_admin_user'

export function getToken() {
  try { return sessionStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function getAdminUser() {
  try { return sessionStorage.getItem(USER_KEY) || '' } catch { return '' }
}

export function setSession(token, username) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
    if (username) sessionStorage.setItem(USER_KEY, username)
  } catch {}
}

export function clearSession() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
  } catch {}
}

export function isAuthed() {
  return !!getToken()
}

let installed = false

// Install once at app start. Attaches the bearer token and auto-clears the
// session on a 401 from any admin endpoint.
export function installAuthInterceptors(onUnauthorized) {
  if (installed) return
  installed = true

  axios.interceptors.request.use((config) => {
    const token = getToken()
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  axios.interceptors.response.use(
    (res) => res,
    (error) => {
      const status = error?.response?.status
      const url = error?.config?.url || ''
      // Only treat a 401 as an expired/invalid SESSION on protected admin calls.
      // A 401 from login/change-password just means "wrong credentials right now"
      // and is handled by the calling component — don't clear/reload on those.
      const isAuthEndpoint = url.includes('/api/admin/auth/')
      if (status === 401 && url.includes('/api/admin/') && !isAuthEndpoint) {
        clearSession()
        if (typeof onUnauthorized === 'function') onUnauthorized()
      }
      return Promise.reject(error)
    }
  )
}

// API calls
export async function login(username, password) {
  const res = await axios.post('/api/admin/auth/login', { username, password })
  const { token, username: uname } = res.data.data
  setSession(token, uname)
  return uname
}

export async function changeCredentials({ currentPassword, newUsername, newPassword }) {
  const res = await axios.post('/api/admin/auth/change-password', {
    currentPassword, newUsername, newPassword,
  })
  const data = res.data.data
  // A fresh token is returned (old ones are now invalid) — keep this session alive
  if (data?.token) setSession(data.token, data.username)
  return data
}
