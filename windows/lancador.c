/*
 * Lançador do Relatório de Operações (Blocos Cabral) para Windows.
 *
 * - Se o painel já estiver rodando (porta 8501), apenas abre o navegador.
 * - Senão, inicia "python\python.exe -m streamlit run painel.py" numa janela de console minimizada
 *   (fechar essa janela encerra o painel), espera a porta responder e abre o navegador.
 *
 * Compilar (no Mac): x86_64-w64-mingw32-gcc -municode -mwindows -O2 lancador.c icone.o -lws2_32 -o "Relatorio Blocos Cabral.exe"
 */
#define WIN32_LEAN_AND_MEAN
#include <winsock2.h>
#include <windows.h>
#include <shellapi.h>
#include <wchar.h>

#define PORTA 8501
#define URL L"http://localhost:8501"
#define TITULO L"Relatório de Operações - Blocos Cabral"

static int porta_aberta(void) {
    SOCKET s = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (s == INVALID_SOCKET) return 0;
    struct sockaddr_in a = {0};
    a.sin_family = AF_INET;
    a.sin_port = htons(PORTA);
    a.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    int ok = connect(s, (struct sockaddr *)&a, sizeof a) == 0;
    closesocket(s);
    return ok;
}

static void abrir_navegador(void) {
    ShellExecuteW(NULL, L"open", URL, NULL, NULL, SW_SHOWNORMAL);
}

int WINAPI wWinMain(HINSTANCE inst, HINSTANCE prev, PWSTR cmd, int show) {
    (void)inst; (void)prev; (void)cmd; (void)show;
    WSADATA wsa;
    WSAStartup(MAKEWORD(2, 2), &wsa);

    if (porta_aberta()) {          /* já está rodando */
        abrir_navegador();
        return 0;
    }

    /* pasta onde está este .exe */
    wchar_t pasta[MAX_PATH], python[MAX_PATH], linha[MAX_PATH * 2];
    GetModuleFileNameW(NULL, pasta, MAX_PATH);
    wchar_t *barra = wcsrchr(pasta, L'\\');
    if (barra) *barra = 0;
    swprintf(python, MAX_PATH, L"%ls\\python\\python.exe", pasta);
    if (GetFileAttributesW(python) == INVALID_FILE_ATTRIBUTES) {
        MessageBoxW(NULL, L"Não encontrei a pasta 'python' ao lado deste programa.\n"
                          L"Reinstale o Relatório de Operações.", TITULO, MB_ICONERROR);
        return 1;
    }
    swprintf(linha, MAX_PATH * 2,
             L"\"%ls\" -m streamlit run painel.py --server.port %d --server.headless true", python, PORTA);

    STARTUPINFOW si = {0};
    si.cb = sizeof si;
    si.dwFlags = STARTF_USESHOWWINDOW;
    si.wShowWindow = SW_SHOWMINNOACTIVE;
    si.lpTitle = L"Relatório de Operações - mantenha aberta enquanto usa o painel (fechar encerra)";
    PROCESS_INFORMATION pi = {0};
    if (!CreateProcessW(NULL, linha, NULL, NULL, FALSE, CREATE_NEW_CONSOLE, NULL, pasta, &si, &pi)) {
        MessageBoxW(NULL, L"Não foi possível iniciar o painel.", TITULO, MB_ICONERROR);
        return 1;
    }

    /* espera o painel subir (até 90 s) */
    for (int i = 0; i < 180; i++) {
        if (porta_aberta()) {
            abrir_navegador();
            CloseHandle(pi.hThread);
            CloseHandle(pi.hProcess);
            return 0;
        }
        if (WaitForSingleObject(pi.hProcess, 500) == WAIT_OBJECT_0) {  /* processo terminou com erro */
            MessageBoxW(NULL, L"O painel fechou ao iniciar. Abra a janela 'Relatório de Operações' "
                              L"pelo atalho 'Diagnóstico' para ver a mensagem de erro.", TITULO, MB_ICONERROR);
            return 1;
        }
    }
    MessageBoxW(NULL, L"O painel está demorando para iniciar. Aguarde alguns segundos e abra "
                      L"http://localhost:8501 no navegador.", TITULO, MB_ICONWARNING);
    return 0;
}
