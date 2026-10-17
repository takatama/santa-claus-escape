import {CONSENT_KEY} from '../../prototype/analytics.js';
import {STORAGE_KEY} from '../../prototype/full-game.js';
export async function tag(page,choice='granted',saved) {
  await page.route('**/',async route=>{const response=await route.fetch();const headers=response.headers();headers['content-security-policy']=headers['content-security-policy'].replace("script-src 'self'","script-src 'self' https://www.googletagmanager.com");await route.fulfill({response,headers});});
  await page.route('**/analytics-config.js',route=>route.fulfill({contentType:'text/javascript',body:`export const ANALYTICS_CONFIG={measurementId:'G-TEST123456',origin:location.origin,approved:true,debug:true};`}));
  await page.route('https://www.googletagmanager.com/**',route=>route.fulfill({contentType:'text/javascript',body:''}));
  await page.addInitScript(({choice,saved,consentKey,saveKey})=>{if(choice)localStorage.setItem(consentKey,choice);if(saved&&!localStorage.getItem(saveKey))localStorage.setItem(saveKey,JSON.stringify(saved));},{choice,saved,consentKey:CONSENT_KEY,saveKey:STORAGE_KEY});
}
