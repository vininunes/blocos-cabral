// Ponte mínima para a web saber que roda no app instalado (window.relatorioDesktop):
// o header usa isso para reservar o espaço dos botões da janela e virar área de arrastar.
// No Windows/Linux, o header também desenha minimizar/maximizar/fechar e usa `janela`.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('relatorioDesktop', {
  platform: process.platform,
  janela: {
    minimizar: () => ipcRenderer.send('janela:minimizar'),
    maximizar: () => ipcRenderer.send('janela:maximizar'),
    fechar: () => ipcRenderer.send('janela:fechar'),
    estaMaximizada: () => ipcRenderer.invoke('janela:estaMaximizada'),
    aoMudarMaximizada: (callback) => {
      const ouvir = (_evento, maximizada) => callback(maximizada)
      ipcRenderer.on('janela:maximizada', ouvir)
      return () => ipcRenderer.removeListener('janela:maximizada', ouvir)
    },
  },
})
