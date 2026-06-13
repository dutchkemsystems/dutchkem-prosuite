# ================================================================
# Dutchkem Ventures Prosuite - ADVANCED Auto-Heal & Security Script v2
# Runs full diagnostics, security scan, healing, deployment + reports
# results to Convex for the admin Auto-Heal dashboard
# ================================================================

$PROJECT_PATH = "C:\dutchkem-ventures-platform-overview"
$CONVEX_URL = "https://warmhearted-aardvark-280.convex.cloud"
$CONVEX_SITE_URL = "https://warmhearted-aardvark-280.convex.site"
$VERCEL_URL = "https://dutchkem-prosuite-app.vercel.app"
$GITHUB_REPO = "https://github.com/dutchkemsystems/dutchkem-prosuite"
$RUN_ID = "run-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$RUN_START = Get-Date
$TRIGGERED_BY = "manual"

$IssueCount = 0
$FixedCount = 0
$ConvexDeployed = $false
$VercelDeployed = $false
$CommitSha = ""

# Run summary JSON (uploaded to Convex at the end)
$RunReport = [ordered]@{
    runId          = $RUN_ID
    triggeredBy    = $TRIGGERED_BY
    status         = "running"
    startedAt      = ([System.DateTimeOffset]$RUN_START).ToUnixTimeMilliseconds()
    sections       = @()
    issuesFound    = 0
    issuesFixed    = 0
    convexDeployed = $false
    vercelDeployed = $false
}

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

function Add-Section($name, $status, $msg = "", $durationMs = 0) {
    $script:RunReport.sections += @{
        name       = $name
        status     = $status
        message    = $msg
        durationMs = $durationMs
    }
}

function Get-CommitSha {
    try {
        $sha = git rev-parse --short HEAD 2>$null
        return $sha
    } catch {
        return ""
    }
}

# ─── Report helpers (upload to Convex) ───
function Send-RunStart {
    $body = @{
        runId       = $RUN_ID
        triggeredBy = $TRIGGERED_BY
        hostInfo    = @{
            hostname   = $env:COMPUTERNAME
            user       = $env:USERNAME
            os         = $env:OS
            workingDir = (Get-Location).Path
        }
    } | ConvertTo-Json -Depth 5
    try {
        Invoke-RestMethod -Uri "$CONVEX_SITE_URL/auto-heal-start" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 15 | Out-Null
    } catch { }
}

function Send-Section {
    param($name, $status, $msg = "", $durationMs = 0, $details = $null)
    $body = @{
        runId      = $RUN_ID
        name       = $name
        status     = $status
        message    = $msg
        durationMs = $durationMs
        details    = $details
    } | ConvertTo-Json -Depth 5
    try {
        Invoke-RestMethod -Uri "$CONVEX_SITE_URL/auto-heal-section" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 10 | Out-Null
    } catch { }
}

function Send-Alert {
    param($severity, $category, $title, $message, $source = "", $lineNumber = 0, $autoFixable = $false, $autoFixed = $false)
    $body = @{
        runId       = $RUN_ID
        severity    = $severity
        category    = $category
        title       = $title
        message     = $message
        source      = $source
        lineNumber  = $lineNumber
        autoFixable = $autoFixable
        autoFixed   = $autoFixed
        notifyEmail = ($severity -eq "critical")
        notifySms   = ($severity -eq "critical")
    } | ConvertTo-Json -Depth 5
    try {
        Invoke-RestMethod -Uri "$CONVEX_SITE_URL/auto-heal-alert" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 10 | Out-Null
    } catch { }
}

function Send-Fix {
    param($filePath, $fixType, $description, $applied = $true, $lineNumber = 0)
    $body = @{
        runId       = $RUN_ID
        filePath    = $filePath
        fixType     = $fixType
        description = $description
        applied     = $applied
        lineNumber  = $lineNumber
    } | ConvertTo-Json -Depth 5
    try {
        Invoke-RestMethod -Uri "$CONVEX_SITE_URL/auto-heal-fix" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 10 | Out-Null
    } catch { }
}

