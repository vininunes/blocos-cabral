#!/bin/zsh
# Monta o pacote portátil para Windows (Python embutido + dependências + painel).
# Uso: ./build_windows.sh   ->  dist/Relatorio_Blocos_Cabral_Windows.zip
# Não precisa de Windows para gerar: as dependências são baixadas já compiladas para win_amd64.
set -euo pipefail
cd "$(dirname "$0")"

PYVER=3.13.15
PYTAG=313
DEST=dist/Relatorio_Blocos_Cabral
PY=$DEST/python

rm -rf dist && mkdir -p $PY dist/cache

echo "> Python embutido $PYVER"
curl -sSL -o dist/cache/python.zip https://www.python.org/ftp/python/$PYVER/python-$PYVER-embed-amd64.zip
unzip -q dist/cache/python.zip -d $PY

echo "> Dependências (win_amd64)"
.venv/bin/pip install -q --target $PY/Lib/site-packages --platform win_amd64 --python-version $PYTAG \
    --implementation cp --only-binary=:all: --no-compile -r requirements.txt

# habilita site-packages e a pasta do painel no Python embutido
cat > $PY/python$PYTAG._pth <<EOF
python$PYTAG.zip
.
Lib\\site-packages
..
import site
EOF

echo "> Aplicação"
cp -R app painel.py requirements.txt .streamlit $DEST/
find $DEST/app -name "__pycache__" -prune -exec rm -rf {} +
mkdir -p $DEST/assets $DEST/entrada $DEST/saida $DEST/dados
cp assets/logo.png assets/favicon.png $DEST/assets/

# lançador .exe (compilado no Mac com mingw-w64) + script de diagnóstico com console visível
x86_64-w64-mingw32-windres -c 65001 windows/icone.rc -O coff -o dist/cache/icone.o
x86_64-w64-mingw32-gcc -municode -mwindows -O2 -s windows/lancador.c dist/cache/icone.o -lws2_32 \
    -o "$DEST/Relatorio Blocos Cabral.exe"
cat > "$DEST/Diagnostico.bat" <<'EOF'
@echo off
title Relatorio de Operacoes - diagnostico
cd /d "%~dp0"
echo Iniciando o painel com mensagens visiveis. Feche esta janela para encerrar.
"%~dp0python\python.exe" -m streamlit run painel.py --server.port 8501 --server.headless true
pause
EOF

cat > "$DEST/LEIA-ME.txt" <<'EOF'
RELATORIO DE OPERACOES - BLOCOS CABRAL

Instalacao (recomendado): execute "Instalar_Relatorio_Blocos_Cabral.exe".
  - Instala na pasta do usuario (nao precisa de administrador).
  - Cria atalhos "Relatorio de Operacoes" na Area de Trabalho e no Menu Iniciar (Blocos Cabral).
  - Reinstalar uma versao nova preserva a base de dados (pasta dados).

Uso:
1. Abra pelo atalho "Relatorio de Operacoes". O navegador abre o painel
   (uma janela minimizada "Relatorio de Operacoes" fica aberta; fecha-la encerra o painel).
2. Clique em "Import Bling data" e envie os arquivos exportados do Bling:
   - Orcamentos (CSV)
   - Vendas - pedidos atendidos (CSV)
   - Notas Fiscais por Operacao (PDF)
3. Escolha o periodo e o status e use "Gerar PowerPoint" / "Gerar Excel" na barra lateral.

Pastas:
  entrada\  copias dos arquivos importados
  dados\    base.xlsx - base historica (propostas, pedidos, notas, feedback)
  saida\    PowerPoints e Excels gerados

Problemas ao abrir: Menu Iniciar > Blocos Cabral > "Diagnostico" mostra as mensagens de erro.
Se o Windows mostrar "O Windows protegeu o computador", clique em "Mais informacoes" > "Executar assim mesmo".
EOF

# arquivos de texto do Windows com quebra de linha CRLF
perl -pi -e 's/\r?\n/\r\n/' "$DEST/Diagnostico.bat" "$DEST/LEIA-ME.txt"

echo "> Instalador"
VERSAO=1.0.$(date +%y%m%d)
makensis -V2 -DORIGEM="$PWD/$DEST" -DVERSAO=$VERSAO -DSAIDA="$PWD/dist/Instalar_Relatorio_Blocos_Cabral.exe" \
    windows/instalador.nsi

echo "> Pasta portátil (alternativa sem instalação)"
(cd dist && zip -qr Relatorio_Blocos_Cabral_Windows.zip Relatorio_Blocos_Cabral)
ls -lh dist/*.zip dist/*.exe
