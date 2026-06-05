@echo off
setlocal
color 0a
mode con lines=19 cols=83
:: Hier Projektnamen eintragen
set "project=Clipboard-Saver" 

title Backup %project%
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Date -Format 'yyyy-MM-dd HH-mm-ss'"`) do (set "datestamp=%%i")
set "destination=C:\Claude\.Backup\%project%\%project% %datestamp%"
robocopy "C:\Claude\%project%" "%destination%" /E /COPY:DAT /R:2 /W:10 /XF "BACKUP.bat"
echo.
echo Backup erstellt:
echo %destination%
echo.
::pause
timeout 5
exit