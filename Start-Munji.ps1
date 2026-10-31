$ErrorActionPreference = 'Stop'
$munjiNode = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $munjiNode) { $munjiNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $munjiNode)) { throw 'Node.js 20 or later is required. Install Node.js, then run npm start in this folder.' }
$munjiLauncher = Join-Path $PSScriptRoot 'launch-munji.mjs'
& $munjiNode $munjiLauncher
if ($LASTEXITCODE -ne 0) { Read-Host 'Press Enter to close' }
