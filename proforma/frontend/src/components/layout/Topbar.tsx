import { useNavigate } from 'react-router-dom'
import { Plus } from '../ui/Icon'
import { CompanySwitcher } from './CompanySwitcher'
import { GlobalSearch } from './GlobalSearch'
import { NotificationBell } from './NotificationBell'
import { Button } from '../ui/Button'

export function Topbar() {
  const navigate = useNavigate()
  return (
    <header className="flex items-center gap-4 border-b border-border bg-white px-5 py-3 lg:px-8">
      <CompanySwitcher />
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
        <Button size="sm" icon={<Plus size={15} />} onClick={() => navigate('/proformas/nouvelle')}>
          Nouvelle proforma
        </Button>
      </div>
    </header>
  )
}
