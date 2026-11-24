import { defineConfig } from '@playwright/test'

const port = process.env.TOWN_TEST_PORT ?? '4187'
const baseURL = 'http://127.0.0.1:'+port

export default defineConfig({
  testDir:'tests',
  testMatch:'*.spec.js',
  timeout:300_000,
  fullyParallel:false,
  workers:1,
  use:{
    baseURL,
    browserName:'chromium',
    deviceScaleFactor:.55,
    actionTimeout:30_000,
    launchOptions:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}
  },
  webServer:{
    command:'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port '+port+' --strictPort --base /my-town/',
    url:baseURL+'/my-town/',
    reuseExistingServer:!process.env.CI,
    timeout:30_000
  }
})

