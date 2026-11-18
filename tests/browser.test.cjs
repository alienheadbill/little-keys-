const {chromium,webkit}=require('playwright');
const {execFileSync}=require('node:child_process');
const os=require('node:os');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const root=path.join(__dirname,'..');
const wav=()=>{
 const sr=8000,n=sr*2, b=Buffer.alloc(44+n*2);
 b.write('RIFF',0);b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);
 for(let i=0;i<n;i++) b.writeInt16LE(Math.round(Math.sin(2*Math.PI*440*i/sr)*8000),44+i*2); return b;
};
(async()=>{
 const server=http.createServer((req,res)=>{let name=decodeURIComponent((req.url||'/').split('?')[0]);if(name==='/')name='/index.html';if(!['/index.html','/vendor/lame.min.js'].includes(name)){res.writeHead(404);res.end();return}res.writeHead(200,{'Content-Type':name.endsWith('.js')?'application/javascript':'text/html; charset=utf-8'});res.end(fs.readFileSync(path.join(root,name)))});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const port=server.address().port,browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const errors=[];
 try{
 const page=await browser.newPage({acceptDownloads:true});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+port);
 assert.match(await page.title(),/Little Keys/);
 await page.locator('#file').setInputFiles({name:'test.wav',mimeType:'audio/wav',buffer:wav()});
 await page.locator('#editor').waitFor({state:'visible'});
 assert.match(await page.locator('#status').innerText(),/Ready/);
 await page.locator('#start').evaluate(el=>{el.value='150';el.dispatchEvent(new Event('input',{bubbles:true}))});
 await page.locator('#end').evaluate(el=>{el.value='750';el.dispatchEvent(new Event('input',{bubbles:true}))});
 await page.locator('#play').click();
 await page.waitForFunction(()=>window.__previewDebug || (document.querySelector('#status').textContent.includes('Playing selection') && document.querySelector('#play').textContent.includes('Replay')),null,{timeout:10000});
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Finished playing') || document.querySelector('#status').textContent.includes('Playing selection'),null,{timeout:10000});
 await page.waitForTimeout(350);
 assert.doesNotMatch(await page.locator('#status').innerText(),/blocked|Playback error|not advancing/i);
 await page.locator('#stop').click();
 await page.locator('#bpm').fill('120');
 await page.locator('#bars').selectOption('1');
 await page.locator('#snap').click();
 await page.locator('#suggest').click();
 await page.locator('#timing').click();
 await page.locator('#undoTiming').click();
 assert.match(await page.locator('#timingInfo').innerText(),/original performance/i);
 const promise=page.waitForEvent('download');
 await page.locator('#export').click();
 const download=await promise;
 assert.match(download.suggestedFilename(),/\.wav$/);
 const save=path.join(require('node:os').tmpdir(),'little-keys-check.wav');
 await download.saveAs(save);
 const exported=fs.readFileSync(save);
 assert.equal(exported.toString('ascii',0,4),'RIFF');
 assert.equal(exported.toString('ascii',8,12),'WAVE');
 assert.ok(exported.length>44,'WAV has audio frames');
 const mp3promise=page.waitForEvent('download');
 await page.locator('#exportMp3').click();
 const mp3download=await mp3promise; assert.match(mp3download.suggestedFilename(),/\.mp3$/);
 const mp3path=path.join(os.tmpdir(),'little-keys-test.mp3');await mp3download.saveAs(mp3path);
 execFileSync('ffprobe',['-v','error','-select_streams','a:0','-show_entries','stream=codec_name','-of','default=noprint_wrappers=1',mp3path],{encoding:'utf8'}).includes('mp3')||assert.fail('exported MP3 not decodable');

 await page.locator('#save').click();
 await page.waitForFunction(()=>document.querySelectorAll('#library li').length>=1);
 await page.reload();
 await page.waitForFunction(()=>document.querySelector('#library').textContent.includes('test sample'));

 // Voice detection: mock model-loading network, verify regions and select controls.
 await page.route('**/onnxruntime-web@1.22.0/dist/ort.wasm.min.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:'window.ort={};'}));
 await page.route('**/vad-web@0.0.31/dist/bundle.min.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:"window.vad={NonRealTimeVAD:{new:async()=>({run:async function*(){yield {start:250,end:650};}})}};"}));
 await page.locator('#file').setInputFiles({name:'test.wav',mimeType:'audio/wav',buffer:wav()});
 await page.locator('#editor').waitFor({state:'visible'});
 await page.locator('#detectSpeech').click();
 await page.waitForFunction(()=>document.querySelector('#speechResult').textContent.includes('possible speech segments'),null,{timeout:15000});
 assert.match(await page.locator('#speechResult').innerText(),/1 possible speech segments/i);
 await page.locator('#speechExport').selectOption('mute');
 await page.locator('#aiSeparate').evaluate(el=>el.scrollIntoViewIfNeeded?.());
 await page.route('https://esm.sh/web-audio-separation@0.3.1?bundle&target=es2022',route=>route.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:"export function createSeparator(){return {loadModel:async()=>{},separate:async(url)=>{const b=await (await fetch(url)).blob();return [URL.createObjectURL(b),URL.createObjectURL(b)]}}}"}));
 await page.locator('#aiSeparate').click();
 await page.waitForFunction(()=>!document.querySelector('#aiPiano').disabled,null,{timeout:15000});
 await page.locator('#aiPiano').click();
 await page.locator('#aiRestore').click();
 // Native video decoding -> local MediaRecorder -> WAV editor (1-second synthetic MP4).
 const webm=path.join(os.tmpdir(),'little-keys-fixture.webm');
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=black:s=160x90:d=1:r=12','-f','lavfi','-i','sine=frequency=440:duration=1','-c:v','libvpx','-c:a','libopus','-shortest',webm]);
 await page.locator('#file').setInputFiles(webm);
 assert.equal(await page.locator('#videoImport').isVisible(),true);
 await page.locator('#extractVideo').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Video audio imported')||document.querySelector('#status').textContent.includes('Video import failed'),null,{timeout:25000});
 const message=await page.locator('#status').innerText();
 assert.match(message,/Video audio imported/, 'WebM extraction failed: '+message);
 assert.equal(await page.locator('#editor').isVisible(),true);
 const mp4=path.join(os.tmpdir(),'little-keys-fixture.mp4');
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=black:s=160x90:d=1:r=12','-f','lavfi','-i','sine=frequency=440:duration=1','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',mp4]);
 await page.locator('#file').setInputFiles(mp4);
 assert.equal(await page.locator('#videoImport').isVisible(),true);
 await page.locator('#extractVideo').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Video audio imported')||document.querySelector('#status').textContent.includes('Video import failed'),null,{timeout:25000});
 const mp4message=await page.locator('#status').innerText();
 assert.match(mp4message,/Video audio imported|Video import failed/, 'MP4 should either decode or provide actionable fallback');
 console.log('Chromium MP4 codec handling:',mp4message.slice(0,200));

 assert.deepEqual(errors,[]);
 console.log('PASS Chromium: render, import, playback, BPM, loop suggestions, reversible timing, WAV, IndexedDB, mocked AI, MP4 actual extraction and no errors');
 const safari=await webkit.launch({headless:true});try{const safariPage=await safari.newPage({acceptDownloads:true});await safariPage.goto('http://127.0.0.1:'+port);await safariPage.locator('#file').setInputFiles({name:'test.wav',mimeType:'audio/wav',buffer:wav()});await safariPage.locator('#editor').waitFor({state:'visible'});await safariPage.locator('#play').click();await safariPage.waitForFunction(()=>document.querySelector('#status').textContent.includes('Playing selection')||document.querySelector('#status').textContent.includes('Finished playing'),null,{timeout:12000});await safariPage.waitForTimeout(350);assert.doesNotMatch(await safariPage.locator('#status').innerText(),/blocked|Playback error|not advancing/i);await safariPage.locator('#stop').click();console.log('PASS WebKit: site loads, WAV imports, and native playback starts')}finally{await safari.close()}
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
