@echo off
chcp 65001 > nul
title นำระบบขึ้น GitHub - วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
echo =====================================================================
echo  วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
echo  ส่งโปรเจกต์ขึ้น GitHub (Push to GitHub)
echo =====================================================================
echo.

set /p REPO_URL="กรุณาวาง URL ของ GitHub Repository (เช่น https://github.com/your-username/thaluang-room-booking.git): "

if "%REPO_URL%"=="" (
    echo [ข้อผิดพลาด] ไม่ได้ระบุ URL ของ Repository
    pause
    exit /b
)

echo.
echo กำลังเชื่อมต่อ Remote และ Push ขึ้น GitHub...
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main
git push -u origin main

echo.
if %ERRORLEVEL% equ 0 (
    echo =====================================================================
    echo  [สำเร็จ] อัปโหลดโค้ดขึ้น GitHub เรียบร้อยแล้ว!
    echo =====================================================================
) else (
    echo =====================================================================
    echo  [แจ้งเตือน] การ Push ไม่สำเร็จ 
    echo  กรุณาตรวจสอบสิทธิ์การเข้าถึง GitHub หรือเข้าสู่ระบบ GitHub อีกครั้ง
    echo =====================================================================
)
pause
