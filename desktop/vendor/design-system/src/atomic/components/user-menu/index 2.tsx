import { ReactNode, useEffect, useMemo, useState } from 'react'

import { t } from 'i18next'
import { Anchor, ChevronDown, Languages, LogOutIcon, Moon, Sun, SunMoon, User } from 'lucide-react'

import { accountLogout } from '@/accounts/helpers/account'
import { getTenantName } from '@/accounts/helpers/auth-storage'
import { getUserDisplayName } from '@/accounts/helpers/user-display'
import { getUserRole, isAdmin } from '@/accounts/scopes'

import { BadgeBase } from '@/atomic/base-components/badge-base'
import { Button } from '@/atomic/base-components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/atomic/base-components/dropdown-menu'
import { FloatCard } from '@/atomic/base-components/float-card'
import { IconProvider } from '@/atomic/base-components/icon-provider'

import { FleetIcon } from '@/atomic/features/fleet/components/fleet-icon'
import { WidgetPortTabs } from '@/atomic/features/port/components/widget-port-tabs'

import {
  useFavoriteFleetId,
  useSetFavoriteFleetId,
} from '@/atomic/features/fleet/hooks/use-favorite-fleet'
import { useFleetQuery } from '@/atomic/features/fleet/hooks/use-fleet-queries'
import { usePorts } from '@/atomic/features/port/hooks/queries/use-port-queries'
import {
  useFavoritePortAttention,
  useFavoritePortId,
  useSetFavoritePortId,
} from '@/atomic/features/port/hooks/use-favorite-port'
import { useSettings } from '@/atomic/features/settings/hooks/use-settings'

import type { Settings } from '@/atomic/features/settings/models/settings'

import { cn } from '@/lib/tailwind/utils'

import { setTheme } from '@/styles/set-theme'

import { setLanguage } from '@/translation/set-language'

import { LogoutConfirmDialog, shouldSkipLogoutConfirm } from './logout-confirm-dialog'

const LANGUAGE_OPTIONS: { value: Settings['language']; name: string }[] = [
  { value: 'en-US', name: 'English (US)' },
  { value: 'pt-BR', name: 'Português (BR)' },
]

const THEME_OPTIONS: { value: Settings['app_theme']; name: () => string; icon: ReactNode }[] = [
  { value: 'light', name: () => 'Light', icon: <Sun className="size-3.5" /> },
  { value: 'dark', name: () => 'Dark', icon: <Moon className="size-3.5" /> },
  { value: 'system', name: () => t('system'), icon: <SunMoon className="size-3.5" /> },
]

/** Linha-gatilho das opções da bandeja: ícone à esquerda, valor atual
 *  centralizado e chevron à direita — botões soltos, sem Box. */
function MenuRowTrigger({
  icon,
  label,
  attention,
  className,
  ...props
}: {
  icon: ReactNode
  label: ReactNode
  attention?: boolean
} & React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'group relative flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary px-2 text-xs transition-colors hover:bg-primary hover:text-primary-foreground',
        className
      )}
      {...props}
    >
      <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground group-hover:text-primary-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-center">{label}</span>
      <ChevronDown className="size-3.5 shrink-0 opacity-50" />
      {attention && (
        <span className="pointer-events-none absolute -right-1 -top-1 flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
        </span>
      )}
    </button>
  )
}

type UserMenuProps = {
  align?: 'start' | 'center' | 'end'
  /** Trigger só com o ícone (welcome) — o nome vai para o box do popover. */
  iconOnly?: boolean
}

