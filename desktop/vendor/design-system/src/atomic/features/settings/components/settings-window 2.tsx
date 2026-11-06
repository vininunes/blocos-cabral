import '../constants/settings-search-context'

import { useMemo } from 'react'

import { settingsDocs } from '@/app-settings/settings-docs'
import { settingsPages } from '@/app-settings/settings-pages'

import { type SidebarElement } from '@/atomic/components/sidebar'
import { SidebarPages } from '@/atomic/components/sidebar-pages'
import { buildSidebarElements } from '@/atomic/components/sidebar/helpers/build-sidebar-elements'

import { useSearchContext } from '@/hooks/use-search-context'
import { SidebarDoc, useSidebarPages } from '@/hooks/use-sidebar-pages'

export function SettingsWindow() {
  const { searchQuery, onNavigate, setSearchQuery, root, paths, indexState, searching } =
    useSidebarPages('general', settingsPages)

  const { results } = useSearchContext<SidebarDoc>('settings', settingsDocs, searchQuery)

  const sidebarElements = useMemo<SidebarElement[]>(() => {
    return buildSidebarElements(results, searching)
  }, [results, searching])

  return (
    <SidebarPages
      className="w-155 h-100 flex-none"
      pagesClassName="bg-transparent"
      pages={settingsPages}
      navigate={paths}
      indexState={indexState}
      newPage={onNavigate}
      elements={sidebarElements}
      onSearch={setSearchQuery}
      onSelect={onNavigate}
      selected={root}
      sidebarClassName="bg-transparent"
      // Janela compacta: a sidebar fica sempre visível, sem colapso, e o
      // header das páginas fica em fluxo normal (sem flutuar sobre o scroll)
      canCollapse={false}
      navigationFloat="collapsed"
      dispatchResizeOnToggle={false}
    />
  )
}
