# ==============================================================================
# AI Context Generator Script (PowerShell)
#
# Description:
# This script creates a single text file (`ai_context.txt`) containing the
# directory tree and the contents of all relevant source code files in the
# current project directory. This is ideal for providing context to an AI model.
#
# Instructions:
# 1. Place this script in the root directory of your project.
# 2. Run it: .\create_ai_context.ps1
# 3. The `ai_context.txt` file will be created in the same directory.
#
# Note: Ensure the file is saved as UTF-8. This version uses only ASCII characters
# to avoid encoding issues.
# ==============================================================================

# --- Configuration ---
# The name of the output file.
$OUTPUT_FILE = "ai_context.txt"

# Directories to ignore completely in both the tree and file content.
$IGNORE_DIRS = @("node_modules", "public", ".next", ".open-next", ".wrangler", ".git", "dist", "build", "vendor", "__pycache__", ".venv", "venv", ".idea", ".vscode")

# Specific files to ignore.
$IGNORE_FILES = @("package-lock.json")

# File extensions to include.
$INCLUDE_EXTENSIONS = @(
    "js", "jsx", "ts", "tsx", "html", "css", "scss", "sass", "less",
    "py", "rb", "php", "go", "java", "c", "cpp", "h", "hpp", "cs",
    "json", "yml", "yaml", "xml", "md", "sql", "puml", "txt",
    "Dockerfile", "docker-compose.yml", "package.json", "tsconfig.json", ".env.example"
)

# --- Functions ---
function Write-Tree {
    param(
        [string]$Path = ".",
        [int]$Depth = 0,
        [string[]]$IgnoreDirs,
        [string[]]$IgnoreFiles,
        [int]$MaxDepth = 10
    )
    
    if ($Depth -gt $MaxDepth) { return }
    
    $indent = "  " * $Depth
    $item = Get-Item $Path
    $displayName = if ($item.PSIsContainer) { $item.Name + "/" } else { $item.Name }
    
    # Skip if in ignore list
    if ($IgnoreDirs -contains $item.Name -or $IgnoreFiles -contains $item.Name) {
        return
    }
    
    Write-Output "$indent$displayName"
    
    if ($item.PSIsContainer) {
        $children = Get-ChildItem -Path $Path | Where-Object {
            $childName = $_.Name
            $isDir = $_.PSIsContainer
            $isIgnored = ($IgnoreDirs -contains $childName) -or 
                         ($isDir -and ($IgnoreDirs | Where-Object { $_.FullName -like "*\$childName*" })) -or
                         (-not $isDir -and $IgnoreFiles -contains $childName)
            -not $isIgnored
        }
        
        foreach ($child in $children) {
            Write-Tree -Path $child.FullName -Depth ($Depth + 1) -IgnoreDirs $IgnoreDirs -IgnoreFiles $IgnoreFiles
        }
    }
}

# --- Script Logic ---
Write-Host "Starting AI context generation..."

# Clear the output file if it already exists.
if (Test-Path $OUTPUT_FILE) { 
    Clear-Content -Path $OUTPUT_FILE 
}
New-Item -Path $OUTPUT_FILE -ItemType File -Force | Out-Null

# 1. Add a header to the output file.
$header = @"
=================================================
PROJECT CONTEXT FOR AI ANALYSIS
=================================================
This document contains the project structure and source code for review.
Project root: $(Get-Location)
Generated on: $(Get-Date)

-------------------------------------------------
PROJECT FILE AND FOLDER STRUCTURE
-------------------------------------------------

"@
Add-Content -Path $OUTPUT_FILE -Value $header -Encoding UTF8

# 2. Generate and append the directory tree.
Write-Host "Generating file tree..."
$ignore_pattern = ($IGNORE_DIRS + $OUTPUT_FILE + $IGNORE_FILES) -join "|"
$tree_lines = Write-Tree -IgnoreDirs $IGNORE_DIRS -IgnoreFiles $IGNORE_FILES
$tree_lines | Add-Content -Path $OUTPUT_FILE -Encoding UTF8

# 3. Add a separator before the code files.
$separator = @"

-------------------------------------------------
PROJECT SOURCE CODE FILES
-------------------------------------------------

"@
Add-Content -Path $OUTPUT_FILE -Value $separator -Encoding UTF8

# 4. Find and process all relevant files.
Write-Host "Finding and processing source files..."

$files = Get-ChildItem -Recurse -File | Where-Object {
    $path = $_.FullName
    $fileName = $_.Name
    $extension = if ($_.Extension) { $_.Extension.TrimStart('.').ToLower() } else { $fileName.ToLower() }

    # Skip ignored directories
    $isIgnoredDir = $IGNORE_DIRS | Where-Object { $path -like "*\$_\*" }
    if ($isIgnoredDir) { return $false }

    # Skip the output file and ignored files
    if ($fileName -eq $OUTPUT_FILE -or $IGNORE_FILES -contains $fileName) { return $false }

    # Include files with matching extensions or exact filenames
    $isIncluded = $INCLUDE_EXTENSIONS -contains $extension -or $INCLUDE_EXTENSIONS -contains $fileName
    return $isIncluded
}

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring((Get-Location).Path.Length + 1).Replace('\', '/')
    Write-Host " -> Processing: $relativePath"

    # Get the file extension or filename for language hint
    $extension = if ($file.Extension) { $file.Extension.TrimStart('.').ToLower() } else { $file.Name.ToLower() }
    $lang_hint = $extension

    # Refine language hint for common cases
    switch -Regex ($lang_hint) {
        '^(js|jsx)$' { $lang_hint = "javascript" }
        '^(ts|tsx)$' { $lang_hint = "typescript" }
        '^(puml|plantuml)$' { $lang_hint = "plantuml" }
        '^py$' { $lang_hint = "python" }
        '^rb$' { $lang_hint = "ruby" }
        '^md$' { $lang_hint = "markdown" }
        '^yml$' { $lang_hint = "yaml" }
        '^sh$' { $lang_hint = "bash" }
    }

    # Read file content
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8

    # Append file header and content to the output file
    # Use ```` to output literal ```
    $file_block = @"
=========================================
FILE: $relativePath
=========================================
````$lang_hint
$content
````

"@
    Add-Content -Path $OUTPUT_FILE -Value $file_block -Encoding UTF8
}

Write-Host "Success! Context saved to '$OUTPUT_FILE'."
Write-Host "You can now copy the contents of this file into the AI prompt."