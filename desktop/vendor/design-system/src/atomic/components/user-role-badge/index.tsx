import { t } from 'i18next'

import { type RoleName } from '@/accounts/scope-catalog'
import { getUserRole } from '@/accounts/scopes'

import { BadgeBase, type BadgeVariant } from '@/atomic/base-components/badge-base'

import { cn } from '@/lib/tailwind/utils'

// Cor por papel (hierarquia visual): admin (primary) > supervisor (secondary) >
// operator/viewer (outline). Apenas informativo — a autoridade é o backend.
const ROLE_VARIANT: Record<RoleName, BadgeVariant> = {
  admin: 'default',
  supervisor: 'secondary',
  operator: 'outline',
  viewer: 'outline',
}

const ROLE_LABEL_KEY: Record<RoleName, string> = {
  admin: 'role-admin',
  supervisor: 'role-supervisor',
  operator: 'role-operator',
  viewer: 'role-viewer',
}

/**
 * Badge com o papel do usuário (operator/supervisor/admin), derivado de
 * `getUserRole()`. Não renderiza nada se o token não trouxer nenhum `role.*`.
 */
export function UserRoleBadge({ className }: { className?: string }) {
  const role = getUserRole()
  if (!role) return null

  return (
    <BadgeBase variant={ROLE_VARIANT[role]} className={cn('text-[10px]', className)}>
      {t(ROLE_LABEL_KEY[role])}
    </BadgeBase>
  )
}
