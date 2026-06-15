# Debug Enterprise Login Error
$CONVEX_URL = "https://warmhearted-aardvark-280.convex.cloud"

# First create a test org
Write-Host "1. Resetting admin password..." -ForegroundColor Yellow
$resetBody = @{ path = "seed_admin:resetPassword"; args = @{} } | ConvertTo-Json -Depth 5
$resetResp = Invoke-RestMethod -Uri "$CONVEX_URL/api/mutation" -Method Post -ContentType "application/json" -Body $resetBody
$adminPassword = $resetResp.value.password
Write-Host "   Admin password: $adminPassword" -ForegroundColor Green

# Login as admin
Write-Host "2. Logging in as admin..." -ForegroundColor Yellow
$loginBody = @{ path = "admin_auth:adminLogin"; args = @{ email = "admin@dutchkem.com"; password = $adminPassword; deviceId = "test-123" } } | ConvertTo-Json -Depth 5
$loginResp = Invoke-RestMethod -Uri "$CONVEX_URL/api/mutation" -Method Post -ContentType "application/json" -Body $loginBody
$adminToken = $loginResp.value.token
Write-Host "   Admin token: $($adminToken.Substring(0, [Math]::Min(20, $adminToken.Length)))..." -ForegroundColor Green

# Create test org
Write-Host "3. Creating test org..." -ForegroundColor Yellow
$testEmail = "logintest-$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
$createBody = @{
    path = "admin_enterprise:createOrganization"
    args = @{
        adminToken = $adminToken
        name = "Login Test Org"
        email = $testEmail
        plan = "trial"
        adminName = "Test Admin"
        adminEmail = $testEmail
    }
} | ConvertTo-Json -Depth 5
$createResp = Invoke-RestMethod -Uri "$CONVEX_URL/api/mutation" -Method Post -ContentType "application/json" -Body $createBody
$tempPassword = $createResp.value.tempPassword
Write-Host "   Created org with temp password: $tempPassword" -ForegroundColor Green

# Try enterprise login
Write-Host "4. Testing enterprise login..." -ForegroundColor Yellow
$enterpriseLoginBody = @{
    path = "enterprise_auth:login"
    args = @{
        email = $testEmail
        password = $tempPassword
    }
} | ConvertTo-Json -Depth 5

try {
    $enterpriseLoginResp = Invoke-RestMethod -Uri "$CONVEX_URL/api/mutation" -Method Post -ContentType "application/json" -Body $enterpriseLoginBody
    Write-Host "   Response: $($enterpriseLoginResp | ConvertTo-Json -Depth 5)" -ForegroundColor Cyan
    if ($enterpriseLoginResp.value.success) {
        Write-Host "   SUCCESS: Login worked!" -ForegroundColor Green
    } else {
        Write-Host "   FAIL: $($enterpriseLoginResp.value.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   EXCEPTION: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "   Body: $($reader.ReadToEnd())" -ForegroundColor Red
    }
}

# Also test with Davido Companies credentials
Write-Host ""
Write-Host "5. Testing with Davido Companies (alabondotun@yahoo.com)..." -ForegroundColor Yellow
$davidoLoginBody = @{
    path = "enterprise_auth:login"
    args = @{
        email = "alabondotun@yahoo.com"
        password = "test"
    }
} | ConvertTo-Json -Depth 5

try {
    $davidoResp = Invoke-RestMethod -Uri "$CONVEX_URL/api/mutation" -Method Post -ContentType "application/json" -Body $davidoLoginBody
    Write-Host "   Response: $($davidoResp | ConvertTo-Json -Depth 5)" -ForegroundColor Cyan
} catch {
    Write-Host "   EXCEPTION: $($_.Exception.Message)" -ForegroundColor Red
}
