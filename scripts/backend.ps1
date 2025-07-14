# Nutrition AI Backend - Windows PowerShell Script
# Usage: .\backend.ps1

# Colors for output
$Host.UI.RawUI.ForegroundColor = "White"

function Write-Info { Write-Host "[INFO]" -ForegroundColor Green -NoNewline; Write-Host " $args" }
function Write-Error { Write-Host "[ERROR]" -ForegroundColor Red -NoNewline; Write-Host " $args" }
function Write-Warn { Write-Host "[WARN]" -ForegroundColor Yellow -NoNewline; Write-Host " $args" }
function Write-Success { Write-Host "[SUCCESS]" -ForegroundColor Cyan -NoNewline; Write-Host " $args" }

Write-Host "🍎 Nutrition AI Backend (Windows)" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Get project root
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

# Platform detection
$Platform = "windows"
Write-Info "Detected platform: $Platform"

# Get all available IPs
function Get-AllIPs {
    $ips = @("127.0.0.1")
    
    # Get all network adapters with IPv4 addresses
    $adapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.IPAddress -notlike "169.254.*" -and 
        $_.IPAddress -ne "127.0.0.1" -and
        $_.InterfaceAlias -notlike "*Loopback*"
    }
    
    foreach ($adapter in $adapters) {
        $ips += $adapter.IPAddress
    }
    
    # For WSL environments, try to get WSL IP
    $wslIP = (Get-NetIPAddress -InterfaceAlias "vEthernet (WSL)" -AddressFamily IPv4 -ErrorAction SilentlyContinue).IPAddress
    if ($wslIP) {
        $ips += $wslIP
    }
    
    return $ips | Select-Object -Unique
}

# Clean up existing processes
function Stop-ExistingProcesses {
    Write-Info "Stopping existing processes..."
    
    # Stop Django processes
    Get-Process -Name "python*" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*manage.py*"
    } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Kill port 8000
    $tcpConnections = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
    foreach ($conn in $tcpConnections) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    
    Start-Sleep -Seconds 1
}

# Check Python installation
function Test-Python {
    $pythonCmds = @("python", "python3", "py")
    
    foreach ($cmd in $pythonCmds) {
        if (Get-Command $cmd -ErrorAction SilentlyContinue) {
            return $cmd
        }
    }
    
    return $null
}

