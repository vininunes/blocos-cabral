import axios from 'axios'
import { toast } from 'sonner'

/**
 * Instância HTTP da API local do relatório (server/relatorio-api.ts): servida pelo Vite
 * no `yarn dev` e pelo servidor interno do Electron no app instalado.
 * Erros viram toast com a mensagem devolvida pela API (`skipErrorToast` desliga).
 */
export const relatorioApiInstance = axios.create({ baseURL: '/api' })

declare module 'axios' {
  interface AxiosRequestConfig {
    skipErrorToast?: boolean
  }
}

relatorioApiInstance.interceptors.response.use(undefined, (error) => {
  if (!axios.isCancel(error) && !error.config?.skipErrorToast) {
    toast.error(error.response?.data?.message ?? error.message)
  }
  return Promise.reject(error)
})