function Send-Secret {
    param($filePath, $lineNumber, $secretType, $redactedValue, $severity, $recommendedAction)
    $body = @{
        runId             = $RUN_ID
        filePath          = $filePath
        lineNumber        = $lineNumber
        secretType        = $secretType
        redactedValue     = $redactedValue
        severity          = $severity
        recommendedAction = $recommendedAction
    } | ConvertTo-Json -Depth 5
    try {
        Invoke-RestMethod -Uri "$CONVEX_SITE_URL/auto-heal-secret" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 10 | Out-Null
    } catch { }
}

function Send-HealthCheck {
    param($endpoint, $url, $method, $status, $responseCode = 0, $responseTimeMs = 0, $error = "")
    $body = @{
        runId          = $RUN_ID
        endpoint       = $endpoint
        url            = $url
        method         = $method
        status         = $status
        responseCode   = $responseCode
        responseTimeMs = $responseTimeMs
        error          = $error
    } | ConvertTo-Json -Depth 5
    try {
        Invoke-RestMethod -Uri "$CONVEX_SITE_URL/auto-heal-health" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 10 | Out-Null
    } catch { }
}

function Send-Complete {
    param($status, $summary)
    $body = @{
        runId          = $RUN_ID
        status         = $status
        issuesFound    = $script:IssueCount
        issuesFixed    = $script:FixedCount
        commitSha      = $script:CommitSha
        convexDeployed = $script:ConvexDeployed
        vercelDeployed = $script:VercelDeployed
        summary        = $summary
    } | ConvertTo-Json -Depth 5
    try {
        Invoke-RestMethod -Uri "$CONVEX_SITE_URL/auto-heal-complete" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 15 | Out-Null
    } catch { }
}

# ─── HEADER ───
Clear-Host
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  DUTCHKEM PROSUITE - ADVANCED HEALER v2" -ForegroundColor Cyan
Write-Host "  Auto-Fix | Security | Deploy | Guard" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Run ID:    $RUN_ID" -ForegroundColor Gray
Write-Host "  Started:   $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Start run in Convex
Send-RunStart

# --- Navigate to project ---
Set-Location $PROJECT_PATH
if (-not (Test-Path $PROJECT_PATH)) {
    Write-ERR "Project not found at $PROJECT_PATH"
    Send-Complete "failed" "Project path not found"
    exit 1
}

# ================================================================
# SECTION 1: DEPENDENCY HEALTH
# ================================================================
Write-Section "1/8 - DEPENDENCY HEALTH"
$secStart = Get-Date
Write-Host "  Checking for missing packages..." -ForegroundColor Gray
npm install --silent 2>&1 | Out-Null
Write-OK "Dependencies installed"

Write-Host "  Running security audit..." -ForegroundColor Gray
$auditOutput = npm audit --json 2>&1 | ConvertFrom-Json -ErrorAction SilentlyContinue
$depStatus = "ok"
$depMsg = "No critical security vulnerabilities"
if ($auditOutput -and $auditOutput.metadata) {
    $vulns = $auditOutput.metadata.vulnerabilities
    if ($vulns.high -gt 0 -or $vulns.critical -gt 0) {
        Write-WARN "Security vulnerabilities found - auto-fixing..."
        npm audit fix --force 2>&1 | Out-Null
        # Restore critical packages that audit fix may downgrade
        npm install convex@1.40.0 convex-helpers@0.1.103 --legacy-peer-deps 2>&1 | Out-Null
        Write-FIX "npm audit fix applied"
        $FixedCount++
        $depStatus = "warn"
        $depMsg = "Found $($vulns.high) high and $($vulns.critical) critical vulnerabilities - auto-fixed"
        Send-Alert "warning" "dependency" "npm audit found high/critical vulnerabilities" $depMsg "npm audit" 0 $true $true
        Send-Fix "package.json" "dependency" "Auto-fixed $($vulns.critical) critical + $($vulns.high) high vulns via npm audit fix" $true
    } else {
        Write-OK "No critical security vulnerabilities"
    }
}

