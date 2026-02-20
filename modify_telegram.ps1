$file = "c:\Proyectos\web-notifications\pages\admin\settings.tsx"
$lines = Get-Content $file

# Find the line with telegramData?.map
$mapLineIndex = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "telegramData\?\. *map\(\(chat: any\)") {
        $mapLineIndex = $i
        break
    }
}

if ($mapLineIndex -ge 0) {
    # Replace the map line to add variables
    $lines[$mapLineIndex] = $lines[$mapLineIndex] -replace "telegramData\?\. *map\(\(chat: any\) *=> *\(", "telegramData?.map((chat: any) => { const chatId = String(chat.id); const isSelected = selectedChats.includes(chatId); return ("
    
    # Find the closing of the map (the line with just "))") and replace with "); })"
    for ($i = $mapLineIndex; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^\s+\)\)\s*$") {
            $lines[$i] = $lines[$i] -replace "\)\)", "); })"
            break
        }
    }
    
    # Save the file
    $lines | Set-Content $file -Encoding UTF8
    Write-Host "File modified successfully"
} else {
    Write-Host "Map line not found"
}
