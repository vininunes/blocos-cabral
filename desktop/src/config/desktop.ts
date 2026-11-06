declare global {
  interface Window {
    /** Exposto pelo preload do app instalado (electron/preload.cjs); ausente no navegador. */
    relatorioDesktop?: { platform: string }
  }
}

/** Rodando dentro do app instalado (Electron)? */
export const DESKTOP_PLATFORM = window.relatorioDesktop?.platform ?? null

/**
 * Espaço que o header reserva para os controles nativos da janela, que ficam sobre
 * ele (barra de título contínua): à esquerda no macOS, à direita no Windows/Linux.
 */
export const DESKTOP_TITLEBAR_INSET =
  DESKTOP_PLATFORM === 'darwin'
    ? { left: 84, right: 0 }
    : DESKTOP_PLATFORM
      ? { left: 0, right: 140 }
      : { left: 0, right: 0 }

/**
 * Botões da janela no macOS (trafficLightPosition do electron/main.ts: x 18, y 20 num header de
 * 56 px), medidos na tela: círculos de 14 pt, centros a 23 pt um do outro, centro vertical em 27.
 */
export const MAC_BOTOES_JANELA = { esquerda: 18, topo: 20, diametro: 14, passo: 23 }
