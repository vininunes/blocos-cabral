import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useLocation, useNavigate } from 'react-router-dom'

import { type FeatureName, type RoleName } from '@/accounts/scope-catalog'

import { Page, RenderPage } from '@/atomic/components/pages'
import { SidebarElement } from '@/atomic/components/sidebar'

import { getRootFromPath } from '@/helpers/path'

import { SearchDoc } from '@/lib/search/search-doc'

export type SidebarDoc = SearchDoc & {
  root?: boolean
  icon?: SidebarElement['icon']
  /** Feature do catálogo que controla o acesso ao item. Sem valor = sem gate. */
  feature?: FeatureName
  /** Ação exigida sobre a feature: 'read' (padrão), 'write' ou 'delete'. */
  action?: 'read' | 'write' | 'delete'
  /** Papel exigido além do escopo (ver `FeatureGated.role`). */
  role?: RoleName
}

/**
 * Checks whether a pathname belongs to the given base URL.
 * '/details' and '/details/foo' are under '/details'; '/' and '/vts' are not.
 */
function isUnderBase(pathname: string, baseUrl: string): boolean {
  return pathname === baseUrl || pathname.startsWith(`${baseUrl}/`)
}

/**
 * Converts a path and props to a URL path with query string
 * Example: ('fleets/edit', { fleetId: 123 }, '/admin') => '/admin/fleets/edit?fleetId=123'
 */
function pathToUrl(path: string, props?: Record<string, unknown>, baseUrl = '/admin'): string {
  // Strip any leading slashes so a stray '/' can never produce '/base//'
  const cleanPath = path.replace(/^\/+/, '')
  const basePath = cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl

  if (!props || Object.keys(props).length === 0) {
    return basePath
  }

  const params = new URLSearchParams()
  Object.entries(props).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value))
    }
  })

  const queryString = params.toString()
  return queryString ? `${basePath}?${queryString}` : basePath
}

/**
 * Converts a URL to a path and props object
 * Example: '/admin/fleets/edit?fleetId=123' => { path: 'fleets/edit', props: { fleetId: '123' } }
 */
function urlToPath(pathname: string, search: string, baseUrl = '/admin'): RenderPage {
  // Remove base URL prefix only when the pathname is actually under baseUrl.
  // Outside the module (e.g. '/' welcome page) the path is treated as empty so
  // it never leaks a stray segment back into the reconstructed URL.
  const path = isUnderBase(pathname, baseUrl)
    ? pathname.slice(baseUrl.length).replace(/^\/+/, '')
    : ''

  // Parse query params
  const params = new URLSearchParams(search)
  const props: Record<string, unknown> = {}

  params.forEach((value, key) => {
    props[key] = value
  })

  return {
    path: path || '',
    props: Object.keys(props).length > 0 ? props : undefined,
  }
}

/**
 * Compara duas URLs relativas (pathname + query) ignorando diferenças só de
 * encoding: `pathToUrl` serializa via URLSearchParams (espaço = '+') e os Links
 * usam encodeURIComponent (espaço = '%20'). Sem normalizar, toda URL com
 * espaço/acento parecia diferente e disparava um navigate(replace) extra.
 */
function sameUrl(a: string, b: string): boolean {
  const urlA = new URL(a, window.location.origin)
  const urlB = new URL(b, window.location.origin)
  return (
    urlA.pathname === urlB.pathname && urlA.searchParams.toString() === urlB.searchParams.toString()
  )
}

interface UseSidebarPagesOptions {
  /**
   * When true, syncs navigation state with the browser URL
   * @default false
   */
  syncWithUrl?: boolean
  /**
   * Base URL path for URL sync (e.g., '/admin', '/details')
   * @default '/admin'
   */
  baseUrl?: string
}

/** Teto do histórico de navegação da sidebar (antes crescia a cada navegação). */
const MAX_SIDEBAR_HISTORY = 50

function capHistory<T>(entries: T[]): T[] {
  return entries.length > MAX_SIDEBAR_HISTORY ? entries.slice(-MAX_SIDEBAR_HISTORY) : entries
}

