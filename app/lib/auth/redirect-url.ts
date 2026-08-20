const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1'])

function normalizeUrl(url: string) {
  return url.replace(/\/$/, '')
}

export function getAuthRedirectBaseUrl() {
  if (typeof window !== 'undefined') {
    if (LOCAL_HOSTNAMES.has(window.location.hostname)) {
      return normalizeUrl(window.location.origin)
    }

    return normalizeUrl(
      process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    )
  }

  return normalizeUrl(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.beginy.cz'
  )
}

export function getPasswordRecoveryRedirectUrl() {
  return `${getAuthRedirectBaseUrl()}/auth/callback?type=recovery`
}
