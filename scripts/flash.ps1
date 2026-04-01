param(
  [string]$Port = "COM6",
  [switch]$Upload
)

$ErrorActionPreference = "Stop"

$fqbn = "esp32:esp32:esp32s3:FlashSize=32M,PartitionScheme=default_8MB,PSRAM=opi,USBMode=hwcdc,CDCOnBoot=cdc,UploadMode=default"
$buildPath = Join-Path $PSScriptRoot "..\build\arduino"
$sketchPath = Join-Path $PSScriptRoot "..\ROCK"
$libraryPath = Join-Path $PSScriptRoot "..\DAZI-AI"

arduino-cli compile `
  --fqbn $fqbn `
  --build-path $buildPath `
  --library $libraryPath `
  $sketchPath

if ($Upload) {
  arduino-cli upload `
    -p $Port `
    --fqbn $fqbn `
    --input-dir $buildPath `
    $sketchPath
}
