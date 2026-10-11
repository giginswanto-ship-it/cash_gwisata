@echo off
title Server Database Kas SNAPRINT GWISATA (MariaDB)
echo ================================================================
echo  MEMULAI SERVER BUKU KAS SNAPRINT GWISATA
echo  Database: MariaDB (db_snaprint_kas) - Port: 3333
echo ================================================================
cd /d "%~dp0"
start "" http://localhost:3333
node server.js
pause
