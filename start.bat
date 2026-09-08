@echo off
chcp 65001 >nul
title DogDog Web Server
echo ============================================
echo   DogDog - เปิดเว็บผ่าน localhost:8080
echo ============================================
echo.
start "" http://localhost:8080
py -m http.server 8080
pause
