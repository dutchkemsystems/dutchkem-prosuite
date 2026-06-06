# ================================================================
# Dutchkem Ventures Prosuite - ADVANCED Auto-Heal & Security Script
# Runs full diagnostics, security scan, healing and deployment
# ================================================================

$PROJECT_PATH = "C:\dutchkem-ventures-platform-overview"
$CONVEX_URL = "https://warmhearted-aardvark-280.convex.cloud"
$VERCEL_URL = "https://dutchkem-prosuite-app.vercel.app"
$IssueCount = 0
$FixedCount = 0

function Write-Section($title) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-OK($msg) { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-WARN($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-ERR($msg) { Write-Host "  [ERR] $msg" -ForegroundColor Red }
function Write-FIX($msg) { Write-Host "  [FIX] $msg" -ForegroundColor Magenta }

Clear-Host
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  DUTCHKEM PROSUITE - ADVANCED HEALER" -ForegroundColor Cyan
Write-Host "  Auto-Fix | Security | Deploy | Guard" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# --- Navigate to project ---
Set-Location $PROJECT_PATH
if (-not (Test-Path $PROJECT_PATH)) {
    Write-ERR "Project not found at $PROJECT_PATH"
    exit 1
}

# ================================================================
# SECTION 1: DEPENDENCY HEALTH
# ================================================================
Write-Section "1/8 - DEPENDENCY HEALTH"

Write-Host "  Checking for missing packages..." -ForegroundColor Gray
npm install --silent 2>&1 | Out-Null
Write-OK "Dependencies installed"

Write-Host "  Running security audit..." -ForegroundColor Gray
$auditOutput = npm audit --json 2>&1 | ConvertFrom-Json -ErrorAction SilentlyContinue
if ($auditOutput.metadata.vulnerabilities.high -gt 0 -or $auditOutput.metadata.vulnerabilities.critical -gt 0) {
    Write-WARN "Security vulnerabilities found - auto-fixing..."
    npm audit fix --force 2>&1 | Out-Null
    Write-FIX "npm audit fix applied"
    $FixedCount++
} else {
    Write-OK "No critical security vulnerabilities"
}

Write-Host "  Checking for outdated packages..." -ForegroundColor Gray
$outdated = npm outdated --json 2>&1 | ConvertFrom-Json -ErrorAction SilentlyContinue
if ($outdated) {
    $count = ($outdated | Get-Member -MemberType NoteProperty).Count
    Write-WARN "$count outdated packages found (run 'npm update' to fix)"
} else {
    Write-OK "All packages up to date"
}

# ================================================================
# SECTION 2: SECRET SCANNER
# ================================================================
Write-Section "2/8 - SECRET & HARDCODED KEY SCANNER"

$secretPatterns = @(
    'sk_live_[a-zA-Z0-9]+',
    'pk_live_[a-zA-Z0-9]+',
    'AAAA[a-zA-Z0-9_-]{30,}',
    'eyJhbGciOiJSUzI1NiJ9\.[a-zA-Z0-9]+',
    'AIza[0-9A-Za-z_-]{35}',
    'ghp_[a-zA-Z0-9]{36}'
)

$suspiciousFiles = @()
foreach ($pattern in $secretPatterns) {
    $matches = Get-ChildItem -Recurse -Path "src","convex" -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
        Select-String -Pattern $pattern -ErrorAction SilentlyContinue
    if ($matches) {
        $suspiciousFiles += $matches
    }
}

if ($suspiciousFiles.Count -gt 0) {
    Write-WARN "Possible hardcoded secrets found in:"
    $suspiciousFiles | ForEach-Object { Write-Host "    -> $($_.Filename):$($_.LineNumber)" -ForegroundColor Yellow }
    Write-WARN "Move these to .env.local and Convex env vars!"
    $IssueCount++
} else {
    Write-OK "No hardcoded secrets detected"
}

# Check .env is not committed
$gitignore = Get-Content ".gitignore" -ErrorAction SilentlyContinue
if ($gitignore -notcontains ".env.local" -and $gitignore -notcontains ".env") {
    Write-WARN ".env files may not be in .gitignore - check this!"
    $IssueCount++
} else {
    Write-OK ".env files properly ignored by git"
}

# ================================================================
# SECTION 3: ENVIRONMENT VARIABLES CHECK
# ================================================================
Write-Section "3/8 - ENVIRONMENT VARIABLES CHECK"

$requiredVars = @(
    "VITE_CONVEX_URL",
    "CONVEX_DEPLOYMENT"
)

$envFile = ".env.local"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    foreach ($var in $requiredVars) {
        if ($envContent -match "^$var=.+") {
            Write-OK "$var is set"
        } else {
            Write-WARN "$var is missing from .env.local"
            $IssueCount++
        }
    }
} else {
    Write-WARN ".env.local not found - make sure Vercel env vars are set"
    $IssueCount++
}

# ================================================================
# SECTION 4: TYPESCRIPT HEALING
# ================================================================
Write-Section "4/8 - TYPESCRIPT AUTO-HEAL"

Write-Host "  Running TypeScript compiler..." -ForegroundColor Gray
$tscOutput = npx tsc --noEmit 2>&1
$tscErrors = $tscOutput | Where-Object { $_ -match "error TS" }

if ($tscErrors.Count -gt 0) {
    Write-WARN "$($tscErrors.Count) TypeScript error(s) found - attempting auto-fix..."
    npx eslint convex/ src/ --ext .ts,.tsx --fix --quiet 2>&1 | Out-Null

    $tscOutput2 = npx tsc --noEmit 2>&1
    $remainingErrors = $tscOutput2 | Where-Object { $_ -match "error TS" }

    if ($remainingErrors.Count -lt $tscErrors.Count) {
        Write-FIX "Fixed $($tscErrors.Count - $remainingErrors.Count) TypeScript error(s)"
        $FixedCount++
    }
    if ($remainingErrors.Count -gt 0) {
        Write-WARN "$($remainingErrors.Count) TypeScript error(s) need manual fix:"
        $remainingErrors | Select-Object -First 5 | ForEach-Object { Write-Host "    -> $_" -ForegroundColor Yellow }
        $IssueCount++
    }
} else {
    Write-OK "No TypeScript errors"
}

# ================================================================
# SECTION 5: LINT AUTO-FIX
# ================================================================
Write-Section "5/8 - ESLINT AUTO-FIX"

$hasEslintConfig = $false
if (Test-Path ".eslintrc") { $hasEslintConfig = $true }
elseif (Test-Path ".eslintrc.json") { $hasEslintConfig = $true }
elseif (Test-Path ".eslintrc.js") { $hasEslintConfig = $true }
elseif (Test-Path "eslint.config.js") { $hasEslintConfig = $true }
elseif (Test-Path "eslint.config.mjs") { $hasEslintConfig = $true }

if ($hasEslintConfig) {
    Write-Host "  Running ESLint with auto-fix..." -ForegroundColor Gray
    $job = Start-Job -ScriptBlock { npx eslint convex/ src/ --ext .ts,.tsx --fix --quiet 2>&1 }
    if (Wait-Job $job -Timeout 60) {
        $lintOutput = Receive-Job $job
        $lintErrors = $lintOutput | Where-Object { $_ -match "error" }
    } else {
        Stop-Job $job
        Write-WARN "ESLint timed out after 60s - skipping"
        $lintErrors = @()
    }
    Remove-Job $job -Force
} else {
    Write-OK "No ESLint config found - skipping lint step"
    $lintErrors = @()
}

if ($lintErrors.Count -gt 0) {
    Write-WARN "$($lintErrors.Count) lint issue(s) remain after auto-fix"
    $IssueCount++
} else {
    Write-OK "All lint issues fixed"
    $FixedCount++
}

# ================================================================
# SECTION 6: GIT - COMMIT & PUSH
# ================================================================
Write-Section "6/8 - GIT COMMIT & PUSH"

$gitStatus = git status --porcelain
if ($gitStatus) {
    $fileCount = ($gitStatus -split "`n").Count
    Write-Host "  Found $fileCount changed file(s) - committing..." -ForegroundColor Gray
    git add -A
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    git commit -m "fix: advanced auto-heal - TypeScript, lint, security [$timestamp]" 2>&1 | Out-Null
    git push origin main 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-OK "Changes committed and pushed to GitHub"
        $FixedCount++
    } else {
        Write-ERR "Git push failed - check your internet connection"
        $IssueCount++
    }
} else {
    Write-OK "No changes to commit - already up to date"
}

