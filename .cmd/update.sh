#!/bin/bash

#--- Clear the screen 
#-----------------------------------------------
#-----------------------------------------------
clear

echo "===================================="
echo " Update MarpX website." 
echo " Copyright 2025 Paulo Cunha" 
echo "===================================="
echo ""

#-----------------------------------------------
#--- Define source and destination directories
#-----------------------------------------------
SOURCE_HTML="/home/$(whoami)/github/MarpX/examples/html"
DESTINATION_HTML="/home/$(whoami)/github/cunhapaulo.github.io/marpx/examples"

SOURCE_CSS="/home/$(whoami)/github/MarpX/themes"
DESTINATION_CSS="/home/$(whoami)/github/cunhapaulo.github.io/marpx/themes"

#-----------------------------------------------
#--- Display the defined directories
#-----------------------------------------------
echo -e " HTML Source: $SOURCE_HTML" 
echo -e " HTML Destination: $DESTINATION_HTML" 
echo -e " CSS Source: $SOURCE_CSS"  
echo -e " CSS Destination: $DESTINATION_CSS" 

#-----------------------------------------------
#--- Check if source directories exist
#-----------------------------------------------
if [ ! -d "$SOURCE_HTML" ]; then
    echo -e "\033[31mError: HTML source directory not found.\033[0m"
    exit 1
fi

if [ ! -d "$SOURCE_CSS" ]; then
    echo -e "\033[31mError: CSS source directory not found.\033[0m"
    exit 1
fi

#-----------------------------------------------
#--- Create destination directories if they do not exist
#-----------------------------------------------
if [ ! -d "$DESTINATION_HTML" ]; then
    mkdir -p "$DESTINATION_HTML"
fi

if [ ! -d "$DESTINATION_CSS" ]; then
    mkdir -p "$DESTINATION_CSS"
fi

#-----------------------------------------------
#--- Copy HTML files
#-----------------------------------------------
if cp "$SOURCE_HTML"/*.html "$DESTINATION_HTML"/ 2>/dev/null; then
    echo -e "\033[32m HTML file copy completed successfully.\033[0m"
else
    echo -e "\033[31m Error copying HTML files\033[0m"
    exit 1
fi

#-----------------------------------------------
#--- Copy CSS files
#-----------------------------------------------
if cp "$SOURCE_CSS"/*.css "$DESTINATION_CSS"/ 2>/dev/null; then
    echo -e "\033[32m CSS file copy completed successfully.\033[0m"
else
    echo -e "\033[31m Error copying CSS files\033[0m"
    exit 1
fi

#-----------------------------------------------
#--- Repository path for commit and push
#-----------------------------------------------
REPO_PATH="/home/$(whoami)/github/MarpX"
REPO_PATH2="/home/$(whoami)/github/cunhapaulo.github.io"

#-----------------------------------------------
#--- Git step: commit and push
#-----------------------------------------------
cd "$REPO_PATH" || exit 1

#-----------------------------------------------
#--- Check for uncommitted changes
#-----------------------------------------------
changes=$(git status --porcelain)
if [ -n "$changes" ]; then
    git add .
    timestamp=$(date +"%d.%b%Y - %H:%M:%S")
    commit_message="Update of HTML/CSS - date: $timestamp"
    git commit -m "$commit_message"
    git push origin main
    
    echo "" 
    echo -e "\033[36m ======================================================\033[0m"
    echo -e "\033[36m GitHub Update Step\033[0m"
    echo -e "\033[36m ======================================================\033[0m"
    echo -e "\033[36m Changes successfully committed and pushed to GitHub.\033[0m"
    echo -e "\033[36m Changes successfully committed and pushed to GitHub.\033[0m"
else
    echo "" 
    echo -e "\033[36m ======================================================\033[0m"
    echo -e "\033[36m GitHub Update Step\033[0m"
    echo -e "\033[36m ======================================================\033[0m"
    echo -e "\033[33m No changes detected in $REPO_PATH. Nothing to commit.\033[0m"
fi

cd "$REPO_PATH2" || exit 1

#-----------------------------------------------
#--- Check for uncommitted changes
#-----------------------------------------------
changes=$(git status --porcelain)
if [ -n "$changes" ]; then
    git add .
    timestamp=$(date +"%d.%b%Y - %H:%M:%S")
    commit_message="Update of HTML/CSS - date: $timestamp"
    git commit -m "$commit_message"
    git push origin main
    
    echo -e "\033[36m Changes successfully committed and pushed to GitHub.\033[0m"
else
    echo -e "\033[33m No changes detected in $REPO_PATH2. Nothing to commit.\033[0m"
fi

#-----------------------------------------------
#--- Return to the original working directory
#-----------------------------------------------
cd "/home/$(whoami)/github/MarpX" || exit 1
echo ""
echo ""
echo -e "\033[37mReturned to original directory: MarpX\033[0m"

exit 0