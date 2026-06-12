# scripts\test-otp.ps1
Write-Host "🧪 Testing OTP System..." -ForegroundColor Cyan

# First, check if server is running
try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 2
    Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not running! Start the server first with: npm start" -ForegroundColor Red
    Write-Host "   Then run this test again" -ForegroundColor Yellow
    exit 1
}

# Test request OTP
Write-Host "`n📧 Testing Email OTP..." -ForegroundColor Yellow
$body = @{ 
    identifier = "test@example.com"
    purpose = "login" 
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/request-otp" `
        -Method Post `
        -Body $body `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "✅ OTP Request successful!" -ForegroundColor Green
    Write-Host "   Response: $($response.message)" -ForegroundColor White
    
    if ($response.debug_otp) {
        Write-Host "`n🔑 Debug OTP Code: $($response.debug_otp)" -ForegroundColor Magenta
        
        # Test verify OTP
        Write-Host "`n🔐 Testing OTP Verification..." -ForegroundColor Yellow
        $verifyBody = @{ 
            identifier = "test@example.com"
            otpCode = $response.debug_otp
            purpose = "login"
        } | ConvertTo-Json
        
        $verifyResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/verify-otp" `
            -Method Post `
            -Body $verifyBody `
            -ContentType "application/json"
        
        Write-Host "✅ Verification successful!" -ForegroundColor Green
        Write-Host "   User: $($verifyResponse.user.name)" -ForegroundColor White
        Write-Host "   Token: $($verifyResponse.token.Substring(0, 20))..." -ForegroundColor Gray
    }
    
    # Check service status
    Write-Host "`n📊 Service Status:" -ForegroundColor Yellow
    $status = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/status"
    Write-Host "   Mode: $($status.mode)" -ForegroundColor $(if($status.mode -like "*LIVE*"){"Green"}else{"Yellow"})
    Write-Host "   Region: $($status.region)" -ForegroundColor White
    Write-Host "   From Email: $($status.fromEmail)" -ForegroundColor White
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd() | ConvertFrom-Json
        Write-Host "   Details: $($errorBody.error)" -ForegroundColor Red
    }
}

Write-Host "`n✅ Test complete!" -ForegroundColor Green