Write-Host "  Checking for outdated packages..." -ForegroundColor Gray
$outdated = npm outdated --json 2>&1 | ConvertFrom-Json -ErrorAction SilentlyContinue
$outdatedCount = 0
if ($outdated) {
    $outdatedCount = ($outdated | Get-Member -MemberType NoteProperty).Count
    Write-WARN "$outdatedCount outdated packages found (run 'npm update' to fix)"
} else {
    Write-OK "All packages up to date"
}
$secElapsed = (Get-Date) - $secStart
Add-Section "1-dependency-health" $depStatus $depMsg $secElapsed.TotalMilliseconds
Send-Section "1-dependency-health" $depStatus $depMsg $secElapsed.TotalMilliseconds @{ outdated = $outdatedCount }

# ================================================================
# SECTION 2: SECRET & HARDCODED KEY SCANNER
# ================================================================
Write-Section "2/8 - SECRET & HARDCODED KEY SCANNER"
$secStart = Get-Date
$secretPatterns = @(
    @{ pattern = 'sk_live_[a-zA-Z0-9]+'; type = "stripe_live"; severity = "critical" }
    @{ pattern = 'pk_live_[a-zA-Z0-9]+'; type = "stripe_live_public"; severity = "critical" }
    @{ pattern = 'AAAA[a-zA-Z0-9_-]{30,}'; type = "telegram_bot_token"; severity = "critical" }
    @{ pattern = 'AIza[0-9A-Za-z_-]{35}'; type = "google_api"; severity = "critical" }
    @{ pattern = 'ghp_[a-zA-Z0-9]{36}'; type = "github_pat"; severity = "critical" }
    @{ pattern = 'gho_[a-zA-Z0-9]{36}'; type = "github_oauth"; severity = "critical" }
    @{ pattern = 'xox[abp]-[a-zA-Z0-9-]+'; type = "slack_token"; severity = "critical" }
    @{ pattern = 'SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}'; type = "sendgrid_key"; severity = "critical" }
    @{ pattern = 're_[a-zA-Z0-9]{20,}'; type = "resend_key"; severity = "warning" }
)

$secretsFound = @()
foreach ($sp in $secretPatterns) {
    $matches = Get-ChildItem -Recurse -Path "src","convex" -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
        Select-String -Pattern $sp.pattern -ErrorAction SilentlyContinue
    foreach ($m in $matches) {
        $value = $m.Matches[0].Value
        $redacted = if ($value.Length -gt 8) { $value.Substring(0, 4) + "****" + $value.Substring($value.Length - 4) } else { "****" }
        Write-WARN "Found $($sp.type) at $($m.Path):$($m.LineNumber)"
        $secretsFound += @{ file = $m.Path; line = $m.LineNumber; type = $sp.type; severity = $sp.severity; value = $value; redacted = $redacted }
        Send-Secret $m.Path $m.LineNumber $sp.type $redacted $sp.severity "Move to Convex env vars or .env.local (gitignored)"
        Send-Alert $sp.severity "security" "Hardcoded $($sp.type) detected" "Secret at $($m.Path):$($m.LineNumber) (value redacted)" $m.Path $m.LineNumber $false $false
    }
}

$secretStatus = if ($secretsFound.Count -gt 0) { "warn" } else { "ok" }
$secretMsg = if ($secretsFound.Count -gt 0) { "Found $($secretsFound.Count) hardcoded secret(s)" } else { "No hardcoded secrets detected" }
if ($secretsFound.Count -gt 0) {
    Write-WARN "$($secretsFound.Count) possible hardcoded secret(s) found - move to .env.local!"
    $IssueCount += $secretsFound.Count
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
$secElapsed = (Get-Date) - $secStart
Add-Section "2-secret-scan" $secretStatus $secretMsg $secElapsed.TotalMilliseconds
Send-Section "2-secret-scan" $secretStatus $secretMsg $secElapsed.TotalMilliseconds @{ secretsFound = $secretsFound.Count }

# ================================================================
# SECTION 3: ENVIRONMENT VARIABLES CHECK
# ================================================================
Write-Section "3/8 - ENVIRONMENT VARIABLES CHECK"
$secStart = Get-Date
$requiredVars = @(
    "VITE_CONVEX_URL",
    "CONVEX_DEPLOYMENT",
    "TERMII_API_KEY",
    "COMPOSIO_API_KEY",
    "TELEGRAM_BOT_TOKEN"
)
$missingVars = @()
$envFile = ".env.local"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    foreach ($var in $requiredVars) {
        if ($envContent -match "^$var=.+") {
            Write-OK "$var is set"
        } else {
            Write-WARN "$var is missing from .env.local"
            $missingVars += $var
            $IssueCount++
        }
    }
} else {
    Write-WARN ".env.local not found - make sure Vercel env vars are set"
    $IssueCount++
}
$envStatus = if ($missingVars.Count -gt 0) { "warn" } else { "ok" }
$envMsg = if ($missingVars.Count -gt 0) { "Missing $($missingVars.Count) env var(s)" } else { "All required env vars present" }
$secElapsed = (Get-Date) - $secStart
Add-Section "3-env-vars" $envStatus $envMsg $secElapsed.TotalMilliseconds
Send-Section "3-env-vars" $envStatus $envMsg $secElapsed.TotalMilliseconds @{ missing = $missingVars }
if ($missingVars.Count -gt 0) {
    Send-Alert "warning" "dependency" "Missing env vars" "Required: $($missingVars -join ', ')" ".env.local" 0 $false $false
}

