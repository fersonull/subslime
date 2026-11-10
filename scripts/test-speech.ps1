$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$fixtureDir = Join-Path $PSScriptRoot '../tests/fixtures/generated'
New-Item -ItemType Directory -Path $fixtureDir -Force | Out-Null
$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice.Rate = -1
$voice.SetOutputToWaveFile((Join-Path $fixtureDir 'speech.wav'))
$voice.Speak('Make every word count. This is a test of local video captions.')
$voice.Dispose()
