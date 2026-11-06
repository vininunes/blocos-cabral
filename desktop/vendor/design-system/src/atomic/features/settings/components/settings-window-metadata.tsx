import { lazy, Suspense } from 'react'

import { Cog } from 'lucide-react'

import { Loading } from '@/atomic/base-components/loading'

import { WindowMetadata } from '../../windows/models/window'

// Lazy: a janela de settings (~40 handlers/docs + registro MiniSearch) saía no
// chunk crítico do VTS só por esta metadata ser importada no boot. O fallback
// tem o MESMO tamanho da SettingsWindow (w-155 h-100): a <Window> calcula a
// posição inicial pelo tamanho do elemento no render; com fallback vazio ela
// abria sem nada, posicionada pequena, e crescia torta quando o chunk chegava.
const SettingsWindow = lazy(() =>
  import('./settings-window').then((m) => ({ default: m.SettingsWindow }))
)

export const settingsWindowMetadata: WindowMetadata = {
  id: 'settings',
  title: 'settings',
  icon: <Cog key={`icon-settings`} />,
  children: (
    <Suspense key={`children-settings`} fallback={<Loading className="w-155 h-100 flex-none" />}>
      <SettingsWindow />
    </Suspense>
  ),
}