export function useSidebarPages(
  initial: string,
  pages: Array<Page>,
  options: UseSidebarPagesOptions = {}
) {
  const { syncWithUrl = false, baseUrl = '/admin' } = options

  // Always call hooks unconditionally (React rules of hooks)
  const navigate = useNavigate()
  const location = useLocation()

  const [searchQuery, setSearchQuery] = useState('')
  const isInternalNavRef = useRef(false)

  // Initialize paths from URL when syncWithUrl is enabled, or use initial value
  const [paths, setPaths] = useState<RenderPage[]>(() => {
    if (syncWithUrl) {
      const currentPath = urlToPath(location.pathname, location.search, baseUrl)
      // If we're at base URL with no subpath, use initial
      if (currentPath.path === '') {
        return [{ path: initial }]
      }
      return [currentPath]
    }
    return [{ path: initial }]
  })

  const [index, setIndex] = useState(0)
  const indexState: [number, React.Dispatch<React.SetStateAction<number>>] = [index, setIndex]

  const prevBaseUrl = useRef(baseUrl)
  const baseUrlJustChanged = useRef(false)
  useEffect(() => {
    if (prevBaseUrl.current === baseUrl) return
    prevBaseUrl.current = baseUrl
    baseUrlJustChanged.current = true

    if (syncWithUrl) {
      const currentPath = urlToPath(location.pathname, location.search, baseUrl)
      setPaths([currentPath.path ? currentPath : { path: initial }])
      setIndex(0)
    }
  }, [baseUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  const root = useMemo(() => {
    return getRootFromPath(paths[index]?.path || '')
  }, [paths, index])

  const searching = useMemo(() => {
    return searchQuery !== ''
  }, [searchQuery])

  // Sync state when URL changes (browser back/forward) - only when syncWithUrl is enabled
  useEffect(() => {
    if (!syncWithUrl) return

    // Skip when baseUrl just changed — the reset effect already handled it
    if (baseUrlJustChanged.current) {
      baseUrlJustChanged.current = false
      return
    }

    // Skip URL changes caused by onNavigate — only handle external navigation (browser back/forward)
    if (isInternalNavRef.current) {
      isInternalNavRef.current = false
      return
    }

    // Left the module entirely (e.g. browser back to the welcome page '/').
    // Do not sync — otherwise we'd append a garbage entry and navigate back in,
    // corrupting the URL into '/base//'. Let the route unmount cleanly.
    if (!isUnderBase(location.pathname, baseUrl)) return

    const currentPath = urlToPath(location.pathname, location.search, baseUrl)

    // Check if the current URL matches the current path in our state
    const currentStatePath = paths[index]
    const isSamePath = currentStatePath?.path === currentPath.path
    const isSameProps =
      JSON.stringify(currentStatePath?.props) === JSON.stringify(currentPath.props)

    if (isSamePath && isSameProps) return

    // Same page, only query params changed (e.g., filter update) — update
    // current entry in place rather than appending a new history entry.
    if (isSamePath) {
      setPaths((prev) => prev.map((p, i) => (i === index ? currentPath : p)))
      return
    }

    // URL changed externally (e.g., browser back/forward)
    // Check if this path exists in our history
    const existingIndex = paths.findIndex(
      (p) =>
        p.path === currentPath.path && JSON.stringify(p.props) === JSON.stringify(currentPath.props)
    )

    if (existingIndex !== -1) {
      // Path exists in history, just update index
      setIndex(existingIndex)
    } else {
      // New path, add to history
      setPaths((prev) => capHistory([...prev, currentPath]))
      setIndex(Math.min(paths.length, MAX_SIDEBAR_HISTORY - 1))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, syncWithUrl, baseUrl]) // Intentionally not including paths/index to avoid loops

  // Sync URL when index changes (e.g., prev/next buttons in Pages)
  useEffect(() => {
    if (!syncWithUrl) return

    const currentStatePath = paths[index]
    if (!currentStatePath) return

    const expectedUrl = pathToUrl(currentStatePath.path, currentStatePath.props, baseUrl)
    const currentUrl = location.pathname + location.search

    if (!sameUrl(expectedUrl, currentUrl)) {
      isInternalNavRef.current = true
      navigate(expectedUrl, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, syncWithUrl]) // Minimal deps to avoid loops — paths/baseUrl are stable

  const onNavigate = useCallback(
    (path: string, props?: RenderPage['props']) => {
      const doc = pages.find((doc) => doc.path === path)

      if (doc === undefined) return

      const newEntry = { path: doc.path, props }

      if (syncWithUrl) {
        // Skip if already at this page
        const currentEntry = paths[index]
        if (
          currentEntry?.path === doc.path &&
          JSON.stringify(currentEntry?.props) === JSON.stringify(props)
        ) {
          return
        }

        // Update URL
        const url = pathToUrl(doc.path, props, baseUrl)
        isInternalNavRef.current = true
        navigate(url)

        // Truncate forward history and append new page
        setPaths((p) => capHistory([...p.slice(0, index + 1), newEntry]))
        setIndex(Math.min(index + 1, MAX_SIDEBAR_HISTORY - 1))
      } else {
        // Skip if already at this page
        const currentEntry = paths[index]
        if (
          currentEntry?.path === doc.path &&
          JSON.stringify(currentEntry?.props) === JSON.stringify(props)
        ) {
          return
        }

        // Truncate forward history and append new page
        setPaths((p) => capHistory([...p.slice(0, index + 1), newEntry]))
        setIndex(Math.min(index + 1, MAX_SIDEBAR_HISTORY - 1))
      }
    },
    [pages, paths, index, syncWithUrl, navigate, baseUrl]
  )

  return {
    paths,
    searchQuery,
    setSearchQuery,
    onNavigate,
    root,
    indexState,
    searching,
  }
}
