<#
.SYNOPSIS
    Script de PowerShell para realizar copias de seguridad (dump) de la base de datos MySQL.
.DESCRIPTION
    Conecta al contenedor MySQL local o remoto (puerto mapeado) y genera un archivo .sql.
    Mantiene un número configurable de días de retención y elimina dumps antiguos.
.PARAMETER Host
    Dirección del servidor MySQL (por defecto 127.0.0.1).
.PARAMETER Port
    Puerto del servidor MySQL (por defecto 3308, mapeo de Docker).
.PARAMETER User
    Usuario de la base de datos (por defecto web_user).
.PARAMETER Password
    Contraseña del usuario (por defecto web_pass).
.PARAMETER Database
    Nombre de la base de datos a exportar (por defecto web_notifications).
.PARAMETER BackupDir
    Carpeta donde se guardarán los dumps (por defecto la subcarpeta 'backups' al lado del script).
.PARAMETER RetentionDays
    Días de retención de backups antes de eliminar (por defecto 30 días).
.EXAMPLE
    .\backup_db.ps1 -RetentionDays 14
    Crea un dump en .\backups\web_notifications_YYYYMMDD_HHmmss.sql y elimina archivos con más de 14 días.
#>
param(
    [string]$MySqlHost   = "127.0.0.1",
    [int]$Port           = 3308,
    [string]$User        = "web_user",
    [string]$Password    = "web_pass",
    [string]$Database    = "web_notifications",
    [string]$BackupDir   = "$PSScriptRoot\backups",
    [int]$RetentionDays = 30
)

# Crear carpeta de backups si no existe
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# Nombre de archivo con timestamp
$TimeStamp   = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "$Database`_$TimeStamp.sql"

Write-Host "Iniciando backup de '$Database' en: $BackupFile"
# Ejecutar mysqldump: si mysqldump.exe no existe, usar docker exec
try {
    # Intentar mysqldump local
    $localDump = Get-Command mysqldump.exe -ErrorAction Stop
    Write-Host "Usando mysqldump local: $($localDump.Source)"
    $dumpCmd = "mysqldump.exe -h $MySqlHost -P $Port -u $User -p$Password $Database"
    & cmd /c "$dumpCmd > `"$BackupFile`""
} catch {
    Write-Host "mysqldump.exe no encontrado, usando docker exec..."
    $container = 'mysql_web_notifications'
    $dockerCmd = "docker exec $container mysqldump -u $User -p$Password $Database"
    & cmd /c "$dockerCmd > `"$BackupFile`""
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error en backup vía Docker. Código: $LASTEXITCODE"
        Exit $LASTEXITCODE
    }
}
Write-Host "Backup completado exitosamente en: $BackupFile" -ForegroundColor Green

# Eliminar dumps antiguos
Write-Host "Eliminando dumps con más de $RetentionDays días de antigüedad..."
Get-ChildItem -Path $BackupDir -Filter "*.sql" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } |
    Remove-Item -Force

Write-Host "Proceso finalizado." -ForegroundColor Green

# Registrar último backup en archivo marker
$MarkerFile = Join-Path $BackupDir "last_backup.txt"
(Get-Date -Format "yyyy-MM-dd HH:mm:ss") | Out-File $MarkerFile -Encoding UTF8
Write-Host "Última copia registrada en: $MarkerFile" -ForegroundColor Green
