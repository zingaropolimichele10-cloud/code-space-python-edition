import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { openBrowser } from './browser.mjs';
test('Da 2.3.1 a 2.3.2: cache reale, progresso conservato e avvio offline', async () => {
  const dir = await mkdtemp('/tmp/cs11-transition.');
  const extract = revision => {
    const manifest = JSON.parse(execFileSync('git', ['show', revision+':release-manifest.json']));
    const archive = execFileSync('git', ['archive', revision, '--', ...new Set([...manifest.runtime,'release-manifest.json','sw.js'])], {maxBuffer: 20000000});
    execFileSync('tar', ['-x','-C',dir], {input: archive});
  };
  extract('8a42325');
  const browser = await openBrowser('',{staticRoot:pathToFileURL(dir+'/')});
  const wait = async (evaluate, expression) => {
    for (let i=0;i<80;i++) {
      if (await evaluate(expression)) return;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    throw Error(expression);
  };
  const prefix='code-space:/code-space-python-edition/:';
  try {
    await wait(browser.evaluate,'!!navigator.serviceWorker.controller');
    assert.deepEqual(await browser.evaluate('caches.keys()'),[prefix+'2.3.1']);
    const original=await browser.evaluate(`(() => {
      const saved = { version: 3, completed: [1], best: 27 };
      localStorage.setItem('code-space:progress:v3', JSON.stringify(saved));
      return localStorage.getItem('code-space:progress:v3');
    })()`);
    extract('HEAD');
    await browser.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update()).then(()=>true)');
    await wait(browser.evaluate,'navigator.serviceWorker.getRegistration().then(r=>!!r.waiting)');
    const {targetId}=await browser.send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await browser.send('Target.attachToTarget',{targetId,flatten:true});
    const page=(method,params)=>browser.send(method,params,sessionId);
    await browser.send('Target.closeTarget',{targetId:browser.targetId});
    await page('Page.navigate',{url:browser.origin+'/release-test-probe'});
    const evaluate=async expression=>{
      const result=await page('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
      return result.result?.value;
    };
    await wait(evaluate,`globalThis.caches?.keys().then(k=>k.length===1 && k[0]===${JSON.stringify(prefix+'2.3.2')})`);
    await page('Page.navigate',{url:browser.origin+browser.prefix});
    await wait(evaluate,'!!navigator.serviceWorker?.controller && document.querySelector("#mission-total")?.textContent==="1 / 22"');
    assert.equal(await evaluate("localStorage.getItem('code-space:progress:v3')"),original);
    assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('code-space:progress:v3')).completed"),[1]);
    await page('Network.enable');
    await page('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
    await page('Page.reload');
    await wait(evaluate,'document.querySelector("#mission-total")?.textContent==="1 / 22"');
    await evaluate(`(() => {
      document.querySelector('[data-action=tutorial]').click();
      document.querySelector('#tutorial-panel [data-action=start]').click();
      document.querySelector('#flight-mission-options').click();
      document.querySelector('[data-local-add="3"]').click();
    })()`);
    assert.equal(await evaluate('document.querySelector("#viewport").dataset.state'), 'PLAYING');
    assert.equal(await evaluate('document.querySelector("#mission-available").textContent'), '13 / 22');
    assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('code-space:progress:v3')).completed"), [1]);
    console.log('2.3.1 → 2.3.2: vecchia cache eliminata, progresso conservato e riapertura offline.');
  } finally {await browser.close(); await rm(dir,{recursive:true,force:true});}
});
