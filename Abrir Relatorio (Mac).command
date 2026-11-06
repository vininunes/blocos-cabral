#!/bin/zsh
# Abre o painel do Relatório de Vendas no navegador (Mac).
cd "$(dirname "$0")"
(sleep 3; open "http://localhost:8501") &
.venv/bin/python -m streamlit run painel.py --server.port 8501
