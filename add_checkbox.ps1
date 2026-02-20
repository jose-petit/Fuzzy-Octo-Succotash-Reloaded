$file = "c:\Proyectos\web-notifications\pages\admin\settings.tsx"
$lines = Get-Content $file

# Find the line with the div that has "flex items-start justify-between mb-4"
$targetLineIndex = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'className="flex items-start justify-between mb-4"') {
        $targetLineIndex = $i
        break
    }
}

if ($targetLineIndex -ge 0) {
    # Insert checkbox before this div
    $indent = "                                            "
    $checkboxLines = @(
        "$indent{/* Checkbox for multi-select */}",
        "$indent<div className=`"absolute top-4 left-4`">",
        "$indent    <input",
        "$indent        type=`"checkbox`"",
        "$indent        checked={isSelected}",
        "$indent        onChange={() => toggleChatSelection(chatId)}",
        "$indent        className=`"w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer`"",
        "$indent    />",
        "$indent</div>",
        ""
    )
    
    # Insert the lines
    $newLines = @()
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($i == $targetLineIndex) {
            $newLines += $checkboxLines
        }
        $newLines += $lines[$i]
    }
    
    $newLines | Set-Content $file -Encoding UTF8
    Write-Host "Checkbox added successfully"
} else {
    Write-Host "Target line not found"
}
