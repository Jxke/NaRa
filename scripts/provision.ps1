param(
  [string]$Port = "COM6",
  [Parameter(Mandatory = $true)][string]$WifiSsid,
  [Parameter(Mandatory = $true)][string]$WifiPassword,
  [Parameter(Mandatory = $true)][string]$DeepgramApiKey,
  [Parameter(Mandatory = $true)][string]$OpenAIApiKey,
  [string]$OpenAIBaseUrl = "https://api.openai.com",
  [string]$OpenAIModel = "gpt-4.1-nano",
  [string]$DeepgramModel = "nova-2-general",
  [string]$DeepgramLanguage = "en-US",
  [string]$SystemPrompt = "You are a concise embedded assistant."
)

$payload = @{
  wifi_ssid = $WifiSsid
  wifi_password = $WifiPassword
  deepgram_api_key = $DeepgramApiKey
  deepgram_model = $DeepgramModel
  deepgram_language = $DeepgramLanguage
  openai_apiKey = $OpenAIApiKey
  openai_apiBaseUrl = $OpenAIBaseUrl
  openai_model = $OpenAIModel
  system_prompt = $SystemPrompt
} | ConvertTo-Json -Compress

$serialPort = New-Object System.IO.Ports.SerialPort
$serialPort.PortName = $Port
$serialPort.BaudRate = 115200
$serialPort.Parity = [System.IO.Ports.Parity]::None
$serialPort.DataBits = 8
$serialPort.StopBits = [System.IO.Ports.StopBits]::One
$serialPort.NewLine = "`n"
$serialPort.ReadTimeout = 1000
$serialPort.WriteTimeout = 1000

try {
  $serialPort.Open()
  Start-Sleep -Milliseconds 1200
  $serialPort.WriteLine($payload)
  Start-Sleep -Milliseconds 500
}
finally {
  if ($serialPort.IsOpen) {
    $serialPort.Close()
  }
}