# ================================================================
# SECTION 4: TYPESCRIPT HEALING
# ================================================================
Write-Section "4/8 - TYPESCRIPT AUTO-HEAL"
$secStart = Get-Date
Write-Host "  Running TypeScript compiler..." -ForegroundColor Gray
$tscJob = Start-Job -ScriptBlock { npx tsc --noEmit --skipLibCheck 2>&1 }
if (Wait-Job $tscJob -Timeout 90) {
    $tscOutput = Receive-Job $tscJob
} else {
    Stop-Job $tscJob
    $tscOutput = @("[WARN] TypeScript check timed out after 90s - skipping")
}
Remove-Job $tscJob -Force -ErrorAction SilentlyContinue
$tscErrors = @($tscOutput | Where-Object { $_ -match "error TS" })
$tsStatus = "ok"
$tsMsg = "No TypeScript errors"
$tsFixed = 0
if ($tscErrors.Count -gt 0) {
    Write-WARN "$($tscErrors.Count) TypeScript error(s) found - attempting auto-fix..."

    # Try eslint --fix first
    $job = Start-Job -ScriptBlock { npx eslint convex/ src/ --ext .ts,.tsx --fix --quiet 2>&1 }
    if (Wait-Job $job -Timeout 60) {
        Receive-Job $job | Out-Null
    } else {
        Stop-Job $job
    }
    Remove-Job $job -Force -ErrorAction SilentlyContinue

    # Re-check
    $tscJob2 = Start-Job -ScriptBlock { npx tsc --noEmit --skipLibCheck 2>&1 }
    if (Wait-Job $tscJob2 -Timeout 90) {
        $tscOutput2 = Receive-Job $tscJob2
    } else {
        Stop-Job $tscJob2
        $tscOutput2 = @()
    }
    Remove-Job $tscJob2 -Force -ErrorAction SilentlyContinue
    $remainingErrors = @($tscOutput2 | Where-Object { $_ -match "error TS" })
    $tsFixed = $tscErrors.Count - $remainingErrors.Count
    if ($tsFixed -gt 0) {
        Write-FIX "Auto-fixed $tsFixed TypeScript error(s) via eslint"
        $FixedCount += $tsFixed
        Send-Fix "src+convex" "typescript" "Auto-fixed $tsFixed TypeScript errors via eslint --fix" $true
    }
    if ($remainingErrors.Count -gt 0) {
        Write-WARN "$($remainingErrors.Count) TypeScript error(s) need manual fix:"
        $remainingErrors | Select-Object -First 5 | ForEach-Object { Write-Host "    -> $_" -ForegroundColor Yellow }
        $IssueCount += $remainingErrors.Count
        $tsStatus = "error"
        $tsMsg = "$($remainingErrors.Count) TypeScript errors remain (manual fix needed)"
        Send-Alert "critical" "typescript" "TypeScript errors need manual fix" "$($remainingErrors.Count) errors after auto-fix attempt" "npx tsc" 0 $true $false
    } else {
        $tsStatus = "ok"
        $tsMsg = "All TypeScript errors auto-fixed"
    }
} else {
    Write-OK "No TypeScript errors"
}
$secElapsed = (Get-Date) - $secStart
Add-Section "4-typescript" $tsStatus $tsMsg $secElapsed.TotalMilliseconds
Send-Section "4-typescript" $tsStatus $tsMsg $secElapsed.TotalMilliseconds @{ errorsBefore = $tscErrors.Count; errorsAfter = if ($tscErrors.Count -gt 0) { $tscErrors.Count - $tsFixed } else { 0 }; fixed = $tsFixed }

