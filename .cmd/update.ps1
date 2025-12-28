#-----------------------------------------------
#--- Clear the screen 
#-----------------------------------------------
Clear-Host

Write-Host "===================================="
Write-Host " Update MarpX website." 
Write-Host " Copyright 2025 Paulo Cunha" 
Write-Host "===================================="
Write-Host ""


#-----------------------------------------------
#--- Define source and destination directories
#-----------------------------------------------
$SOURCE_HTML = "C:\Users\paulo.cunha\OneDrive\__GITHUB\MarpX\examples\html"
$DESTINATION_HTML = "C:\Users\paulo.cunha\OneDrive\__GITHUB\cunhapaulo.github.io\marpx\examples"

$SOURCE_CSS = "C:\Users\paulo.cunha\OneDrive\__GITHUB\MarpX\themes"
$DESTINATION_CSS = "C:\Users\paulo.cunha\OneDrive\__GITHUB\cunhapaulo.github.io\marpx\themes"

#-----------------------------------------------
#--- Display the defined directories
#-----------------------------------------------
Write-Host " HTML Source: $SOURCE_HTML" -ForegroundColor Green
Write-Host " HTML Destination: $DESTINATION_HTML" -ForegroundColor Green
Write-Host " CSS Source: $SOURCE_CSS"  -ForegroundColor Green
Write-Host " CSS Destination: $DESTINATION_CSS" -ForegroundColor Green

#-----------------------------------------------
#--- Check if source directories exist
#-----------------------------------------------
if (-Not (Test-Path -Path $SOURCE_HTML)) {
    Write-Host "Error: HTML source directory not found." -ForegroundColor Red
    
    exit 1
}
if (-Not (Test-Path -Path $SOURCE_CSS)) {
    Write-Host "Error: CSS source directory not found." -ForegroundColor Red
    
    exit 1
}

#-----------------------------------------------
#--- Create destination directories if they do not exist
#-----------------------------------------------
if (-Not (Test-Path -Path $DESTINATION_HTML)) {
    New-Item -ItemType Directory -Path $DESTINATION_HTML -Force | Out-Null
}
if (-Not (Test-Path -Path $DESTINATION_CSS)) {
    New-Item -ItemType Directory -Path $DESTINATION_CSS -Force | Out-Null
}

#-----------------------------------------------
#--- Copy HTML files
#-----------------------------------------------
try {
    Get-ChildItem -Path "$SOURCE_HTML\*.html" -File | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $DESTINATION_HTML -Force
    }
    Write-Host " HTML file copy completed successfully." -ForegroundColor Green
}
catch {
    
    Write-Host " Error copying HTML files: $_" -ForegroundColor Red
    
    exit 1
}

#-----------------------------------------------
#--- Copy CSS files
#-----------------------------------------------
try {
    Get-ChildItem -Path "$SOURCE_CSS\*.css" -File | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $DESTINATION_CSS -Force
    }
    
    Write-Host " CSS file copy completed successfully." -ForegroundColor Green
    
}
catch {
    
    Write-Host " Error copying CSS files: $_" -ForegroundColor Red
    
    exit 1
}

#-----------------------------------------------
#--- Repository path for commit and push
#-----------------------------------------------
$REPO_PATH = "C:\Users\paulo.cunha\OneDrive\__GITHUB\MarpX"
$REPO_PATH2 = "C:\Users\paulo.cunha\OneDrive\__GITHUB\cunhapaulo.github.io"

#-----------------------------------------------
#--- Git step: commit and push
#-----------------------------------------------
try {
    Set-Location -Path $REPO_PATH

    #-----------------------------------------------
    #--- Check for uncommitted changes
    #-----------------------------------------------
    $changes = git status --porcelain
    if (-Not [string]::IsNullOrWhiteSpace($changes)) {
        git add .
        $timestamp = Get-Date -Format "dd.MMM.yyyy - HH:mm:ss"
        $commitMessage = "Update of HTML/CSS - date: $timestamp"
        git commit -m $commitMessage
        git push origin main
        
        Write-Host "" 
        Write-Host " ======================================================" 
        Write-Host " GitHub Update Step"
        Write-Host " ======================================================" 
        Write-Host " Changes successfully committed and pushed to GitHub." -ForegroundColor Cyan
        Write-Host " Changes successfully committed and pushed to GitHub." -ForegroundColor Cyan
        Write-Host "" 
        
    }
    else {
        Write-Host "" 
        Write-Host " ======================================================"
        Write-Host " GitHub Update Step"
        Write-Host " ======================================================"
        Write-Host "" 

        Write-Host " No changes detected in $REPO_PATH. Nothing to commit." -ForegroundColor Yellow
    }

    Set-Location -Path $REPO_PATH2

    #-----------------------------------------------
    #--- Check for uncommitted changes
    #-----------------------------------------------
    $changes = git status --porcelain
    if (-Not [string]::IsNullOrWhiteSpace($changes)) {
        git add .
        $timestamp = Get-Date -Format "dd.MMM.yyyy - HH:mm:ss"
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

#-----------------------------------------------
#--- Return to the original working directory
#-----------------------------------------------
Set-Location -Path "C:\Users\paulo.cunha\OneDrive\__GITHUB\MarpX"
Write-Host ""
Write-Host ""
Write-Host "Returned to original directory: MarpX" -ForegroundColor Gray

exit 0