export function UserMenu({ align = 'center', iconOnly = false }: UserMenuProps) {
  const name = getUserDisplayName()
  const role = getUserRole()
  // Nome do customer do usuário (persistido a partir do GET /entities/me).
  // Exibido só para admin — informação de administração multi-tenant.
  const tenantName = isAdmin() ? getTenantName() : undefined
  const { getSetting, handleSettings } = useSettings()
  const appTheme = getSetting('app_theme')
  const language = getSetting('language')

  const { data: ports = [] } = usePorts()
  const favoritePortId = useFavoritePortId()
  const setFavoritePort = useSetFavoritePortId()
  // Bolinha azul no elemento do usuário: há portos e o favorito não foi
  // configurado (marcação em localStorage escrita pela busca do favorito).
  const needsFavoritePortAttention = useFavoritePortAttention()
  // Sub-dropdown do porto: os itens do WidgetPortTabs não são DropdownMenuItem,
  // então o Radix não fecha sozinho ao selecionar — fechamos no onPortSelect.
  const [portOpen, setPortOpen] = useState(false)

  const { data: fleets = [] } = useFleetQuery()
  const favoriteFleetId = useFavoriteFleetId()
  const setFavoriteFleet = useSetFavoriteFleetId()

  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const favoritePort = useMemo(
    () => ports.find((port) => port.id === favoritePortId),
    [ports, favoritePortId]
  )
  const favoriteFleet = useMemo(
    () => fleets.find((fleet) => fleet.id === favoriteFleetId),
    [fleets, favoriteFleetId]
  )

  const currentLanguage = LANGUAGE_OPTIONS.find((option) => option.value === language)
  const currentTheme = THEME_OPTIONS.find((option) => option.value === appTheme)

  const handleLogoutClick = () => {
    if (shouldSkipLogoutConfirm()) accountLogout()
    else setLogoutConfirmOpen(true)
  }

  useEffect(() => {
    setTheme(appTheme)
  }, [appTheme])

  function handleThemeChange(value: Settings['app_theme']) {
    handleSettings('app_theme', value)
  }

  function handleLanguageChange(value: Settings['language']) {
    handleSettings('language', value)
    setLanguage(value)
  }

  return (
    <>
      {/* modal={false}: evita o bug do Radix em que o body fica com
          pointer-events:none ao abrir um Dialog a partir do dropdown. */}
      <DropdownMenu modal={false}>
        {/* Trigger em FloatCard — mesmo padrão visual do botão de voltar e do
            sino de notificações dos headers */}
        <DropdownMenuTrigger asChild>
          <FloatCard className="flex h-9 items-center p-1 cursor-pointer transition-colors hover:bg-muted/50">
            {iconOnly ? (
              <Button size="icon" variant="ghost" className="size-7 hover:bg-transparent">
                <User size={16} />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="h-7 gap-2 px-2 hover:bg-transparent">
                <User size={14} />
                {name}
              </Button>
            )}
            {/* Indicador de atenção na própria borda do float card, com ping. */}
            {needsFavoritePortAttention && (
              <span className="pointer-events-none absolute -right-1 -top-1 flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
              </span>
            )}
          </FloatCard>
        </DropdownMenuTrigger>
        {/* Bandeja em estilo float card: botões soltos, sem Box */}
        <DropdownMenuContent
          align={align}
          className="flex w-64 flex-col gap-1.5 rounded-xl px-3 pb-3"
        >
          {/* Nome · role (texto simples), com o badge do customer logo abaixo */}
          <div className="flex flex-col items-center gap-1 py-1">
            <div className="flex items-center justify-center gap-1.5 text-xs">
              <span className="font-medium">{name}</span>
              {role && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{t(`role-${role}`)}</span>
                </>
              )}
            </div>
            {tenantName && (
              <BadgeBase variant="outline" className="whitespace-nowrap">
                {tenantName}
              </BadgeBase>
            )}
          </div>

          {/* Language */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <MenuRowTrigger
                icon={<Languages className="size-3.5" />}
                label={currentLanguage?.name ?? language}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" sideOffset={4} className="w-56">
              {LANGUAGE_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleLanguageChange(option.value)}
                  className={cn(option.value === language && 'bg-accent')}
                >
                  {option.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <MenuRowTrigger icon={currentTheme?.icon} label={currentTheme?.name()} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" sideOffset={4} className="w-56">
              {THEME_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleThemeChange(option.value)}
                  className={cn(option.value === appTheme && 'bg-accent')}
                >
                  {option.icon}
                  {option.name()}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Favorite port */}
          {ports.length > 0 && (
            <DropdownMenu modal={false} open={portOpen} onOpenChange={setPortOpen}>
              <DropdownMenuTrigger asChild>
                <MenuRowTrigger
                  icon={<Anchor className="size-3.5" />}
                  label={favoritePort?.name ?? t('select-port')}
                  attention={needsFavoritePortAttention}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" sideOffset={4} className="w-80 p-0">
                <div className="flex w-full items-center justify-center px-2 py-1">
                  <p className="text-xs font-medium">{t('favorite-port')}</p>
                </div>
                <WidgetPortTabs
                  ports={ports}
                  // O label "Porto favorito" acima já dá o respiro do topo
                  searchClassName="pt-0"
                  selectedPortId={favoritePort?.id}
                  onPortSelect={(port) => {
                    setFavoritePort(port.id)
                    setPortOpen(false)
                  }}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Favorite fleet */}
          {fleets.length > 0 && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <MenuRowTrigger
                  icon={<IconProvider icon="fleets" className="size-3.5" />}
                  label={favoriteFleet?.name ?? t('select-fleet')}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="center"
                sideOffset={4}
                className="w-56 max-h-80 overflow-auto px-2 pb-2"
              >
                <div className="flex w-full items-center justify-center px-2 py-1">
                  <p className="text-xs font-medium">{t('favorite-fleet')}</p>
                </div>
                {fleets.map((fleet) => (
                  <DropdownMenuItem
                    key={fleet.id}
                    onClick={() => setFavoriteFleet(fleet.id)}
                    className={cn(
                      fleet.id === favoriteFleetId &&
                        'bg-primary text-primary-foreground focus:bg-primary/90 focus:text-primary-foreground'
                    )}
                  >
                    <FleetIcon color={fleet.color} className="size-4" iconClassName="size-2.5" />
                    <span className="truncate">{fleet.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Logout: mesma cor dos selects; destructive sólido no hover */}
          <button
            type="button"
            onClick={handleLogoutClick}
            className="flex h-8 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-2 text-xs transition-colors hover:bg-destructive hover:text-white"
          >
            <span>{t('logout')}</span>
            <LogOutIcon className="size-3.5" />
          </button>
        </DropdownMenuContent>
      </DropdownMenu>

      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        onConfirm={accountLogout}
      />
    </>
  )
}
