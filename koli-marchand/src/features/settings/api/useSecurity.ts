import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'

// Toutes ces routes vivent sur backend/'s /api/auth/* — partagées avec koili
// (voir ProfilPage.tsx > TabSecurite) : même 2FA TOTP, même score de
// sécurité réel, même mécanisme hasPassword pour les comptes sans mot de
// passe connu (non applicable en pratique aux marchands, qui en définissent
// toujours un à l'inscription, mais géré ici par cohérence/sécurité).
export interface SecurityScore {
  score: number
  checklist: { key: string; label: string; done: boolean }[]
  hasPassword: boolean
}

export interface TwoFactorSetup {
  secret: string
  qrCodeDataUrl: string
}

function errorMessage(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback
}

export function useSecurityScore() {
  return useQuery({
    queryKey: ['security-score'],
    queryFn: async () => unwrap(await api.get<{ success: boolean; data: SecurityScore }>('/api/auth/security-score')),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      try {
        await api.put('/api/auth/password', payload)
      } catch (err) {
        throw new Error(errorMessage(err, 'Erreur lors du changement de mot de passe.'))
      }
    },
  })
}

export function useRequestSetPassword() {
  return useMutation({
    mutationFn: async () => {
      try {
        await api.post('/api/auth/password/request-set')
      } catch (err) {
        throw new Error(errorMessage(err, 'Erreur lors de l\'envoi du lien.'))
      }
    },
  })
}

export function useSetupTwoFactor() {
  return useMutation({
    mutationFn: async () => {
      try {
        return unwrap(await api.post<{ success: boolean; data: TwoFactorSetup }>('/api/auth/2fa/setup'))
      } catch (err) {
        throw new Error(errorMessage(err, 'Erreur lors de la génération du QR code.'))
      }
    },
  })
}

export function useVerifyTwoFactorSetup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (code: string) => {
      try {
        return unwrap(await api.post<{ success: boolean; data: { recoveryCodes: string[] } }>('/api/auth/2fa/verify-setup', { code }))
      } catch (err) {
        throw new Error(errorMessage(err, 'Code invalide.'))
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['security-score'] }),
  })
}

export function useDisableTwoFactor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (password: string) => {
      try {
        await api.post('/api/auth/2fa/disable', { password })
      } catch (err) {
        throw new Error(errorMessage(err, 'Erreur lors de la désactivation.'))
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['security-score'] }),
  })
}
