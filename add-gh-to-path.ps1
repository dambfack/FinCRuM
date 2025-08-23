# Add GitHub CLI to PATH environment variable
$currentPath = [Environment]::GetEnvironmentVariable('PATH', 'User')
$ghPath = 'C:\Program Files\GitHub CLI'

if ($currentPath -notlike '*GitHub CLI*') {
    if ($currentPath -eq $null -or $currentPath -eq '') {
        $newPath = $ghPath
    } else {
        $newPath = $currentPath + ';' + $ghPath
    }
    [Environment]::SetEnvironmentVariable('PATH', $newPath, 'User')
    Write-Host 'GitHub CLI path added to user PATH environment variable'
    Write-Host 'Please restart your terminal or run: refreshenv'
} else {
    Write-Host 'GitHub CLI path already exists in PATH'
}

# Display current PATH
Write-Host 'Current user PATH:'
[Environment]::GetEnvironmentVariable('PATH', 'User')