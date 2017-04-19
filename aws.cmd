@echo off
set PATH=%PATH%;c:\phantomjs\bin;c:\casperjs\bin
cd c:\js

rem echo on
SET ACTION=%1

for /f "tokens=1,* delims= " %%a in ("%*") do set ALL_BUT_FIRST=%%b

IF [%ACTION%]==[start] (
@echo on
c:\casperjs\bin\casperjs --cookies=cookies2.txt %ALL_BUT_FIRST%
@echo off
)

IF [%ACTION%]==[stop] FOR /F "usebackq tokens=2 skip=3" %%i IN (`TASKLIST /FI "IMAGENAME eq casperjs.exe"`) DO taskkill /T /F /PID %%i
