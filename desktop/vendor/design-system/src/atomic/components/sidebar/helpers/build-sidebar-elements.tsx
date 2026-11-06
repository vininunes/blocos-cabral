import { t } from 'i18next'

import { SidebarElement } from '@/atomic/components/sidebar'

import { SidebarDoc } from '@/hooks/use-sidebar-pages'

export function buildSidebarElements(
  docs: SidebarDoc[],
  searching: boolean = false
): SidebarElement[] {
  const sections = docs.filter((doc) => doc.root)

  if (!searching)
    return sections.map((group) => {
      return {
        id: group.path,
        title: t(group.title),
        icon: group.icon,
      }
    })

  return sections.map((group) => {
    return {
      id: group.path,
      title: t(group.title),
      icon: group.icon,
      subElements: docs
        .filter((doc) => doc.path.includes(`${group.path}`) && !doc.root)
        .map((subElement) => {
          return { ...subElement, title: t(subElement.title), id: subElement.path }
        }),
    }
  })
}
