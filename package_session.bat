@echo off
REM FamilyTime Session Transfer Script (Windows)
REM Run from anywhere — saves zip to your Desktop

SET PROJECT_DIR=%USERPROFILE%\Documents\familytime2
SET OUTPUT_DIR=%USERPROFILE%\Desktop
SET TIMESTAMP=%DATE:~10,4%%DATE:~4,2%%DATE:~7,2%_%TIME:~0,2%%TIME:~3,2%
SET TIMESTAMP=%TIMESTAMP: =0%
SET OUTPUT_FILE=%OUTPUT_DIR%\familytime_session_%TIMESTAMP%.zip
SET TREE_FILE=%PROJECT_DIR%\PROJECT_TREE.txt

echo ================================
echo   FamilyTime Session Packager
echo ================================

REM Check project exists
IF NOT EXIST "%PROJECT_DIR%" (
  echo ERROR: Project not found at %PROJECT_DIR%
  echo Edit PROJECT_DIR in this script to match your path.
  pause
  exit /b 1
)

cd /d "%PROJECT_DIR%"

REM Generate file tree
echo Generating file tree...
(
  echo FamilyTime - Session Transfer Package
  echo Generated: %DATE% %TIME%
  echo Live URL:  https://hubler.vercel.app
  echo Repo:      https://github.com/hubl3r/FamilyTime.git
  echo Stack:     Next.js 16 + NextAuth + Supabase + Vercel
  echo ------------------------------------------------
  echo CURRENT STATE:
  echo - Auth: NextAuth with email/password ^(in-memory, needs Supabase^)
  echo - StylePicker: built but not yet wired to app CSS variables
  echo - Finances module: mock data, needs Supabase backend
  echo - Documents module: mock data, needs Supabase backend
  echo - Stub modules: chores, meals, prayer, events, members
  echo.
  echo NEXT PRIORITIES:
  echo - Wire StylePicker to apply CSS variables across app
  echo - Build Supabase backend for auth, finances, documents
  echo - Financial tracker: accounts, credit cards, loans, amortization
  echo ------------------------------------------------
  echo FILE TREE:
) > "%TREE_FILE%"

REM Use tree command if available, otherwise dir
WHERE tree >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
  tree /F /A | findstr /V "node_modules .next .git" >> "%TREE_FILE%"
) ELSE (
  dir /S /B | findstr /V "node_modules" | findstr /V ".next" | findstr /V ".git" >> "%TREE_FILE%"
)

REM Check for 7-Zip or PowerShell for zipping
echo Creating zip package...

WHERE 7z >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
  REM Use 7-Zip if available (better)
  7z a -tzip "%OUTPUT_FILE%" src package.json tsconfig.json next.config.ts .env.local.template PROJECT_TREE.txt -xr!node_modules -xr!.next -xr!.git
) ELSE (
  REM Fall back to PowerShell
  powershell -Command "Compress-Archive -Path 'src','package.json','tsconfig.json','next.config.ts','.env.local.template','PROJECT_TREE.txt' -DestinationPath '%OUTPUT_FILE%' -Force"
)

echo.
echo Done! Package saved to:
echo   %OUTPUT_FILE%
echo.
echo Upload this zip at the start of your next Claude session.
echo.
pause