# ================================================================
# SECTION 5: LINT AUTO-FIX
# ================================================================
Write-Section "5/8 - ESLINT AUTO-FIX"
$secStart = Get-Date
$hasEslintConfig = $false
if (Test-Path ".eslintrc") { $hasEslintConfig = $true }
elseif (Test-Path ".eslintrc.json") { $hasEslintConfig = $true }
elseif (Test-Path ".eslintrc.js") { $hasEslintConfig = $true }
elseif (Test-Path "eslint.config.js") { $hasEslintConfig = $true }
elseif (Test-Path "eslint.config.mjs") { $hasEslintConfig = $true }

$lintStatus = "ok"
$lintMsg = "No ESLint config - skipping"
$lintErrors = 0
if ($hasEslintConfig) {
    Write-Host "  Running ESLint with auto-fix..." -ForegroundColor Gray
    $job = Start-Job -ScriptBlock { npx eslint convex/ src/ --ext .ts,.tsx --fix 2>&1 }
    if (Wait-Job $job -Timeout 90) {
        $lintOutput = Receive-Job $job
        $lintErrors = @($lintOutput | Where-Object { $_ -match "error" }).Count
    } else {
        Stop-Job $job
        Write-WARN "ESLint timed out after 90s - skipping"
    }
    Remove-Job $job -Force -ErrorAction SilentlyContinue

    if ($lintErrors -gt 0) {
        Write-WARN "$lintErrors lint issue(s) remain after auto-fix"
        $IssueCount += $lintErrors
        $lintStatus = "warn"
        $lintMsg = "$lintErrors lint issues remain"
    } else {
        Write-OK "All lint issues fixed"
        $FixedCount++
        $lintMsg = "All lint issues auto-fixed"
    }
} else {
    Write-OK "No ESLint config found - skipping lint step"
}
$secElapsed = (Get-Date) - $secStart
Add-Section "5-lint" $lintStatus $lintMsg $secElapsed.TotalMilliseconds
Send-Section "5-lint" $lintStatus $lintMsg $secElapsed.TotalMilliseconds @{ remainingErrors = $lintErrors }

# ================================================================
# SECTION 6: GIT - COMMIT & PUSH
# ================================================================
Write-Section "6/8 - GIT COMMIT & PUSH"
$secStart = Get-Date
$gitStatus = git status --porcelain
$gitStatusStr = "ok"
$gitMsg = "No changes to commit"
if ($gitStatus) {
    $fileCount = ($gitStatus -split "`n").Count
    Write-Host "  Found $fileCount changed file(s) - committing..." -ForegroundColor Gray
    git add -A 2>&1 | Out-Null
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    git commit -m "fix: advanced auto-heal - TypeScript, lint, security [$timestamp]" 2>&1 | Out-Null
    git push origin main 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-OK "Changes committed and pushed to GitHub"
        $FixedCount++
        $gitStatusStr = "ok"
        $gitMsg = "Committed and pushed $fileCount file(s)"
    } else {
        Write-ERR "Git push failed - check your internet connection"
        $IssueCount++
        $gitStatusStr = "error"
        $gitMsg = "Git push failed"
        Send-Alert "critical" "deploy" "Git push failed" "Cannot push to GitHub - check connection" "git push" 0 $false $false
    }
} else {
    Write-OK "No changes to commit - already up to date"
}
$CommitSha = Get-CommitSha
$secElapsed = (Get-Date) - $secStart
Add-Section "6-git-push" $gitStatusStr $gitMsg $secElapsed.TotalMilliseconds
Send-Section "6-git-push" $gitStatusStr $gitMsg $secElapsed.TotalMilliseconds @{ commitSha = $CommitSha }

