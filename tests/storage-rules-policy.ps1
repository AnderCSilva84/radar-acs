$ErrorActionPreference = 'Stop'
$radarToken = gcloud auth print-access-token --quiet --project=radar-acs
try {
  $path = '/b/radar-acs.firebasestorage.app/o/advertising/campaign/00000000-0000-4000-8000-000000000001.png'
  $cases = @()
  $labels = @()
  function Case($label, $method, $uid, $size, $mime, $expectation, $testPath = $path) {
    $auth = if ($uid) { @{uid=$uid; token=@{}} } else { $null }
    $request = @{path=$testPath; method=$method; auth=$auth; resource=@{size=$size; contentType=$mime}}
    $script:cases += @{expectation=$expectation; request=$request}
    $script:labels += $label
  }
  $admin = 'GUM5PnF3wreizm9y2P3dSrgkH3s1'
  Case 'superadmin upload' 'create' $admin 100 'image/png' 'ALLOW'
  Case 'anonymous upload' 'create' $null 100 'image/png' 'DENY'
  Case 'other user upload' 'create' 'other-user' 100 'image/png' 'DENY'
  Case 'oversize' 'create' $admin 5242881 'image/png' 'DENY'
  Case 'empty' 'create' $admin 0 'image/png' 'DENY'
  Case 'wrong MIME' 'create' $admin 100 'text/html' 'DENY'
  Case 'wrong extension MIME' 'create' $admin 100 'image/jpeg' 'DENY'
  Case 'public creative read' 'get' $null 100 'image/png' 'ALLOW'
  Case 'public list' 'list' $null 100 'image/png' 'DENY'
  Case 'immutable update' 'update' $admin 100 'image/png' 'DENY'
  Case 'outside advertising path' 'create' $admin 100 'image/png' 'DENY' '/b/radar-acs.firebasestorage.app/o/private/file.png'
  Write-Output ('Prepared rule test cases: '+$cases.Count)
  $body = @{source=@{files=@(@{name='storage.rules';content=([IO.File]::ReadAllText((Join-Path (Get-Location) 'storage.rules')))})};testSuite=@{testCases=$cases}} | ConvertTo-Json -Depth 12
  Write-Output ('Rule test request bytes: '+$body.Length)
  $result = Invoke-RestMethod -TimeoutSec 30 -Method Post -Uri 'https://firebaserules.googleapis.com/v1/projects/radar-acs:test' -Headers @{Authorization=('Bearer '+$radarToken); 'x-goog-user-project'='radar-acs'} -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes($body))
  if ($result.issues) { $result.issues | ConvertTo-Json -Depth 5 }
  for($i=0;$i -lt $result.testResults.Count;$i++){ Write-Output ($labels[$i]+': '+$result.testResults[$i].state) }
  if($result.testResults.Count -ne $cases.Count -or @($result.testResults | Where-Object state -ne 'SUCCESS').Count){ throw 'Storage rules policy failed.' }
} catch {
  if ($_.Exception.Response) {
    $reader = [IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $failure = $reader.ReadToEnd() | ConvertFrom-Json
    Write-Output $failure.error.message
  }
  throw
} finally { $radarToken=$null }
