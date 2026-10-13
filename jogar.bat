@echo off
title Gamezin - Servidor Local

cd /d "%~dp0"

echo ======================================================
echo           GAMEZIN - MOTOR 2.5D ISOMETRICO
echo ======================================================
echo.
echo  Iniciando servidor local na porta 8080...
echo  Seu navegador sera aberto em: http://localhost:8080
echo.
echo  [Dica] Para encerrar o jogo, feche esta janela.
echo ======================================================
echo.

start "" powershell -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 600; Start-Process http://localhost:8080"

where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 goto try_py
echo Servidor iniciado com Python na porta 8080.
python -m http.server 8080
goto final

:try_py
where py >nul 2>&1
if %ERRORLEVEL% NEQ 0 goto try_node
echo Servidor iniciado com Python py na porta 8080.
py -m http.server 8080
goto final

:try_node
where npx >nul 2>&1
if %ERRORLEVEL% NEQ 0 goto error
echo Servidor iniciado com Node.js na porta 8080.
call npx --yes http-server -p 8080 -c-1
goto final

:error
echo [ERRO] Nao foi possivel encontrar Python nem Node.js no sistema!
echo Por favor, instale o Python para rodar o jogo localmente.
echo.

:final
pause
