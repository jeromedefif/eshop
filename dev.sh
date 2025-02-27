#!/bin/bash

# Odstranit staré buildy a cache
echo "🧹 Čištění starých buildů a cache..."
rm -rf .next
rm -rf .next-cache
rm -rf node_modules/.cache

# Nastavit proměnné prostředí pro optimální vývoj
export NODE_OPTIONS="--max_old_space_size=4096"
export NEXT_TELEMETRY_DISABLED=1
export NEXT_DISABLE_WEBPACK_CACHE=1

# Spustit vývojový server
echo "🚀 Spouštění vývojového serveru..."
npx next dev
