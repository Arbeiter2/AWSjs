echo off
set PATH=%PATH%;c:\phantomjs;c:\casperjs\bin
cd c:\js

echo on
c:\casperjs\bin\casperjs --cookies=cookies.txt %*