@echo off
echo ===============================================
echo Creating SQLite Database for School Schedule System
echo ===============================================

set DB_PATH=%~dp0school_schedule.db
set SQL_PATH=%~dp0init_database.sql

echo 🗃️ Database path: %DB_PATH%
echo 📄 SQL script: %SQL_PATH%

:: Check if sqlite3 is available
sqlite3 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: sqlite3 command not found!
    echo.
    echo Please install SQLite3 first:
    echo 1. Download from: https://www.sqlite.org/download.html
    echo 2. Download "sqlite-tools-win-x64.zip"
    echo 3. Extract and add to PATH
    echo 4. Or use: choco install sqlite
    echo.
    pause
    exit /b 1
)

:: Show sqlite3 version
echo ✅ SQLite3 version:
sqlite3 --version

echo.
echo 🚀 Creating database...

:: Create database from SQL script
sqlite3 "%DB_PATH%" < "%SQL_PATH%"

if %errorlevel% equ 0 (
    echo ✅ Database created successfully!
    echo.
    echo 📊 Database info:
    dir "%DB_PATH%" | find ".db"
    
    echo.
    echo 🔍 Verifying database contents:
    sqlite3 "%DB_PATH%" "SELECT 'Tables created: ' || COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%%';"
    sqlite3 "%DB_PATH%" "SELECT 'Admin users: ' || COUNT(*) FROM admin_users;"
    sqlite3 "%DB_PATH%" "SELECT 'Academic years: ' || COUNT(*) FROM academic_years;"
    sqlite3 "%DB_PATH%" "SELECT 'Periods: ' || COUNT(*) FROM periods;"
    
    echo.
    echo 🎉 Setup completed!
    echo 📍 Database location: %DB_PATH%
    echo 🔑 Default admin login: admin / admin123
    echo ⚠️  Please change the default password immediately!
) else (
    echo ❌ ERROR: Failed to create database
    echo Check the SQL script for syntax errors
)

echo.
pause
