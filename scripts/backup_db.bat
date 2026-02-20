@echo off
REM Doble clic para ejecutar la copia de seguridad
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0\backup_db.ps1"
pause