param(
  [string]$Port = "COM6",
  [Parameter(Mandatory = $true)][string]$WifiSsid,
  [Parameter(Mandatory = $true)][string]$WifiPassword,
  [Parameter(Mandatory = $true)][string]$DeepgramApiKey,
  [string]$SupabaseUrl = "https://tsblsjjlrjnllsqyusmb.supabase.co",
  [string]$SupabaseAnonKey,
  [string]$DeviceApiKey,
  [string]$OpenAIApiKey,
  [string]$OpenAIBaseUrl = "https://api.openai.com",
  [string]$OpenAIModel = "gpt-4.1-nano",
  [string]$DeepgramModel = "nova-2-general",
  [string]$DeepgramLanguage = "en-US",
  [string]$SystemPrompt = "You are a concise embedded assistant."
)

if ([string]::IsNullOrWhiteSpace($SupabaseUrl) -and [string]::IsNullOrWhiteSpace($OpenAIApiKey)) {
  throw "Provide hosted Supabase credentials for the Nara pipeline or -OpenAIApiKey for the legacy OpenAI path."
}

if (-not [string]::IsNullOrWhiteSpace($SupabaseUrl) -and ([string]::IsNullOrWhiteSpace($SupabaseAnonKey) -or [string]::IsNullOrWhiteSpace($DeviceApiKey))) {
  throw "When -SupabaseUrl is set, -SupabaseAnonKey and -DeviceApiKey are also required."
}

$payload = @{
  wifi_ssid = $WifiSsid
  wifi_password = $WifiPassword
  deepgram_api_key = $DeepgramApiKey
  deepgram_model = $DeepgramModel
  deepgram_language = $DeepgramLanguage
  openai_apiBaseUrl = $OpenAIBaseUrl
  openai_model = $OpenAIModel
  system_prompt = $SystemPrompt
}

if (-not [string]::IsNullOrWhiteSpace($SupabaseUrl)) {
  $payload.supabase_url = $SupabaseUrl
  $payload.supabase_anon_key = $SupabaseAnonKey
  $payload.device_api_key = $DeviceApiKey
}

if (-not [string]::IsNullOrWhiteSpace($OpenAIApiKey)) {
  $payload.openai_apiKey = $OpenAIApiKey
}

$payload = $payload | ConvertTo-Json -Compress

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