# Main execution
try {
    # Clean up first
    Stop-ExistingProcesses
    
    # Check Python
    $PythonCmd = Test-Python
    if (-not $PythonCmd) {
        Write-Error "Python not found!"
        Write-Error "Please install Python from: https://python.org/downloads/"
        Write-Error "Make sure to check 'Add Python to PATH' during installation"
        exit 1
    }
    
    Write-Info "Using Python: $PythonCmd"
    & $PythonCmd --version
    
    # Navigate to backend directory
    $BackendPath = Join-Path $ProjectRoot "backend"
    if (-not (Test-Path $BackendPath)) {
        Write-Error "Backend directory not found!"
        exit 1
    }
    
    Set-Location $BackendPath
    Write-Info "Changed to backend directory: $BackendPath"
    
    # Create virtual environment if needed
    $VenvPath = "venv"  # Relative to backend directory
    if (-not (Test-Path $VenvPath)) {
        Write-Info "Creating virtual environment..."
        & $PythonCmd -m venv venv
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to create virtual environment"
            exit 1
        }
    }
    
    # Activate virtual environment
    Write-Info "Activating virtual environment..."
    $ActivateScript = "venv\Scripts\Activate.ps1"  # Use relative path
    
    # Debug: Check what files exist
    if (Test-Path "venv") {
        Write-Debug "Found venv directory"
        if (Test-Path "venv\Scripts") {
            Write-Debug "Found venv\Scripts directory"
            if (Test-Path $ActivateScript) {
                Write-Debug "Found activation script at: $ActivateScript"
            }
        }
    }
    
    if (-not (Test-Path $ActivateScript)) {
        # Check if it's a Linux-style venv (bin instead of Scripts)
        if (Test-Path "venv\bin\activate") {
            Write-Error "This appears to be a Linux/WSL virtual environment!"
            Write-Info "Please delete it and let the script create a Windows venv"
            Write-Info "Run: Remove-Item -Recurse -Force venv"
            exit 1
        }
        
        # Only recreate if truly missing
        Write-Warn "Activation script not found, creating virtual environment..."
        Remove-Item -Path $VenvPath -Recurse -Force -ErrorAction SilentlyContinue
        & $PythonCmd -m venv venv
        Start-Sleep -Seconds 2
    }
    
    # Try to activate
    if (Test-Path $ActivateScript) {
        & $ActivateScript
    } else {
        Write-Error "Failed to create virtual environment!"
        Write-Info "Trying alternative method..."
        # Try using python directly from venv
        $VenvPython = Join-Path $VenvPath "Scripts\python.exe"
        if (Test-Path $VenvPython) {
            $env:VIRTUAL_ENV = $VenvPath
            $env:PATH = "$VenvPath\Scripts;$env:PATH"
            Write-Success "Virtual environment activated via PATH"
        } else {
            Write-Error "Virtual environment setup failed completely!"
            exit 1
        }
    }
    
    # Set Python command based on virtual environment
    $VenvPython = if ($env:VIRTUAL_ENV) {
        "python"
    } else {
        Join-Path $VenvPath "Scripts\python.exe"
    }
    
    # Quick dependency check
    $DjangoInstalled = & $VenvPython -m pip show Django 2>$null
    if (-not $DjangoInstalled) {
        Write-Info "Installing dependencies (first time setup)..."
        Write-Info "This may take a few minutes..."
        & $VenvPython -m pip install --upgrade pip setuptools wheel
        
        # Install requirements
        if (Test-Path "requirements.txt") {
            & $VenvPython -m pip install -r requirements.txt
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Failed to install dependencies!"
                Write-Info "Try running: pip install -r requirements.txt"
                exit 1
            }
        } else {
            Write-Error "requirements.txt not found!"
            exit 1
        }
    } else {
        Write-Success "✅ Dependencies already installed"
    }
    
    # Create .env if missing
    if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
        Write-Info "Creating .env from template..."
        Copy-Item ".env.example" ".env"
        Write-Warn "⚠️  Please update .env with your configuration"
    }
    
    # Run migrations
    Write-Info "Checking database migrations..."
    & $VenvPython manage.py migrate --noinput
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Some migrations failed, but continuing..."
    }
    
    # Create demo user
    Write-Info "Ensuring demo user exists..."
    & $VenvPython manage.py create_demo_user 2>$null
    
    # Get all available IPs
    Write-Info "Detecting network configuration..."
    $IPs = Get-AllIPs
    $PrimaryIP = if ($IPs.Count -gt 1) { $IPs[1] } else { "127.0.0.1" }
    
    # Display all access URLs
    Write-Host ""
    Write-Success "✅ Backend starting on port 8000"
    Write-Info "📱 Access URLs:"
    foreach ($ip in $IPs) {
        Write-Info "   http://${ip}:8000"
    }
    Write-Info "   Admin panel: http://127.0.0.1:8000/admin"
    Write-Host ""
    Write-Info "🔐 Demo credentials:"
    Write-Info "   Email: demo@nutritionai.com"
    Write-Info "   Password: demo123"
    Write-Host ""
    
    # Save IP for frontend
    $PrimaryIP | Out-File -FilePath "$ProjectRoot\.backend_ip" -Encoding UTF8
    
    # Start Django
    Write-Info "Starting Django development server..."
    Write-Info "Press Ctrl+C to stop"
    Write-Host ""
    
    & $VenvPython manage.py runserver 0.0.0.0:8000
}
catch {
    Write-Error "An error occurred: $_"
    exit 1
}
finally {
    # Cleanup on exit
    Stop-ExistingProcesses
    Remove-Item "$ProjectRoot\.backend_ip" -ErrorAction SilentlyContinue
}