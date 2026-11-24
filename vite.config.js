import { defineConfig } from 'vite'
export default defineConfig({
  base:'./',
  server:{
    proxy:{
      '/socket.io':{target:'http://127.0.0.1:3000',ws:true},
      '/game-config':'http://127.0.0.1:3000'
    }
  },
  build:{
    rollupOptions:{
      output:{
        manualChunks(id){
          if(id.endsWith('/three/build/three.core.js'))return 'three-core'
          if(id.endsWith('/three/build/three.module.js'))return 'three-renderer'
        }
      }
    }
  }
})
