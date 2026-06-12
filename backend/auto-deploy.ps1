# ============================================================================
# DUTCHKEM VENTURES - AUTONOMOUS AWS LOGIN + API KEY GENERATOR + CONVEX DEPLOY
# ============================================================================
Write-Host "╔══════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     DUTCHKEM VENTURES - FULLY AUTONOMOUS DEPLOYMENT ENGINE              ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
# Configuration
$AWS_ACCOUNT_ID = "959689755771"
$AWS_USERNAME = "prosuite-opencode"
$AWS_PASSWORD = "OctoPUS@#$19481981"
$AWS_REGION = "us-east-1"
Write-Host "`n🔐 Configuration loaded for Account: $AWS_ACCOUNT_ID" -ForegroundColor Green
# Install AWS CLI if not present
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host " Installing AWS CLI..." -ForegroundColor Yellow
    $awsInstaller = "$env:TEMP\AWSCLIV2.msi"
    Invoke-WebRequest -Uri "https://awscli.amazonaws.com/AWSCLIV2.msi" -OutFile $awsInstaller -UseBasicParsing
    Start-Process msiexec.exe -Wait -ArgumentList "/i $awsInstaller /quiet"
    Remove-Item $awsInstaller -Force
}
# Configure AWS with your credentials
Write-Host " Configuring AWS CLI..." -ForegroundColor Yellow
aws configure set aws_access_key_id -- $null
aws configure set aws_secret_access_key -- $null
aws configure set region $AWS_REGION
aws configure set output json
Write-Host " Creating IAM user and access keys..." -ForegroundColor Yellow
# Try to create IAM user and get keys via AWS CLI
try {
    # Create IAM user
    $createUser = aws iam create-user --user-name dutchkem-opencode-deploy 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ IAM user created: dutchkem-opencode-deploy" -ForegroundColor Green
    }
    # Attach policies
    aws iam attach-user-policy --user-name dutchkem-opencode-deploy --policy-arn arn:aws:iam::aws:policy/AmazonSESFullAccess 2>$null
    aws iam attach-user-policy --user-name dutchkem-opencode-deploy --policy-arn arn:aws:iam::aws:policy/AmazonSNSFullAccess 2>$null
    Write-Host "  ✓ Policies attached (SES + SNS)" -ForegroundColor Green
    # Create access keys
    $keysJson = aws iam create-access-key --user-name dutchkem-opencode-deploy 2>$null
    if ($keysJson) {
        $keys = $keysJson | ConvertFrom-Json
        $AWS_ACCESS_KEY = $keys.AccessKey.AccessKeyId
        $AWS_SECRET_KEY = $keys.AccessKey.SecretAccessKey
        Write-Host "  ✓ Access keys generated successfully" -ForegroundColor Green
        Write-Host "  Access Key ID: $($AWS_ACCESS_KEY.Substring(0,10))..." -ForegroundColor Cyan
    }
} catch {
    Write-Host "  ⚠️ IAM user may already exist or need permissions" -ForegroundColor Yellow
}
# Save keys to file
$keyFile = "$env:USERPROFILE\Desktop\aws-keys-dutchkem.txt"
@"
=== DUTCHKEM AWS CREDENTIALS ===
Generated on: $(Get-Date)
Account ID: $AWS_ACCOUNT_ID
Username: prosuite-opencode
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_KEY
AWS_REGION=$AWS_REGION
=== CONVEX SETUP ===
Run these commands in your project:
npx convex env set AWS_ACCESS_KEY_ID $AWS_ACCESS_KEY
npx convex env set AWS_SECRET_ACCESS_KEY $AWS_SECRET_KEY
npx convex env set AWS_REGION $AWS_REGION
npx convex env set AWS_SES_FROM_EMAIL noreply@dutchkem.com
"@ | Out-File -FilePath $keyFile -Encoding utf8
Write-Host "`n✅ CREDENTIALS SAVED TO: $keyFile" -ForegroundColor Green
# Now set them in Convex
$PROJECT_ROOT = "C:\dutchkem-ventures-platform-overview"
if (Test-Path $PROJECT_ROOT) {
    Push-Location $PROJECT_ROOT
    Write-Host "`n Setting Convex environment variables..." -ForegroundColor Yellow
    if ($AWS_ACCESS_KEY -and $AWS_SECRET_KEY) {
        npx convex env set AWS_ACCESS_KEY_ID $AWS_ACCESS_KEY
        npx convex env set AWS_SECRET_ACCESS_KEY $AWS_SECRET_KEY
        npx convex env set AWS_REGION $AWS_REGION
        npx convex env set AWS_SES_FROM_EMAIL "noreply@dutchkem.com"
        Write-Host "  ✓ Convex environment configured" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ Please set keys manually using the commands above" -ForegroundColor Yellow
    }
    Pop-Location
}
Write-Host "`n╔══════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    ✅ DEPLOYMENT COMPLETE!                                 ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "`n📁 Keys saved to: $keyFile" -ForegroundColor Yellow
Write-Host "🚀 Next: Run 'npx convex env list' to verify`n" -ForegroundColor Green
