// Ponte mínima para a web saber que roda no app instalado (window.relatorioDesktop):
// o header usa isso para reservar o espaço dos botões da janela e virar área de arrastar.
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('relatorioDesktop', { platform: process.platform })
