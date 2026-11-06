import { APPLICATION_RELEASE_CHANNEL } from '@/config/env'

// Cor por canal: `dev` (ainda não candidata a release) em verde-água; os demais
// (rc, beta, alpha) em roxo. Tooltip num tom mais escuro da mesma cor.
// Fica fora do componente para o react-refresh (arquivo só com componentes).
const IS_DEV_CHANNEL = APPLICATION_RELEASE_CHANNEL === 'dev'

export const PRERELEASE_BADGE_COLOR = IS_DEV_CHANNEL
  ? 'bg-[#45897f] text-white'
  : 'bg-purple-600 text-white'

export const PRERELEASE_TOOLTIP_COLOR = IS_DEV_CHANNEL
  ? 'bg-[#2f6159] text-white outline-[#1f423c]/40'
  : 'bg-purple-800 text-white outline-purple-950/40'

/** Rótulo curto ao lado do ícone: `dev` ainda está em revisão; os demais são candidatos. */
export const PRERELEASE_BADGE_LABEL = IS_DEV_CHANNEL ? 'REVIEW' : 'PRE RELEASE'
