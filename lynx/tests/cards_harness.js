
const fs=require('fs');
const html=fs.readFileSync(process.argv[2],'utf8');
const blocks=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
global.window={addEventListener(){},location:{href:''}};
global.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],
  createElement:()=>({style:{},classList:{add(){},remove(){}},appendChild(){},setAttribute(){}}),
  addEventListener(){},body:{appendChild(){}}};
global.navigator={userAgent:'node'};
// See corpus_harness.js for why only blocks 0-1 (where the diagnostic logic
// lives) count as fatal here -- later blocks hold real page-wiring code that
// cannot run under this harness's deliberately minimal DOM stub.
// Plain for-loop, not .forEach -- see corpus_harness.js for why: eval() inside
// a callback function scopes its declarations to that call, not to global.
let loadFailed=false;
for(let i=0;i<blocks.length;i++){ try{ eval(blocks[i]); }catch(e){ console.log(JSON.stringify({phase:'load',block:i,err:String(e).slice(0,180)})); if(i<2) loadFailed=true; } }
let crashed=false;
for(const f of process.argv.slice(3)){
  let o={file:f.split('/').pop()};
  const t0=Date.now();
  try{
    const p=rowsFromCSV(fs.readFileSync(f,'utf8'));
    if(p.error){ o.err=String(p.error).slice(0,60); console.log(JSON.stringify(o)); continue; }
    o.mode=p.mode; o.n=(p.points||[]).length;
    const res=runDiagnostic(p);
    o.status=res.status;
    const it=res.items||[];
    o.nItems=it.length;
    o.types=it.map(i=>i.type);
    o.heads=it.map(i=>String(i.headline||'').slice(0,80));
    const ts=(p.points||[]).map(q=>{const d=new Date(q.time);return isNaN(d)?null:d.getTime();}).filter(Boolean).sort((a,b)=>a-b);
    const g=[]; for(let i=1;i<ts.length;i++) g.push((ts[i]-ts[i-1])/60000);
    g.sort((a,b)=>a-b); o.medInt = g.length? g[Math.floor(g.length/2)] : null;
    const ct=it.find(i=>/step-change correlation|Sampling Too Coarse|correlation/i.test(i.headline||''));
    o.corrCard = ct? String(ct.headline).slice(0,72) : null;
    o.bleed = it.some(i=>/rises|tracks production|bleed|usage reading/i.test(i.headline||''));
    o.polar = it.some(i=>/polarity/i.test(String(i.recommendation||'')));
    o.ms=Date.now()-t0;
  }catch(e){ o.crash=String(e).slice(0,120); crashed=true; }
  console.log(JSON.stringify(o));
}
// CI signal: o.err (a deliberate, correct rejection e.g. wrong-export-type) is not
// a failure. Only an uncaught exception -- a real crash -- fails the job.
if(loadFailed||crashed) process.exit(1);
