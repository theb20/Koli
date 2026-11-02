import { PageHeader } from '@/components/ui/PageHeader'
import SecurityTab from './SecurityTab'

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Sécurité de votre compte" />
      <SecurityTab />
    </div>
  )
}
