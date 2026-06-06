# Auto-commit and push after every Write/Edit tool call.
# Receives a JSON payload on stdin describing which file was changed.

param()

$json  = [Console]::In.ReadToEnd()
$data  = $json | ConvertFrom-Json
$file  = $data.tool_input.file_path

Set-Location 'c:\Users\benja\SAMS-v1.0-FIXED\SAMS-v1.0'

# Stage everything
git add -A 2>&1 | Out-Null

# Only commit when there are actual changes
$dirty = git status --porcelain 2>&1
if (-not $dirty) { exit 0 }

$label = if ($file) { Split-Path $file -Leaf } else { 'codebase changes' }
git commit -m "Auto-commit: $label" 2>&1 | Out-Null
git push origin main 2>&1 | Out-Null
