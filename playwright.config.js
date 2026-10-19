import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser', timeout:90000, workers:1,
  reporter:process.env.GITHUB_ACTIONS === 'true' ? [['list'],['github']] : 'list',
  use:{locale:'ja-JP',launchOptions:process.env.SANTA_BROWSER_EXECUTABLE?{executablePath:process.env.SANTA_BROWSER_EXECUTABLE}:{},baseURL:process.env.SANTA_E2E_URL || 'http://127.0.0.1:4191',browserName:'chromium',headless:true,trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:process.env.SANTA_E2E_URL ? undefined : {command:'npm run preview',url:'http://127.0.0.1:4191',env:{SANTA_PORT:'4191'},reuseExistingServer:false},
});
