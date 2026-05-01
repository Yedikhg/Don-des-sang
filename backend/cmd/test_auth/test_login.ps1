# Test login endpoint
$email = "eventmetemeta@gmail.com"
$password = "password123"

Write-Host "Testing login for: $email" -ForegroundColor Cyan

$body = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "`nLogin successful!" -ForegroundColor Green
    Write-Host "Token: $($response.data.token.Substring(0, 50))..." -ForegroundColor Yellow
    Write-Host "`nUser Info:" -ForegroundColor Cyan
    Write-Host "  ID: $($response.data.user.id)"
    Write-Host "  Email: $($response.data.user.email)"
    Write-Host "  Role: $($response.data.user.role)"
    Write-Host "  Name: $($response.data.user.first_name) $($response.data.user.last_name)"
    
    # Save token to file for other tests
    $response.data.token | Out-File -FilePath "token.txt" -NoNewline
    Write-Host "`nToken saved to token.txt" -ForegroundColor Green
    
    # Test /me endpoint with token
    Write-Host "`n--- Testing /me endpoint ---" -ForegroundColor Cyan
    $meResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/me" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $($response.data.token)"
            "Content-Type" = "application/json"
        }
    
    Write-Host "/me endpoint successful!" -ForegroundColor Green
    Write-Host "User: $($meResponse.data.first_name) $($meResponse.data.last_name)" -ForegroundColor Yellow
    
} catch {
    Write-Host "`nLogin failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
