# ============================================================
# Urgence-Sang — AI Service Test Script
# Usage : .\test_ai.ps1
# Pre-requis : python app.py en cours d execution (port 5001)
# ============================================================

$BASE = "http://localhost:5001"
$script:PASS = 0
$script:FAIL = 0

function Test-Endpoint($name, $method, $url, $body = $null) {
    try {
        if ($method -eq "GET") {
            $r = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 10
        } else {
            $r = Invoke-RestMethod -Uri $url -Method POST -Body ($body | ConvertTo-Json -Depth 5) -ContentType "application/json" -TimeoutSec 15
        }
        Write-Host "  [OK] $name" -ForegroundColor Green
        $r | ConvertTo-Json -Depth 4 | Write-Host
        $script:PASS++
        return $r
    } catch {
        Write-Host "  [FAIL] $name — $($_.Exception.Message)" -ForegroundColor Red
        $script:FAIL++
        return $null
    }
}

Write-Host "`n=== Urgence-Sang AI Service Tests ===" -ForegroundColor Cyan

# ── 1. Health ─────────────────────────────────────────────────────────────────
Write-Host "`n[1] GET /health"
Test-Endpoint "Health check" "GET" "$BASE/health"

# ── 2. Rank ───────────────────────────────────────────────────────────────────
Write-Host "`n[2] POST /rank"
$rankBody = @{
    hospital_loc = @{ lat = 33.5731; lng = -7.5898 }
    blood_type   = "O+"
    donors       = @(
        @{ id = "donor-A"; lat = 33.5733; lng = -7.5901; history = 8;  blood_type = "O-" },
        @{ id = "donor-B"; lat = 33.5900; lng = -7.6100; history = 2;  blood_type = "O+" },
        @{ id = "donor-C"; lat = 33.5710; lng = -7.5880; history = 10; blood_type = "O+" }
    )
}
$rankResult = Test-Endpoint "Donor ranking (3 donors)" "POST" "$BASE/rank" $rankBody
if ($rankResult -and $rankResult.ranked_ids.Count -eq 3) {
    Write-Host "  [OK] Ordre correct : $($rankResult.ranked_ids -join ' > ')" -ForegroundColor Green
}

# ── 3. Rank vide ──────────────────────────────────────────────────────────────
Write-Host "`n[3] POST /rank (liste vide)"
$emptyRank = @{ hospital_loc = @{ lat = 33.5731; lng = -7.5898 }; blood_type = "O+"; donors = @() }
Test-Endpoint "Ranking liste vide" "POST" "$BASE/rank" $emptyRank

# ── 4. Chat step 1 ────────────────────────────────────────────────────────────
Write-Host "`n[4] POST /chat (step 1)"
$chat1 = @{
    message    = "Bonjour je veux donner du sang"
    donor_name = "Youssef"
    blood_type = "O-"
    history    = @()
}
$chatResult = Test-Endpoint "Chat step 1 (premier contact)" "POST" "$BASE/chat" $chat1

# ── 5. Chat step 2 ────────────────────────────────────────────────────────────
Write-Host "`n[5] POST /chat (step 2 avec historique)"
$chat2 = @{
    message    = "Oui je peux me deplacer maintenant"
    donor_name = "Youssef"
    blood_type = "O-"
    history    = @(
        @{ role = "user";      content = "Bonjour je veux donner du sang" },
        @{ role = "assistant"; content = "Pouvez-vous vous deplacer maintenant ?" }
    )
}
Test-Endpoint "Chat step 2 (reponse positive)" "POST" "$BASE/chat" $chat2

# ── 6. Chat reponse negative ──────────────────────────────────────────────────
Write-Host "`n[6] POST /chat (donneur non eligible)"
$chatNeg = @{
    message    = "Non j ai ete malade la semaine derniere"
    donor_name = "Hassan"
    blood_type = "A+"
    history    = @()
}
$negResult = Test-Endpoint "Chat reponse negative (malade)" "POST" "$BASE/chat" $chatNeg
if ($negResult -and $negResult.eligible -eq $false) {
    Write-Host "  [OK] Eligible=false detecte correctement" -ForegroundColor Green
}

# ── 7. Motivate critical ──────────────────────────────────────────────────────
Write-Host "`n[7] POST /motivate (urgency=critical)"
$motiv1 = @{
    donor_name    = "Youssef"
    blood_type    = "O-"
    hospital_name = "CHU Ibn Rochd"
    distance_km   = 2.3
    urgency       = "critical"
}
Test-Endpoint "Motivation critique (O- rare)" "POST" "$BASE/motivate" $motiv1

# ── 8. Motivate medium ────────────────────────────────────────────────────────
Write-Host "`n[8] POST /motivate (urgency=medium)"
$motiv2 = @{
    donor_name    = "Sara"
    blood_type    = "AB+"
    hospital_name = "Hopital Mohammed V"
    distance_km   = 4.8
    urgency       = "medium"
}
Test-Endpoint "Motivation moyenne (AB+)" "POST" "$BASE/motivate" $motiv2

# ── Resultats ─────────────────────────────────────────────────────────────────
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Tests passes  : $PASS" -ForegroundColor Green
Write-Host "  Tests echoues : $FAIL" -ForegroundColor $(if ($FAIL -eq 0) { "Green" } else { "Red" })
Write-Host "========================================`n" -ForegroundColor Cyan
