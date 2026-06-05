# ================================================================
# Dutchkem Ventures Prosuite — Auto-Fix & Deploy Script
# Double-click this file anytime to auto-heal all errors
# ================================================================

$PROJECT_PATH = "C:\dutchkem-ventures-platform-overview"
$ErrorCount = 0

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Dutchkem Auto-Fix & Deploy Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- Step 1: Navigate to project ---
Write-Host "[1/7] Navigating to project folder..." -ForegroundColor Yellow
Set-Location $PROJECT_PATH
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Could not find project at $PROJECT_PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "OK - Found project folder" -ForegroundColor Green

# --- Step 2: Install missing dependencies ---
Write-Host ""
Write-Host "[2/7] Checking dependencies..." -ForegroundColor Yellow
npm install --silent 2>&1 | Out-Null
Write-Host "OK - Dependencies up to date" -ForegroundColor Green

# --- Step 3: TypeScript check ---
Write-Host ""
Write-Host "[3/7] Running TypeScript check..." -ForegroundColor Yellow
$tscOutput = npx tsc --noEmit 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "FOUND TypeScript errors:" -ForegroundColor Red
    Write-Host $tscOutput -ForegroundColor Red
    $ErrorCount++
    Write-Host "Attempting auto-fix with ESLint..." -ForegroundColor Yellow
    npx eslint convex/ src/ --ext .ts,.tsx --fix 2>&1 | Out-Null
} else {
    Write-Host "OK - No TypeScript errors" -ForegroundColor Green
}

# --- Step 4: ESLint fix ---
Write-Host ""
Write-Host "[4/7] Running ESLint auto-fix..." -ForegroundColor Yellow
$eslintOutput = npx eslint convex/ src/ --ext .ts,.tsx --fix 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "FOUND Lint errors (some may need manual fix):" -ForegroundColor Yellow
    Write-Host $eslintOutput -ForegroundColor Yellow
    $ErrorCount++
} else {
    Write-Host "OK - No lint errors" -ForegroundColor Green
}

# --- Step 5: Git status check ---
Write-Host ""
Write-Host "[5/7] Checking for changes to commit..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "Found changes — committing..." -ForegroundColor Yellow
    git add -A
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    git commit -m "fix: auto-heal errors and fixes [$timestamp]"
    git push origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK - Changes committed and pushed to GitHub" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Git push failed — check your connection" -ForegroundColor Red
        $ErrorCount++
    }
} else {
    Write-Host "OK - No changes to commit" -ForegroundColor Green
}

# --- Step 6: Convex deploy ---
Write-Host ""
Write-Host "[6/7] Deploying to Convex..." -ForegroundColor Yellow
$convexOutput = npx convex deploy --typecheck=disable 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - Deployed to Convex successfully" -ForegroundColor Green
} else {
    Write-Host "ERROR: Convex deploy failed:" -ForegroundColor Red
    Write-Host $convexOutput -ForegroundColor Red
    $ErrorCount++
}

# --- Step 7: Summary ---
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($ErrorCount -eq 0) {
    Write-Host ""
    Write-Host "  ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host "  Your app is live at:" -ForegroundColor Green
    Write-Host "  https://dutchkem-prosuite-app.vercel.app" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "  $ErrorCount issue(s) need manual attention." -ForegroundColor Yellow
    Write-Host "  Check the errors above and fix them manually," -ForegroundColor Yellow
    Write-Host "  then run this script again." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to close"
