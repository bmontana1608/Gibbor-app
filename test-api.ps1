try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/admin/clubes/corte" -Method PUT -Headers @{"Content-Type"="application/json"} -Body '{"club_id":"00000000-0000-0000-0000-000000000000","proximo_corte":"2026-10-10"}' -ErrorAction Stop
    Write-Host "Success! Content:"
    Write-Host $response.Content
} catch {
    Write-Host "Error!"
    Write-Host $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $text = $reader.ReadToEnd()
    Write-Host $text
}
