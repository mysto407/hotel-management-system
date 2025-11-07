// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import tailwindcss from '@tailwindcss/vite' // REMOVE THIS LINE
import path from 'path'

export default defineConfig({
    plugins: [
        react(),
        // tailwindcss(), // REMOVE THIS LINE
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
})