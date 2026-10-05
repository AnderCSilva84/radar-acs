param([switch]$Execute)
$ErrorActionPreference = 'Stop'
$radarProject = gcloud projects describe radar-acs --project=radar-acs --format=json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $radarProject.projectId -ne 'radar-acs' -or $radarProject.projectNumber -ne '596095541153') { throw 'PROJECT_GUARD_FAILED' }
$radarToday = node -e "process.stdout.write(require('./api/generator').editorialDate())"
if ($radarToday -ne '2026-10-04') { throw 'DATE_GUARD_FAILED' }
$radarIam = gcloud run services get-iam-policy generateradarscheduled --region=us-east1 --project=radar-acs --format=json | ConvertFrom-Json
$radarInvoker = @($radarIam.bindings | Where-Object { $_.role -eq 'roles/run.invoker' -and $_.members -contains 'serviceAccount:radar-scheduler@radar-acs.iam.gserviceaccount.com' }).Count -eq 1
if (-not $radarInvoker) { throw 'INVOKER_GUARD_FAILED' }
$radarJob = gcloud scheduler jobs describe radar-acs-daily-0800 --location=us-east1 --project=radar-acs --format=json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $radarJob.state -ne 'ENABLED' -or $radarJob.schedule -ne '0 8 * * *' -or $radarJob.timeZone -ne 'America/Belem' -or
    $radarJob.httpTarget.oidcToken.serviceAccountEmail -ne 'radar-scheduler@radar-acs.iam.gserviceaccount.com' -or
    $radarJob.httpTarget.oidcToken.audience -ne 'https://generateradarscheduled-6ougocc2ia-ue.a.run.app') { throw 'SCHEDULER_GUARD_FAILED' }
$radarAccess = gcloud auth print-access-token --project=radar-acs
if ($LASTEXITCODE -ne 0) { throw 'GOOGLE_AUTH_FAILED' }
$radarHeaders = @{Authorization=('Bearer ' + $radarAccess)}
$radarBase = 'https://firestore.googleapis.com/v1/projects/radar-acs/databases/(default)/documents'
try {
    try { $null = Invoke-RestMethod -Uri ($radarBase + '/briefings/2026-10-04') -Headers $radarHeaders; throw 'EDITION_ALREADY_EXISTS' }
    catch { if ($_.Exception.Response.StatusCode.value__ -ne 404) { throw } }
    $radarReservation = Invoke-RestMethod -Uri ($radarBase + '/geracoesManuais/scheduled-2026-10-04') -Headers $radarHeaders
    if ($radarReservation.fields.status.stringValue -ne 'FAILED' -or $radarReservation.fields.recoveryAttempted.booleanValue -ne $true -or
        $radarReservation.fields.exceptionalRecoveryConsumed.booleanValue -eq $true) { throw 'RESERVATION_GUARD_FAILED' }
    $radarNumberQuery = @{structuredQuery=@{from=@(@{collectionId='briefings'});where=@{fieldFilter=@{field=@{fieldPath='titulo'};op='EQUAL';value=@{stringValue='Radar ACS — Edição #003'}}};limit=1}} | ConvertTo-Json -Depth 10
    $radarNumbered = Invoke-RestMethod -Method Post -Uri ($radarBase + ':runQuery') -Headers $radarHeaders -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($radarNumberQuery))
    if (@($radarNumbered | Where-Object { $_.document }).Count -ne 0) { throw 'NUMBERED_EDITION_ALREADY_EXISTS' }
    $radarDateQuery = @{structuredQuery=@{from=@(@{collectionId='briefings'});where=@{fieldFilter=@{field=@{fieldPath='data'};op='EQUAL';value=@{stringValue='2026-10-04'}}};limit=1}} | ConvertTo-Json -Depth 10
    $radarDated = Invoke-RestMethod -Method Post -Uri ($radarBase + ':runQuery') -Headers $radarHeaders -ContentType 'application/json' -Body $radarDateQuery
    if (@($radarDated | Where-Object { $_.document }).Count -ne 0) { throw 'DATED_EDITION_ALREADY_EXISTS' }
    $radarLatestResponse = Invoke-WebRequest -UseBasicParsing -Uri 'https://radar-acs.web.app/api/briefing/latest'
    $radarLatest = ($radarLatestResponse.Content | ConvertFrom-Json).briefing
    if ($radarLatestResponse.StatusCode -ne 200 -or $radarLatest.data -ne '2026-10-03' -or $radarLatest.titulo -ne 'Radar ACS — Edição #002') { throw 'LATEST_GUARD_FAILED' }
    $radarPermissions = Invoke-RestMethod -Method Post -Uri 'https://run.googleapis.com/v1/projects/radar-acs/locations/us-east1/services/generateradarscheduled:testIamPermissions' -Headers $radarHeaders -ContentType 'application/json' -Body '{"permissions":["run.routes.invoke"]}'
    if ($radarPermissions.permissions -notcontains 'run.routes.invoke') { throw 'AUTHORIZED_IDENTITY_CANNOT_INVOKE' }
    [pscustomobject]@{preflight='PASS';project='radar-acs';projectNumber='596095541153';editionAbsent=$true;number003Absent=$true;latest='#002 / 2026-10-03';reservation='FAILED';recoveryAttempted=$true;invoker='PRESENTE';scheduler='ENABLED';nextExecution=$radarJob.scheduleTime;execute=[bool]$Execute} | ConvertTo-Json
    if (-not $Execute) { return }
    $radarIdentity = gcloud auth print-identity-token --project=radar-acs
    if ($LASTEXITCODE -ne 0 -or -not $radarIdentity) { throw 'GOOGLE_ID_TOKEN_FAILED' }
    $radarBody = '{"recoveryDate":"2026-10-04","confirmarRecuperacao":true,"exceptionalRecoveryAuthorization":"final-2026-10-04-f2401621"}'
    $radarStarted = [datetime]::UtcNow
    # Exactly one POST; never retry after a timeout, HTTP error or validation failure.
    try {
        $radarResult = Invoke-WebRequest -UseBasicParsing -Method Post -Uri 'https://generateradarscheduled-6ougocc2ia-ue.a.run.app/' -Headers @{Authorization=('Bearer ' + $radarIdentity)} -ContentType 'application/json' -Body $radarBody -TimeoutSec 600
        $radarPayload = $radarResult.Content | ConvertFrom-Json
        $radarOutcome = [pscustomobject]@{http=$radarResult.StatusCode;status=$radarPayload.status;date=$radarPayload.date;title=$radarPayload.title;metrics=$radarPayload.metrics;noticiasPublicadas=$radarPayload.noticiasPublicadas;durationMs=([datetime]::UtcNow-$radarStarted).TotalMilliseconds}
    } catch {
        $radarOutcome = [pscustomobject]@{http=$_.Exception.Response.StatusCode.value__;status='FAILED';durationMs=([datetime]::UtcNow-$radarStarted).TotalMilliseconds}
    } finally { $radarIdentity = $null }
    $radarOutcome | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 -LiteralPath '.local-final-recovery-result.json'
    $radarOutcome | ConvertTo-Json -Depth 10
} finally {
    $radarAccess = $null; $radarHeaders = $null; $radarIdentity = $null; $radarReservation = $null
}
