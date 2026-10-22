import React, { createContext, useContext, useEffect, useState } from 'react'

export interface ReputationProviderInfo {
  name: string
  enabled: boolean
}

export interface FeatureFlags {
  reputation: boolean
  email_analysis: boolean
  batch: boolean
  export: boolean
  watchlists: boolean
  notifications: boolean
  collaboration: boolean
  reputation_providers: ReputationProviderInfo[]
}

const DEFAULT_FLAGS: FeatureFlags = {
  reputation: true,
  email_analysis: true,
  batch: true,
  export: true,
  watchlists: false,
  notifications: false,
  collaboration: false,
  reputation_providers: [
    { name: 'google_safe_browsing', enabled: true },
    { name: 'virustotal', enabled: true },
    { name: 'urlhaus', enabled: true },
  ],
}

interface FeatureFlagsContextValue {
  flags: FeatureFlags
  loading: boolean
  isFeatureEnabled: (feature: keyof Omit<FeatureFlags, 'reputation_providers'>) => boolean
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flags: DEFAULT_FLAGS,
  loading: false,
  isFeatureEnabled: () => true,
})

export const FeatureFlagsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const fetchFlags = async () => {
      try {
        const res = await fetch('/api/v1/config/features')
        if (res.ok) {
          const data = await res.json()
          if (mounted) {
            setFlags({
              reputation: Boolean(data.reputation ?? DEFAULT_FLAGS.reputation),
              email_analysis: Boolean(data.email_analysis ?? DEFAULT_FLAGS.email_analysis),
              batch: Boolean(data.batch ?? DEFAULT_FLAGS.batch),
              export: Boolean(data.export ?? DEFAULT_FLAGS.export),
              watchlists: Boolean(data.watchlists ?? DEFAULT_FLAGS.watchlists),
              notifications: Boolean(data.notifications ?? DEFAULT_FLAGS.notifications),
              collaboration: Boolean(data.collaboration ?? DEFAULT_FLAGS.collaboration),
              reputation_providers: Array.isArray(data.reputation_providers)
                ? data.reputation_providers
                : DEFAULT_FLAGS.reputation_providers,
            })
          }
        }
      } catch {
        // Fall back gracefully to defaults
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchFlags()
    return () => {
      mounted = false
    }
  }, [])

  const isFeatureEnabled = (feature: keyof Omit<FeatureFlags, 'reputation_providers'>) => {
    return Boolean(flags[feature])
  }

  return (
    <FeatureFlagsContext.Provider value={{ flags, loading, isFeatureEnabled }}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

export const useFeatureFlags = () => useContext(FeatureFlagsContext)
