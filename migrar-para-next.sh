#!/bin/bash
set -e

# 1. Cria novo projeto Next.js com TypeScript, Tailwind, src/ e alias @
echo "Criando novo projeto Next.js em webapp-next..."
npx create-next-app@latest webapp-next --typescript --eslint --tailwind --src-dir --import-alias "@/*" --no-interactive

# 2. Copia assets e dados
cp -r webapp/public webapp-next/public
cp webapp/public/lots_data.json webapp-next/public/lots_data.json

# 3. Copia o index principal para pages/index.tsx
cp webapp/src/index.tsx webapp-next/src/pages/index.tsx

# 4. Instala dependências extras
cd webapp-next
npm install @fortawesome/fontawesome-free

# 5. Pronto para rodar!
echo "\nMigração concluída! Entre na pasta webapp-next e rode:"
echo "  npm run dev"
