#----------------------------------------
# Clear the screen 
#----------------------------------------
Clear-Host----------------------------------------

Write-Host "===================================="
Write-Host " Update MarpX website." 
Write-Host " Copyright Paulo Cunha 2025" 
Write-Host "===================================="
Write-Host ""


#----------------------------------------
# Define source and destination directories
#----------------------------------------
$HTML_SOURCE = "C:\Users\paulo.cunha\OneDrive\__GITHUB\MarpX\examples\html"
$HTML_DESTINATION = "C:\Users\paulo.cunha\OneDrive\__GITHUB\cunhapaulo.github.io\marpx\examples"

$CSS_SOURCE = "C:\Users\paulo.cunha\OneDrive\__GITHUB\MarpX\themes"
$CSS_DESTINATION = "C:\Users\paulo.cunha\OneDrive\__GITHUB\cunhapaulo.github.io\marpx\themes"

#----------------------------------------
# Display the defined directories
#----------------------------------------
Write-Host " HTML Source: $HTML_SOURCE" -ForegroundColor Green
Write-Host " HTML Destination: $HTML_DESTINATION" -ForegroundColor Green
Write-Host " CSS Source: $CSS_SOURCE"  -ForegroundColor Green
Write-Host " CSS Destination: $CSS_DESTINATION" -ForegroundColor Green

#----------------------------------------
# Check if source directories exist
#----------------------------------------
if (-Not (Test-Path -Path $HTML_SOURCE)) {
    Write-Host "Error: HTML source directory not found." -ForegroundColor Red
    
    exit 1
}
if (-Not (Test-Path -Path $CSS_SOURCE)) {
    Write-Host "Error: CSS source directory not found." -ForegroundColor Red
    
    exit 1
}

#----------------------------------------
# Create destination directories if they do not exist
#----------------------------------------
if (-Not (Test-Path -Path $HTML_DESTINATION)) {
    New-Item -ItemType Directory -Path $HTML_
    DESTINATION -Force | Out-Null
}
if (-Not (Test-Path -Path $CSS_DESTINATION)) {
    New-Item -ItemType Directory -Path $CSS_
    DESTINATION -Force | Out-Null
}

#----------------------------------------
# Copy HTML files
#----------------------------------------
try {
    Get-ChildItem -Path "$HTML_
SOURCE\*.html" -File | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $HTML_
        DESTINATION -Force
    }
    Write-Host " HTML file copy completed successfully." -ForegroundColor Green
}
catch {
    
    Write-Host " Error copying HTML files: $_" -ForegroundColor Red
    
    exit 1
}

#----------------------------------------
# Copy CSS files
#----------------------------------------
try {
    Get-ChildItem -Path "$CSS_
SOURCE\*.css" -File | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $CSS_
        DESTINATION -Force
    }
    
    Write-Host " CSS file copy completed successfully." -ForegroundColor Green
    
}
catch {
    
    Write-Host " Error copying CSS files: $_" -ForegroundColor Red
    
    exit 1
}

#----------------------------------------
# Repository path for commit and push
#----------------------------------------
$REPO_PATH = "C:\Users\paulo.cunha\OneDrive\__GITHUB\MarpX"
$REPO_PATH2 = "C:\Users\paulo.cunha\OneDrive\__GITHUB\cunhapaulo.github.io"

#----------------------------------------
# Git step: commit and push
#----------------------------------------
try {
    Set-Location -Path $REPO_PATH

    #----------------------------------------
    # Check for uncommitted changes
    #----------------------------------------
    $changes = git status --porcelain
    if (-Not [string]::IsNullOrWhiteSpace($changes)) {
        git add .
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $commitMessage = "Update of HTML/CSS - date: $timestamp"
        git commit -m $commitMessage
        git push origin main
        
        Write-Host " Changes successfully committed and pushed to GitHub." -ForegroundColor Cyan
        
    }
    else {
        Write-Host " No changes detected in $REPO_PATH. Nothing to commit." -ForegroundColor Yellow
    }

    Set-Location -Path $REPO_PATH2

    #----------------------------------------
    # Check for uncommitted changes
    #----------------------------------------
    $changes = git status --porcelain
    if (-Not [string]::IsNullOrWhiteSpace($changes)) {
        git add .
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $commitMessage = "Update of HTML/CSS - date: $timestamp"
        git commit -m $commitMessage
        git push origin main
        
        Write-Host " Changes successfully committed and pushed to GitHub." -ForegroundColor Cyan
        
    }
    else {
        Write-Host " No changes detected in $REPO_PATH2. Nothing to commit." -ForegroundColor Yellow
    }
}
catch {
    
    Write-Host " Error during commit or push: $_" -ForegroundColor Red
    
    exit 1
}

#----------------------------------------
# Return to the original working directory
#----------------------------------------
Set-Location -Path "C:\Users\paulo.cunha\OneDrive\__GITHUB\MarpX"
Write-Host ""
Write-Host ""
Write-Host "Returned to original directory: MarpX" -ForegroundColor Gray

exit 0
