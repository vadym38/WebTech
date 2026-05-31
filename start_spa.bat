@echo off
cd /d "%~dp0"

set PHP_EXE=php

if exist "C:\xampp\php\php.exe" (
    set PHP_EXE=C:\xampp\php\php.exe
)

start "" http://localhost:8080/index.html
"%PHP_EXE%" -S localhost:8080
