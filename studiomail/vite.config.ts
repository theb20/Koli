import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Servi en sous-chemin de admin.skignas.com (voir README — plus de site
  // Firebase Hosting séparé) : seul le build de prod a besoin du préfixe,
  // le serveur de dev local reste à la racine pour ne rien changer au
  // confort de développement.
  base: command === 'build' ? '/studio-mail/' : '/',
  plugins: [react(), tailwindcss()],
  server: { port: 5177 },
  preview: { port: 5177 },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
}))
