#!/bin/bash

# Odstranit staré buildy a cache
echo "🧹 Čištění starých buildů a cache..."
rm -rf .next
rm -rf .next-cache
rm -rf node_modules/.cache

# Nastavit proměnné prostředí pro zvýšení paměti a vypnutí cache
export NODE_OPTIONS="--max_old_space_size=4096"
export NEXT_TELEMETRY_DISABLED=1
export NEXT_DISABLE_SOURCEMAPS=1

# Spustit prisma generate a build
echo "🔧 Generování Prisma client..."
npx prisma generate

echo "🏗️ Vytváření produkčního buildu..."
npx next build

# Kontrola, zda byl build úspěšný
if [ -d ".next" ]; then
  echo "✅ Build byl úspěšně vytvořen!"
  echo "Můžete spustit aplikaci pomocí: npm run start"
else
  echo "❌ Build selhal!"
fi
