; Instalador do Relatório de Operações - Blocos Cabral (NSIS, gerado no Mac com makensis)
; Uso: makensis -DORIGEM=<pasta montada pelo build> -DVERSAO=x.y.z -DSAIDA=<arquivo.exe> instalador.nsi
Unicode true
!include "MUI2.nsh"

!define APP      "Relatório de Operações - Blocos Cabral"
!define EXE      "Relatorio Blocos Cabral.exe"
!define CHAVE    "Software\Microsoft\Windows\CurrentVersion\Uninstall\RelatorioBlocosCabral"

Name "${APP}"
OutFile "${SAIDA}"
InstallDir "$LOCALAPPDATA\RelatorioBlocosCabral"
InstallDirRegKey HKCU "${CHAVE}" "InstallLocation"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "Blocos Cabral"
VIProductVersion "${VERSAO}.0"
VIAddVersionKey /LANG=1046 "ProductName" "${APP}"
VIAddVersionKey /LANG=1046 "CompanyName" "Blocos Cabral"
VIAddVersionKey /LANG=1046 "FileDescription" "Instalador do ${APP}"
VIAddVersionKey /LANG=1046 "FileVersion" "${VERSAO}"
VIAddVersionKey /LANG=1046 "LegalCopyright" "Blocos Cabral"

!define MUI_ICON "icone.ico"
!define MUI_UNICON "icone.ico"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Abrir o Relatório de Operações agora"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "PortugueseBR"

; encerra o painel desta instalação, se estiver aberto (só o python desta pasta)
!macro ENCERRAR_PAINEL
  nsExec::Exec `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Process python -ErrorAction SilentlyContinue | Where-Object { $$_.Path -like '$INSTDIR\*' } | Stop-Process -Force"`
  Sleep 800
!macroend

Section "Instalar"
  !insertmacro ENCERRAR_PAINEL
  ; atualização: troca programa e Python, preserva dados/, entrada/ e saida/
  RMDir /r "$INSTDIR\python"
  RMDir /r "$INSTDIR\app"
  SetOutPath "$INSTDIR"
  File /r /x "__pycache__" /x "dados" /x "entrada" /x "saida" "${ORIGEM}/*.*"
  CreateDirectory "$INSTDIR\dados"
  CreateDirectory "$INSTDIR\entrada"
  CreateDirectory "$INSTDIR\saida"

  CreateShortcut "$DESKTOP\Relatório de Operações.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\${EXE}" 0
  CreateDirectory "$SMPROGRAMS\Blocos Cabral"
  CreateShortcut "$SMPROGRAMS\Blocos Cabral\Relatório de Operações.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\${EXE}" 0
  CreateShortcut "$SMPROGRAMS\Blocos Cabral\Pasta de dados e relatórios.lnk" "$INSTDIR"
  CreateShortcut "$SMPROGRAMS\Blocos Cabral\Diagnóstico (abre com console).lnk" "$INSTDIR\Diagnostico.bat" "" "$INSTDIR\${EXE}" 0
  CreateShortcut "$SMPROGRAMS\Blocos Cabral\Desinstalar.lnk" "$INSTDIR\Desinstalar.exe"

  WriteUninstaller "$INSTDIR\Desinstalar.exe"
  WriteRegStr HKCU "${CHAVE}" "DisplayName" "${APP}"
  WriteRegStr HKCU "${CHAVE}" "DisplayVersion" "${VERSAO}"
  WriteRegStr HKCU "${CHAVE}" "Publisher" "Blocos Cabral"
  WriteRegStr HKCU "${CHAVE}" "DisplayIcon" "$INSTDIR\${EXE}"
  WriteRegStr HKCU "${CHAVE}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${CHAVE}" "UninstallString" '"$INSTDIR\Desinstalar.exe"'
  WriteRegDWORD HKCU "${CHAVE}" "NoModify" 1
  WriteRegDWORD HKCU "${CHAVE}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  !insertmacro ENCERRAR_PAINEL
  Delete "$DESKTOP\Relatório de Operações.lnk"
  RMDir /r "$SMPROGRAMS\Blocos Cabral"
  RMDir /r "$INSTDIR\python"
  RMDir /r "$INSTDIR\app"
  RMDir /r "$INSTDIR\assets"
  RMDir /r "$INSTDIR\.streamlit"
  Delete "$INSTDIR\*.*"
  MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 \
    "Apagar também a base de dados e os relatórios gerados (pastas dados, entrada e saida)?$\n$\nEscolha Não para mantê-los." \
    IDNO manter
    RMDir /r "$INSTDIR\dados"
    RMDir /r "$INSTDIR\entrada"
    RMDir /r "$INSTDIR\saida"
  manter:
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "${CHAVE}"
SectionEnd