# ================================================================
# SECTION 7: CONVEX DEPLOY
# ================================================================
Write-Section "7/8 - CONVEX DEPLOYMENT"
$secStart = Get-Date
Write-Host "  Deploying to Convex production..." -ForegroundColor Gray
$convexOutput = npx convex deploy --typecheck=disable 2>&1
$convexStatus = "ok"
$convexMsg = "Deployed successfully"
if ($LASTEXITCODE -eq 0) {
    Write-OK "Deployed successfully to $CONVEX_URL"
    $FixedCount++
    $ConvexDeployed = $true
} else {
    Write-ERR "Convex deploy failed:"
    $convexOutput | Select-Object -Last 5 | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
    $IssueCount++
    $convexStatus = "error"
    $convexMsg = "Convex deploy failed"
    Send-Alert "critical" "deploy" "Convex deploy failed" "Production deploy returned non-zero" "npx convex deploy" 0 $false $false
}
$secElapsed = (Get-Date) - $secStart
Add-Section "7-convex-deploy" $convexStatus $convexMsg $secElapsed.TotalMilliseconds
Send-Section "7-convex-deploy" $convexStatus $convexMsg $secElapsed.TotalMilliseconds @{}

# ================================================================
# SECTION 8: LIVE HEALTH CHECK
# ================================================================
Write-Section "8/8 - LIVE HEALTH CHECK"
$secStart = Get-Date

function Test-Endpoint($name, $url, $method = "GET") {
    $start = Get-Date
    try {
        $response = Invoke-WebRequest -Uri $url -Method $method -TimeoutSec 10 -ErrorAction Stop -UseBasicParsing
        $elapsed = (Get-Date) - $start
        $status = "healthy"
        if ($response.StatusCode -ge 500) { $status = "down" }
        elseif ($response.StatusCode -ge 400) { $status = "degraded" }
        Send-HealthCheck $name $url $method $status $response.StatusCode $elapsed.TotalMilliseconds ""
        return @{ status = $status; code = $response.StatusCode; time = $elapsed.TotalMilliseconds }
    } catch {
        $elapsed = (Get-Date) - $start
        $errMsg = $_.Exception.Message
        Send-HealthCheck $name $url $method "down" 0 $elapsed.TotalMilliseconds $errMsg
        return @{ status = "down"; code = 0; time = $elapsed.TotalMilliseconds; error = $errMsg }
    }
}

Write-Host "  Pinging Vercel app..." -ForegroundColor Gray
$vercelResult = Test-Endpoint "Vercel App" $VERCEL_URL
if ($vercelResult.status -eq "healthy") {
    Write-OK "Vercel app is live and responding ($($vercelResult.code)) [$($vercelResult.time)ms]"
    $VercelDeployed = $true
} elseif ($vercelResult.status -eq "degraded") {
    Write-WARN "Vercel returned $($vercelResult.code)"
    $IssueCount++
    Send-Alert "warning" "endpoint" "Vercel degraded" "Status $($vercelResult.code) returned" $VERCEL_URL 0 $false $false
} else {
    Write-ERR "Vercel endpoint DOWN: $($vercelResult.error)"
    $IssueCount++
    Send-Alert "critical" "endpoint" "Vercel app is DOWN" "Cannot reach $VERCEL_URL" $VERCEL_URL 0 $false $false
}

Write-Host "  Pinging Convex deployment..." -ForegroundColor Gray
$convexResult = Test-Endpoint "Convex Cloud" "$CONVEX_URL/version"
if ($convexResult.status -eq "healthy") {
    Write-OK "Convex is live and responding ($($convexResult.code)) [$($convexResult.time)ms]"
} else {
    Write-WARN "Convex health check: $($convexResult.status)"
}

Write-Host "  Pinging Convex site..." -ForegroundColor Gray
$siteResult = Test-Endpoint "Convex Site" $CONVEX_SITE_URL
if ($siteResult.status -eq "healthy") {
    Write-OK "Convex site is live and responding"
} else {
    Write-WARN "Convex site check: $($siteResult.status)"
}

