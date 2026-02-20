# Script para agregar destinos de Telegram al broadcast
# Uso: .\add_telegram_destination.ps1 -ChatId "-5136763519" -ChatName "Grupo Monitoreo" -ChatType "group"

param(
    [Parameter(Mandatory = $true)]
    [string]$ChatId,
    
    [Parameter(Mandatory = $true)]
    [string]$ChatName,
    
    [Parameter(Mandatory = $false)]
    [string]$ChatType = "group"
)

$query = @"
INSERT INTO telegram_destinations (chat_id, chat_name, chat_type, is_active) 
VALUES ('$ChatId', '$ChatName', '$ChatType', TRUE)
ON DUPLICATE KEY UPDATE 
    chat_name = '$ChatName',
    chat_type = '$ChatType',
    is_active = TRUE;
"@

docker exec -i mysql_staging_web_notifications mysql -uweb_user -pweb_pass web_notifications -e $query

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Destino agregado: $ChatName ($ChatId)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para ver todos los destinos:" -ForegroundColor Cyan
    Write-Host "docker exec -i mysql_staging_web_notifications mysql -uweb_user -pweb_pass web_notifications -e 'SELECT * FROM telegram_destinations;'"
}
else {
    Write-Host "❌ Error al agregar destino" -ForegroundColor Red
}
