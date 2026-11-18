const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const sr=44100,n=sr*2,b=Buffer.alloc(44+n*2);
b.write('RIFF',0);b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);
for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/sr)*9000),44+2*i);
(async()=>{
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end(fs.readFileSync(path.join(root,'index.html')))});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage();page.setDefaultTimeout(180000);
 page.on('console',e=>console.log('browser',e.type(),e.text().slice(0,350)));
 page.on('pageerror',e=>console.log('pageerror',e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.locator('#file').setInputFiles({name:'ai-probe.wav',mimeType:'audio/wav',buffer:b});
 await page.locator('#editor').waitFor({state:'visible'});
 await page.locator('#aiSeparate').click();
 await page.waitForFunction(()=>/Separation complete|could not run/.test(document.querySelector('#aiStatus').textContent),null,{timeout:180000});
 const text=await page.locator('#aiStatus').innerText();console.log('AI_RESULT',text);
 if(!text.includes('Separation complete'))throw new Error(text);
 if(await page.locator('#aiPiano').isDisabled())throw new Error('Piano stem unavailable');
 console.log('PASS: real ONNX model imported, ran and produced stems');
}finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
