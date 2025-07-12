#!/bin/bash
# Quick fix for Expo connection issues

echo "🔧 Fixing Expo Connection Issues..."

# Clear all caches
echo "Clearing caches..."
rm -rf .expo .metro-cache node_modules/.cache ~/.expo

# Kill any hanging processes
pkill -f "expo|metro" || true

# Get local IP
LOCAL_IP=$(ip addr show eth0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1 | head -n1)
echo "Your local IP: $LOCAL_IP"

# Update .env with correct IP
echo "Updating .env..."
sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://$LOCAL_IP:8000|" .env

echo ""
echo "📱 Starting Expo with LAN mode..."
echo "Make sure your phone is on the same WiFi network!"
echo ""

# Start with LAN mode (more reliable than tunnel)
npx expo start --clear --lan

# If that fails, provide manual connection option
echo ""
echo "⚠️  If connection still fails:"
echo "1. In Expo Go app, tap 'Enter URL manually'"
echo "2. Enter: exp://$LOCAL_IP:8081"
echo ""