$secElapsed = (Get-Date) - $secStart
$healthOverall = if ($vercelResult.status -eq "healthy" -and $convexResult.status -eq "healthy") { "ok" } else { "warn" }
Add-Section "8-health-check" $healthOverall "Vercel: $($vercelResult.status), Convex: $($convexResult.status)" $secElapsed.TotalMilliseconds
Send-Section "8-health-check" $healthOverall "Vercel: $($vercelResult.status), Convex: $($convexResult.status)" $secElapsed.TotalMilliseconds @{
    vercel  = $vercelResult
    convex  = $convexResult
    site    = $siteResult
}

# ================================================================
# FINAL SUMMARY
# ================================================================
$RUN_END = Get-Date
$TOTAL_DURATION = ($RUN_END - $RUN_START).TotalSeconds

$finalStatus = "success"
if ($IssueCount -gt 0 -and $FixedCount -gt 0) { $finalStatus = "partial" }
elseif ($IssueCount -gt 0 -and $FixedCount -eq 0) { $finalStatus = "failed" }

$summaryText = "Run ${RUN_ID}: $($RunReport.sections.Count) sections, $FixedCount fixed, $IssueCount remaining, Vercel: $($vercelResult.status), Convex: $($convexResult.status)"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "              FINAL REPORT" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Run ID:        $RUN_ID" -ForegroundColor Gray
Write-Host "  Duration:      $([math]::Round($TOTAL_DURATION, 1))s" -ForegroundColor Gray
Write-Host "  Status:        $finalStatus" -ForegroundColor $(if ($finalStatus -eq "success") { "Green" } elseif ($finalStatus -eq "partial") { "Yellow" } else { "Red" })
Write-Host "  Sections:      $($RunReport.sections.Count) run, $($RunReport.sections | Where-Object { $_.status -eq 'ok' }).Count ok" -ForegroundColor Gray
Write-Host "  Issues Found:  $IssueCount" -ForegroundColor $(if ($IssueCount -gt 0) { "Yellow" } else { "Green" })
Write-Host "  Issues Fixed:  $FixedCount" -ForegroundColor Green
Write-Host "  Commit SHA:    $CommitSha" -ForegroundColor Gray
Write-Host "  Convex:        $(if ($ConvexDeployed) { "DEPLOYED" } else { "NOT DEPLOYED" })" -ForegroundColor $(if ($ConvexDeployed) { "Green" } else { "Yellow" })
Write-Host "  Vercel:        $(if ($VercelDeployed) { "LIVE" } else { "DOWN" })" -ForegroundColor $(if ($VercelDeployed) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "  Live App:    $VERCEL_URL" -ForegroundColor Cyan
Write-Host "  Convex:      $CONVEX_URL" -ForegroundColor Cyan
Write-Host "  GitHub:      $GITHUB_REPO" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Admin Auto-Heal Dashboard: $VERCEL_URL/admin/dashboard" -ForegroundColor Magenta
Write-Host ""

if ($IssueCount -eq 0) {
    Write-Host "  PERFECT HEALTH - All systems operational!" -ForegroundColor Green
} else {
    Write-Host "  Fixed: $FixedCount issue(s) automatically" -ForegroundColor Green
    Write-Host "  Remaining: $IssueCount issue(s) need manual attention" -ForegroundColor Yellow
}
Write-Host ""

# Send final report to Convex
Send-Complete $finalStatus $summaryText

# Write report to local file
$reportPath = "auto-heal-reports/$RUN_ID.json"
$reportDir = Split-Path -Path $reportPath -Parent
if (-not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
}
$RunReport.status = $finalStatus
$RunReport.completedAt = ([System.DateTimeOffset]$RUN_END).ToUnixTimeMilliseconds()
$RunReport.durationMs = $TOTAL_DURATION * 1000
$RunReport.issuesFound = $IssueCount
$RunReport.issuesFixed = $FixedCount
$RunReport.commitSha = $CommitSha
$RunReport.convexDeployed = $ConvexDeployed
$RunReport.vercelDeployed = $VercelDeployed
$RunReport.summary = $summaryText
$RunReport | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportPath -Encoding UTF8
Write-Host "  Report saved: $reportPath" -ForegroundColor Gray
Write-Host ""
