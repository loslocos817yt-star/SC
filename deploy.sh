#!/bin/bash
set -e
git config --global --add safe.directory /storage/emulated/0/Download/NewSC
git add .
git commit -m "Actualizacion completa" || true
git branch -M main
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/loslocos817yt-star/SC
git pull origin main --no-rebase || true
git push -u origin main
echo "¡Proceso finalizado con éxito!"
