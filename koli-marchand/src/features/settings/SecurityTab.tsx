import { useState } from 'react'
import { ShieldCheck, ShieldOff, QrCode, Copy, KeyRound, CheckCircle2, AlertCircle, Lock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/FormField'
import {
  useSecurityScore,
  useChangePassword,
  useRequestSetPassword,
  useSetupTwoFactor,
  useVerifyTwoFactorSetup,
  useDisableTwoFactor,
  type TwoFactorSetup,
} from './api/useSecurity'

type TwoFAStep = 'idle' | 'setup' | 'recovery' | 'disable'

export default function SecurityTab() {
  const { data: score, isLoading: scoreLoading } = useSecurityScore()
  const twoFAEnabled = score?.checklist.find(c => c.key === 'two_factor')?.done ?? false

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-[#0a0a0b]">Score de sécurité</h2>
            <p className="text-sm text-[#6b6b68] mt-0.5">Protégez votre compte marchand contre les accès non autorisés</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-extrabold text-[#1E90FF]">{scoreLoading ? '···' : `${score?.score ?? 0}%`}</p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-[#f0f0ed] overflow-hidden mb-4">
          <div className="h-full rounded-full bg-[#1E90FF] transition-all" style={{ width: `${score?.score ?? 0}%` }} />
        </div>
        <div className="space-y-2">
          {(score?.checklist ?? []).map(item => (
            <div key={item.key} className="flex items-center gap-2 text-sm">
              {item.done ? <CheckCircle2 size={14} className="text-[#1E90FF] shrink-0" /> : <AlertCircle size={14} className="text-[#a3a3a1] shrink-0" />}
              <span className={item.done ? 'text-[#0a0a0b]' : 'text-[#a3a3a1]'}>{item.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <TwoFactorCard twoFAEnabled={twoFAEnabled} hasPassword={score?.hasPassword ?? true} />

      {score && !score.hasPassword ? <SetPasswordCard /> : <ChangePasswordCard />}
    </div>
  )
}

/* ── Authentification à deux facteurs ────────────────────── */
function TwoFactorCard({ twoFAEnabled, hasPassword }: { twoFAEnabled: boolean; hasPassword: boolean }) {
  const [step, setStep] = useState<TwoFAStep>('idle')
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [disablePwd, setDisablePwd] = useState('')

  const setupMutation = useSetupTwoFactor()
  const verifyMutation = useVerifyTwoFactorSetup()
  const disableMutation = useDisableTwoFactor()

  const reset = () => {
    setStep('idle'); setSetup(null); setCode(''); setRecoveryCodes([]); setCopied(false); setDisablePwd('')
    setupMutation.reset(); verifyMutation.reset(); disableMutation.reset()
  }

  const startSetup = () => {
    setupMutation.mutate(undefined, {
      onSuccess: data => { setSetup(data); setStep('setup') },
    })
  }

  const confirmSetup = () => {
    if (code.length !== 6) return
    verifyMutation.mutate(code, {
      onSuccess: data => { setRecoveryCodes(data.recoveryCodes); setStep('recovery') },
    })
  }

  const disable = () => {
    if (!disablePwd) return
    disableMutation.mutate(disablePwd, { onSuccess: reset })
  }

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-bold text-[#0a0a0b] flex items-center gap-2">
          {twoFAEnabled ? <ShieldCheck size={16} className="text-[#1E90FF]" /> : <ShieldOff size={16} className="text-[#a3a3a1]" />}
          Authentification à deux facteurs
        </h2>
        {twoFAEnabled && (
          <span className="text-xs text-[#1E90FF] font-semibold bg-[#1E90FF]/10 px-2 py-1 rounded-full">Activée</span>
        )}
      </div>
      <p className="text-sm text-[#6b6b68] mb-4">Protégez votre compte avec un code généré par une application d'authentification (Google Authenticator, Authy…).</p>

      {step === 'idle' && (
        twoFAEnabled ? (
          <Button variant="danger" className="w-full" onClick={() => setStep('disable')}>Désactiver la 2FA</Button>
        ) : !hasPassword ? (
          <p className="text-sm text-[#6b6b68] bg-[#f5f5f3] rounded-xl p-3">
            Définissez d'abord un mot de passe (ci-dessous) — sinon vous ne pourriez plus désactiver la 2FA vous-même.
          </p>
        ) : (
          <Button className="w-full" icon={<QrCode size={16} />} isLoading={setupMutation.isPending} onClick={startSetup}>
            Activer la 2FA
          </Button>
        )
      )}

      {step === 'setup' && setup && (
        <div className="space-y-4">
          {verifyMutation.isError && (
            <p className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              <AlertCircle size={14} /> {(verifyMutation.error as Error).message}
            </p>
          )}
          <div className="flex flex-col items-center gap-3 p-4 bg-[#f5f5f3] rounded-xl">
            <img src={setup.qrCodeDataUrl} alt="QR code 2FA" className="w-40 h-40 rounded-lg bg-white p-2 border border-[#e8e8e4]" />
            <p className="text-xs text-[#6b6b68] text-center">Scannez ce QR code, ou saisissez la clé manuellement :</p>
            <code className="text-xs bg-white border border-[#e8e8e4] rounded-lg px-3 py-1.5 tracking-wider select-all">{setup.secret}</code>
          </div>
          <TextField
            label="Code à 6 chiffres" id="totp-code" inputMode="numeric" placeholder="123456" maxLength={6}
            value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={e => e.key === 'Enter' && confirmSetup()}
          />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={reset}>Annuler</Button>
            <Button className="flex-1" disabled={code.length !== 6} isLoading={verifyMutation.isPending} onClick={confirmSetup}>Confirmer</Button>
          </div>
        </div>
      )}

      {step === 'recovery' && (
        <div className="space-y-4">
          <p className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
            <CheckCircle2 size={14} className="shrink-0" /> 2FA activée avec succès. Conservez ces codes de récupération en lieu sûr.
          </p>
          <div className="p-4 bg-[#f5f5f3] rounded-xl">
            <p className="text-xs text-[#6b6b68] mb-2 flex items-center gap-1.5"><KeyRound size={12} /> Chaque code n'est utilisable qu'une seule fois, en cas de perte d'accès à votre application d'authentification.</p>
            <div className="grid grid-cols-2 gap-2">
              {recoveryCodes.map(c => (
                <code key={c} className="text-xs bg-white border border-[#e8e8e4] rounded-lg px-2 py-1.5 text-center tracking-wide">{c}</code>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" icon={<Copy size={14} />} onClick={copyRecoveryCodes}>
              {copied ? 'Copié !' : 'Copier les codes'}
            </Button>
            <Button className="flex-1" onClick={reset}>Terminé</Button>
          </div>
        </div>
      )}

      {step === 'disable' && (
        <div className="space-y-3">
          {disableMutation.isError && (
            <p className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              <AlertCircle size={14} /> {(disableMutation.error as Error).message}
            </p>
          )}
          <TextField
            label="Confirmez avec votre mot de passe" id="disable-2fa-pwd" type="password" placeholder="••••••••"
            value={disablePwd} onChange={e => setDisablePwd(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && disable()}
          />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={reset}>Annuler</Button>
            <Button variant="danger" className="flex-1" disabled={!disablePwd} isLoading={disableMutation.isPending} onClick={disable}>Désactiver</Button>
          </div>
        </div>
      )}
    </Card>
  )
}

/* ── Changer le mot de passe (compte avec mot de passe connu) ── */
function ChangePasswordCard() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [success, setSuccess] = useState(false)
  const mutation = useChangePassword()

  const submit = () => {
    if (!current || !next || next !== confirm) return
    mutation.mutate({ currentPassword: current, newPassword: next }, {
      onSuccess: () => {
        setSuccess(true); setCurrent(''); setNext(''); setConfirm('')
        setTimeout(() => setSuccess(false), 3000)
      },
    })
  }

  return (
    <Card className="p-6">
      <h2 className="font-bold text-[#0a0a0b] mb-4 flex items-center gap-2"><Lock size={16} className="text-[#1E90FF]" /> Changer le mot de passe</h2>
      {success && (
        <p className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm mb-4">
          <CheckCircle2 size={14} /> Mot de passe mis à jour avec succès.
        </p>
      )}
      {mutation.isError && (
        <p className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-4">
          <AlertCircle size={14} /> {(mutation.error as Error).message}
        </p>
      )}
      <div className="space-y-3">
        <TextField label="Mot de passe actuel" id="current-pwd" type="password" placeholder="••••••••" value={current} onChange={e => setCurrent(e.target.value)} />
        <TextField label="Nouveau mot de passe" id="new-pwd" type="password" placeholder="Minimum 8 caractères" value={next} onChange={e => setNext(e.target.value)} />
        <TextField
          label="Confirmer le nouveau mot de passe" id="confirm-pwd" type="password" placeholder="Répétez le mot de passe"
          value={confirm} onChange={e => setConfirm(e.target.value)}
          error={confirm && confirm !== next ? 'Les mots de passe ne correspondent pas' : undefined}
        />
      </div>
      <Button
        className="mt-4 w-full" icon={<Lock size={14} />} isLoading={mutation.isPending}
        disabled={!current || !next || next !== confirm} onClick={submit}
      >
        Mettre à jour le mot de passe
      </Button>
    </Card>
  )
}

/* ── Définir un mot de passe (cas rare — compte sans mot de passe connu) ── */
function SetPasswordCard() {
  const [sent, setSent] = useState(false)
  const mutation = useRequestSetPassword()

  return (
    <Card className="p-6">
      <h2 className="font-bold text-[#0a0a0b] mb-1 flex items-center gap-2"><Lock size={16} className="text-[#1E90FF]" /> Définir un mot de passe</h2>
      <p className="text-sm text-[#6b6b68] mb-4">Votre compte n'a pas de mot de passe connu. En définir un vous permettra aussi de gérer la 2FA.</p>
      {mutation.isError && (
        <p className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-4">
          <AlertCircle size={14} /> {(mutation.error as Error).message}
        </p>
      )}
      {sent ? (
        <p className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
          <CheckCircle2 size={14} className="shrink-0" /> Un lien vient de vous être envoyé par email pour définir votre mot de passe.
        </p>
      ) : (
        <Button className="w-full" icon={<Lock size={14} />} isLoading={mutation.isPending}
          onClick={() => mutation.mutate(undefined, { onSuccess: () => setSent(true) })}>
          Recevoir un lien par email
        </Button>
      )}
    </Card>
  )
}
