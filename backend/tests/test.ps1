# Urgence-Sang API — Test Script (PowerShell)
# Usage: .\tests\test.ps1
# Make sure the server is running first: go run ./cmd/main.go

$BASE = "http://localhost:8080/api/v1"
$headers = @{ "Content-Type" = "application/json" }

function Test-Endpoint($label, $response) {
    $status = if ($response.success) { "PASS" } else { "FAIL" }
    Write-Host "[$status] $label"
    $response | ConvertTo-Json -Depth 5 | Write-Host
    Write-Host "---"
}

Write-Host "`n=== 1. Health Check ==="
$r = Invoke-RestMethod "http://localhost:8080/health" -Method Get
Write-Host "[INFO] $($r | ConvertTo-Json)"

Write-Host "`n=== 2. Register Donor ==="
$body = @{
    email="donor1@test.com"; password="Test1234!"; role="donor"
    first_name="Youssef"; last_name="Alami"; phone="0612345678"
    blood_type="O+"; latitude=33.5731; longitude=-7.5898
} | ConvertTo-Json
try {
    $r = Invoke-RestMethod "$BASE/auth/register" -Method Post -Headers $headers -Body $body
    $global:DONOR_TOKEN = $r.data.token
    $global:DONOR_ID = $r.data.user.id
    Test-Endpoint "Register Donor (O+, Casablanca)" $r
} catch { Write-Host "[FAIL] Register Donor: $($_.Exception.Message)" }

Write-Host "`n=== 3. Login Donor ==="
$body = @{ email="donor1@test.com"; password="Test1234!" } | ConvertTo-Json
try {
    $r = Invoke-RestMethod "$BASE/auth/login" -Method Post -Headers $headers -Body $body
    $global:DONOR_TOKEN = $r.data.token
    Test-Endpoint "Login Donor" $r
} catch { Write-Host "[FAIL] Login Donor: $($_.Exception.Message)" }

Write-Host "`n=== 4. GET /auth/me (Donor) ==="
$authHeaders = @{ "Content-Type"="application/json"; "Authorization"="Bearer $($global:DONOR_TOKEN)" }
try {
    $r = Invoke-RestMethod "$BASE/auth/me" -Method Get -Headers $authHeaders
    Test-Endpoint "GET /auth/me" $r
} catch { Write-Host "[FAIL] GET /auth/me: $($_.Exception.Message)" }

Write-Host "`n=== 5. Register Hospital ==="
$body = @{
    email="hospital1@test.com"; password="Test1234!"; role="hospital"
    first_name="CHU"; last_name="Casablanca"; phone="0522112233"
    hospital_name="CHU Ibn Rochd"; latitude=33.5950; longitude=-7.6191
} | ConvertTo-Json
try {
    $r = Invoke-RestMethod "$BASE/auth/register" -Method Post -Headers $headers -Body $body
    $global:HOSPITAL_TOKEN = $r.data.token
    $global:HOSPITAL_ID = $r.data.user.id
    Test-Endpoint "Register Hospital" $r
} catch { Write-Host "[FAIL] Register Hospital: $($_.Exception.Message)" }

Write-Host "`n=== 6. PATCH /donors/status ==="
$authHeaders = @{ "Content-Type"="application/json"; "Authorization"="Bearer $($global:DONOR_TOKEN)" }
$body = @{ status="available" } | ConvertTo-Json
try {
    $r = Invoke-RestMethod "$BASE/donors/status" -Method Patch -Headers $authHeaders -Body $body
    Test-Endpoint "Update Donor Status" $r
} catch { Write-Host "[FAIL] Update Donor Status: $($_.Exception.Message)" }

Write-Host "`n=== 7. GET /donors/nearby-alerts ==="
try {
    $r = Invoke-RestMethod "$BASE/donors/nearby-alerts" -Method Get -Headers $authHeaders
    Test-Endpoint "Nearby Alerts (before any alert)" $r
} catch { Write-Host "[FAIL] Nearby Alerts: $($_.Exception.Message)" }

Write-Host "`n=== 8. Hospital tries to create alert (not verified — should fail) ==="
$hospHeaders = @{ "Content-Type"="application/json"; "Authorization"="Bearer $($global:HOSPITAL_TOKEN)" }
try {
    $r = Invoke-RestMethod "$BASE/hospitals/alerts" -Method Post -Headers $hospHeaders -Body "blood_type=O%2B&quantity_units=2" -ContentType "application/x-www-form-urlencoded"
    Test-Endpoint "Create Alert (unverified)" $r
} catch { Write-Host "[EXPECTED FAIL - unverified] $($_.Exception.Message)" }

Write-Host "`n=== DONE — Check results above ==="
Write-Host "Note: To test admin routes, register an admin user directly in the DB."
