:again
python c:\js\autolease.py 206 --test >> c:\tmp\autolease.log
timeout /t 4800 /nobreak > NUL
goto again