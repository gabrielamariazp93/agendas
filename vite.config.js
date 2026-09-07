import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
    // Archivos sueltos que a veces terminan guardados en la raíz del repo (ej. scripts .py
    // abiertos en el IDE desde otra carpeta) no son parte de la app y, si el SO los tiene
    // bloqueados en el momento en que Vite arranca su watcher, tumban TODO el proceso de Vite
    // con un EBUSY sin capturar. Se ignoran explícitamente para que un archivo ajeno bloqueado
    // no vuelva a caerse el servidor de desarrollo entero.
    watch: {
      ignored: ['**/*.py'],
    },
  },
});
