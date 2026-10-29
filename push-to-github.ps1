# PowerShell script for pushing to GitHub cleanly
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Ensure Git is in PATH
$env:Path = "$env:Path;C:\Users\TL\.gemini\antigravity\scratch\mingit\cmd"

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host " วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์" -ForegroundColor Yellow
Write-Host " ส่งโปรเจกต์ขึ้น GitHub (Push to GitHub)" -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

$repoUrl = Read-Host "กรุณาวาง URL ของ GitHub Repository (เช่น https://github.com/username/thaluang-room-booking.git)"

# Clean quotes if user pasted with quotes
$repoUrl = $repoUrl.Trim('"', "'", " ")

if ([string]::IsNullOrWhiteSpace($repoUrl)) {
    Write-Host "[ข้อผิดพลาด] ไม่ได้ระบุ URL ของ Repository" -ForegroundColor Red
    pause
    exit
}

Write-Host ""
Write-Host "กำลังเชื่อมต่อกับ: $repoUrl" -ForegroundColor Cyan
Write-Host "กำลัง Push ไปยัง branch main..." -ForegroundColor Gray

Set-Location "C:\Users\TL\.gemini\antigravity\scratch\thaluang-room-booking"

& git remote remove origin 2>$null
& git remote add origin $repoUrl
& git branch -M main

$pushResult = & git push -u origin main 2>&1

Write-Host ""
Write-Host $pushResult

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=====================================================================" -ForegroundColor Green
    Write-Host " [สำเร็จ] อัปโหลดโค้ดขึ้น GitHub เรียบร้อยแล้ว!" -ForegroundColor Green
    Write-Host " สามารถเปิดดู Repository บนหน้าเว็บ GitHub ได้ทันทีครับ" -ForegroundColor Green
    Write-Host "=====================================================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "=====================================================================" -ForegroundColor Yellow
    Write-Host " การ Push ไม่สำเร็จ อาจเกิดจากยังไม่ได้ Sign in บัญชี GitHub" -ForegroundColor Yellow
    Write-Host " หาก GitHub ขึ้นหน้าต่างให้ Sign In กรุณากด Browser Sign In เพื่อยืนยันตัวตนครับ" -ForegroundColor Gray
    Write-Host "=====================================================================" -ForegroundColor Yellow
}

Write-Host ""
pause
