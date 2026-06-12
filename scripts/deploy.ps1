# scripts\deploy.ps1
Write-Host "🚀 Deploying AWS SES+SNS OTP System..." -ForegroundColor Cyan

# Set environment variables
$env:AWS_REGION = "us-east-1"
$env:AWS_SES_FROM_EMAIL = "noreply@dutchkem.com"

# Check if AWS credentials exist
if (Test-Path ~\.aws\credentials) {
    Write-Host "✅ AWS credentials found" -ForegroundColor Green
} else {
    Write-Host "⚠️ No AWS credentials found - will use fallback mode" -ForegroundColor Yellow
    Write-Host "To add AWS credentials, run: aws configure" -ForegroundColor Yellow
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
cd backend
npm install

# Start the server
Write-Host "🚀 Starting server..." -ForegroundColor Cyan
npm start