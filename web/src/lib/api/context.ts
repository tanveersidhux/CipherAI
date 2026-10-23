import { createContext } from 'react'
import type { CipherApi } from '@/types/api'

export const CipherApiContext = createContext<CipherApi | null>(null)
