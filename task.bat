:again
python c:\js\autolease.py 230 --test >> c:\tmp\autolease.log
timeout /t 3600 /nobreak > NUL
goto again