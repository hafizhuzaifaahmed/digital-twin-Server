# Test Export API with JWT Authentication
# This script exports company data to Excel file

$baseUrl = "http://localhost:3001"
$outputFile = "$env:USERPROFILE\Desktop\exported_data.xlsx"
$companyName = "Maldova Hospital"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Testing Export API" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login to get JWT token
Write-Host "Step 1: Authenticating..." -ForegroundColor Yellow
$loginBody = @{
    email = "superadmin@example.com"
    password = "ChangeMe123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.access_token
    Write-Host "✓ Authentication successful" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "✗ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Export data
Write-Host "Step 2: Exporting company data..." -ForegroundColor Yellow
Write-Host "Company: $companyName" -ForegroundColor Gray
Write-Host "Output: $outputFile" -ForegroundColor Gray
Write-Host ""

$headers = @{
    Authorization = "Bearer $token"
}

$exportUrl = "$baseUrl/import/export?companyName=$([System.Uri]::EscapeDataString($companyName))"

try {
    Invoke-WebRequest -Uri $exportUrl -Method GET -Headers $headers -OutFile $outputFile
    Write-Host "✓ Export successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "File saved to: $outputFile" -ForegroundColor Cyan
    
    # Get file info
    $fileInfo = Get-Item $outputFile
    Write-Host "File size: $([math]::Round($fileInfo.Length / 1KB, 2)) KB" -ForegroundColor Gray
    Write-Host "Created: $($fileInfo.CreationTime)" -ForegroundColor Gray
    Write-Host ""
    
    # Ask to open file
    $open = Read-Host "Do you want to open the file? (Y/N)"
    if ($open -eq "Y" -or $open -eq "y") {
        Start-Process $outputFile
    }
    
} catch {
    Write-Host "✗ Export failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit 1
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Export test completed!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