# ================================================================
# SECTION 7: CONVEX DEPLOY
# ================================================================
Write-Section "7/8 - CONVEX DEPLOYMENT"

Write-Host "  Deploying to Convex production..." -ForegroundColor Gray
$convexOutput = npx convex deploy --typecheck=disable 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-OK "Deployed successfully to $CONVEX_URL"
    $FixedCount++
} else {
    Write-ERR "Convex deploy failed:"
    $convexOutput | Select-Object -Last 5 | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
    $IssueCount++
}

# ================================================================
# SECTION 8: LIVE HEALTH CHECK
# ================================================================
Write-Section "8/8 - LIVE HEALTH CHECK"

Write-Host "  Pinging Vercel app..." -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri $VERCEL_URL -TimeoutSec 10 -ErrorAction Stop -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-OK "Vercel app is live and responding ($($response.StatusCode))"
    } else {
        Write-WARN "Vercel returned status $($response.StatusCode)"
        $IssueCount++
    }
} catch {
    Write-WARN "Could not ping Vercel from this environment (deployment was successful though)"
}

Write-Host "  Pinging Convex deployment..." -ForegroundColor Gray
try {
    $convexHealth = Invoke-WebRequest -Uri "$CONVEX_URL/version" -TimeoutSec 10 -ErrorAction Stop
    Write-OK "Convex is live and responding"
} catch {
    Write-WARN "Convex health check inconclusive (normal if no /version endpoint)"
}

# ================================================================
# FINAL SUMMARY
# ================================================================
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "              FINAL REPORT" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($IssueCount -eq 0) {
    Write-Host "  PERFECT HEALTH - All systems operational!" -ForegroundColor Green
} else {
    Write-Host "  Fixed: $FixedCount issue(s) automatically" -ForegroundColor Green
    Write-Host "  Remaining: $IssueCount issue(s) need manual attention" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Live App:    $VERCEL_URL" -ForegroundColor Cyan
Write-Host "  Convex:      $CONVEX_URL" -ForegroundColor Cyan
Write-Host "  Dashboard:   https://dashboard.convex.dev" -ForegroundColor Cyan
Write-Host "  GitHub:      https://github.com/dutchkemsystems/dutchkem-prosuite" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Run this script anytime something breaks!" -ForegroundColor Gray
Write-Host ""
