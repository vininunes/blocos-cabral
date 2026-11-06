import { FlaskConical } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { FloatCard } from '@/atomic/base-components/float-card'
import Tooltip from '@/atomic/base-components/tooltip'

import { versionSlug } from '@/atomic/modules/changelog/helpers/parse-versions'

import { APPLICATION_BASE_VERSION, APPLICATION_VERSION, IS_PRERELEASE } from '@/config/env'

import { cn } from '@/lib/tailwind/utils'

import {
  PRERELEASE_BADGE_COLOR,
  PRERELEASE_BADGE_LABEL,
  PRERELEASE_TOOLTIP_COLOR,
} from './prerelease-badge-colors'

type PrereleaseBadgeProps = {
  className?: string
  /**
   * 'pill': FloatCard circular (size-7) para os headers de módulo;
   * 'plain': o mesmo círculo sem FloatCard, para viver DENTRO de outro FloatCard (ex.: logo do VTS);
   * 'inline': chip pequeno (size-4) ao lado de textos.
   */
  variant?: 'pill' | 'plain' | 'inline'
}

/**
 * Sinaliza que a build atual é um pré-release (sufixo semver no `version` do
 * package.json, ex.: "3.16.0-rc.1"). Não renderiza nada em versões estáveis,
 * então pode ficar fixo no JSX dos headers sem condicional no caller.
 */
export function PrereleaseBadge({ className, variant = 'pill' }: PrereleaseBadgeProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (!IS_PRERELEASE) return null

  // Clique leva ao changelog, direto no bloco da versao atual (ancora = slug da
  // versao base, que e como o changelog registra a versao).
  const goToChangelog = () => navigate(`/changelog#${versionSlug(APPLICATION_BASE_VERSION)}`)
  const clickable = 'cursor-pointer transition-opacity hover:opacity-90'

  return (
    <Tooltip
      text={`${t('pre-release')} v${APPLICATION_VERSION}`}
      className={PRERELEASE_TOOLTIP_COLOR}
      side="right"
    >
      {variant === 'pill' ? (
        // FloatCard arredondado na altura (h-7) do selo dos headers, com
        // ícone + rótulo curto; a versão completa fica no tooltip.
        <FloatCard
          role="button"
          tabIndex={0}
          onClick={goToChangelog}
          onKeyDown={(e) => e.key === 'Enter' && goToChangelog()}
          className={cn(
            'flex h-7 items-center gap-1 rounded-full px-2 shrink-0',
            PRERELEASE_BADGE_COLOR,
            clickable,
            className
          )}
        >
          <FlaskConical size={9} />
          <span className="text-[10px] font-medium leading-none tracking-wide whitespace-nowrap">
            {PRERELEASE_BADGE_LABEL}
          </span>
        </FloatCard>
      ) : variant === 'plain' ? (
        <button
          type="button"
          onClick={goToChangelog}
          className={cn(
            'inline-flex h-7 items-center gap-1 rounded-full px-2 shrink-0',
            PRERELEASE_BADGE_COLOR,
            clickable,
            className
          )}
        >
          <FlaskConical size={9} />
          <span className="text-[10px] font-medium leading-none tracking-wide whitespace-nowrap">
            {PRERELEASE_BADGE_LABEL}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={goToChangelog}
          className={cn(
            'inline-flex size-4 items-center justify-center rounded-full shrink-0',
            PRERELEASE_BADGE_COLOR,
            clickable,
            className
          )}
        >
          <FlaskConical size={7} />
        </button>
      )}
    </Tooltip>
  )
}
