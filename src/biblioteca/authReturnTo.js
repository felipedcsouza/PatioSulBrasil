export const AUTH_RETURN_KEY = 'auth-return-to'
export function setAuthReturnTo(path) { sessionStorage.setItem(AUTH_RETURN_KEY, path) }
export function getAuthReturnTo() { return sessionStorage.getItem(AUTH_RETURN_KEY) || '/dashboard' }
