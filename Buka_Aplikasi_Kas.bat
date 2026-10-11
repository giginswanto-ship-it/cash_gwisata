@echo off
title Membuka Sistem Kasir SNAPRINT GWISATA
cd /d "%~dp0"

netstat -ano | findstr ":3333" >nul
if %errorlevel% equ 0 (
  start "" http://localhost:3333
) else (
  start "" "%~dp0index.html"
)
exit
