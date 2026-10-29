# PowerShell script for pushing to GitHub
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Ensure Git is in PATH
$env:Path = "$env:Path;C:\Users\TL\.gemini\antigravity\scratch\mingit\cmd"

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host " วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์" -ForegroundColor Yellow
Write-Host " นำขึ้น GitHub: https://github.com/aomsin26316/thaluang-room-booking.git" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

$repoUrl = "https://github.com/aomsin26316/thaluang-room-booking.git"

Set-Location "C:\Users\TL\.gemini\antigravity\scratch\thaluang-room-booking"

& git remote remove origin 2>$null
& git remote add origin $repoUrl
& git branch -M main

Write-Host "กำลังเชื่อมต่อและส่งข้อมูล (Push) ไปยัง GitHub..." -ForegroundColor Cyan
Write-Host "หมายเหตุ: หากมีหน้าต่างเด้งขึ้นมาให้เข้าสู่ระบบ (Sign In) กรุณากดยืนยันผ่านเบราว์เซอร์" -ForegroundColor Yellow
Write-Host ""

& git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=====================================================================" -ForegroundColor Green
    Write-Host " [สำเร็จ] อัปโหลดโปรเจกต์ขึ้น GitHub เรียบร้อยแล้ว!" -ForegroundColor Green
    Write-Host " ดูผลงานได้ที่: https://github.com/aomsin26316/thaluang-room-booking" -ForegroundColor Green
    Write-Host "=====================================================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "=====================================================================" -ForegroundColor Red
    Write-Host " การ Push ยังไม่สมบูรณ์เนื่องจากต้องการการยืนยันตัวตน GitHub" -ForegroundColor Yellow
    Write-Host " หากใช้ Personal Access Token (PAT) สามารถใช้เป็นรหัสผ่านได้" -ForegroundColor Gray
    Write-Host "=====================================================================" -ForegroundColor Red
}

Write-Host ""
pause
