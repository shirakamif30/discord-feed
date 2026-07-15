#!/bin/bash
# Install system dependencies for better-sqlite3
# Pterodactyl runs this during the "Install" phase

echo "=== Discord Feed Bot — Installer ==="

# Try to install libstdc++6 if missing
if ! ldconfig -p 2>/dev/null | grep -q "libstdc++.so.6"; then
    echo "Installing libstdc++6..."
    if command -v apt-get &> /dev/null; then
        apt-get update -qq && apt-get install -y -qq libstdc++6 2>/dev/null
    elif command -v apk &> /dev/null; then
        apk add --no-cache libstdc++ 2>/dev/null
    elif command -v yum &> /dev/null; then
        yum install -y libstdc++ 2>/dev/null
    fi
fi

echo "=== Installing Node.js dependencies ==="
npm install --production

echo "=== Setup complete! ==="
