
const fs=require('fs');
const html=fs.readFileSync(process.argv[2],'utf8');
const blocks=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
global.window={addEventListener(){},location:{href:''}};
global.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],
 createElement:()=>({style:{},classList:{add(){},remove(){}},appendChild(){},setAttribute(){}}),
 addEventListener(){},body:{appendChild(){}}};
global.navigator={userAgent:'node'};
// This harness's DOM stub is deliberately minimal (getElementById always returns
// null) because it only needs rowsFromCSV/runDiagnostic, which load in the first
// two <script> blocks. Two LATER blocks hold real page-wiring code (file-input
// and other event listeners) that throws under a stub this thin on every run,
// on purpose -- that is not something this harness can evaluate. Load errors are
// still printed for visibility, but only a failure in the first two blocks (where
// the diagnostic logic actually lives) is treated as fatal.
// A plain for-loop, not .forEach: eval() must stay at top-level scope, not
// inside a callback function, or the function/var declarations it creates
// (rowsFromCSV, runDiagnostic...) are scoped to that callback invocation and
// vanish immediately instead of becoming global. Cost 82 false "not defined"
// crashes to relearn -- caught only because output was diffed against a
// pre-edit baseline before trusting the exit code.
let loadFailed=false;
for(let i=0;i<blocks.length;i++){ try{ eval(blocks[i]); }catch(e){ console.log(JSON.stringify({phase:'load',block:i,err:String(e).slice(0,180)})); if(i<2) loadFailed=true; } }
const LIMIT_RE=/cannot be checked|not testable|does not apply|No Grid trace in this export|could not be computed|could not run|Too Coarse|coverage is incomplete|is not available/i;
let crashed=false;
for(const f of process.argv.slice(3)){
  const o={file:f.split('/').pop()};
  try{
    const p=rowsFromCSV(fs.readFileSync(f,'utf8'));
    if(p.error){ console.log(JSON.stringify(o)); continue; }
    const res=runDiagnostic(p); const it=res.items||[];
    o.mode=p.mode; o.status=res.status;
    o.issue=it.filter(i=>i.type==='issue').length;
    o.info=it.filter(i=>i.type==='info').length;
    o.conf=it.filter(i=>i.type==='confirmed').length;
    o.limits=it.filter(i=>i.type==='info'&&LIMIT_RE.test(String(i.headline||''))).length;
    o.visible_before=o.issue+o.info;
    o.visible_after=o.issue+(o.info-o.limits);
  }catch(e){ o.crash=String(e).slice(0,60); crashed=true; }
  console.log(JSON.stringify(o));
}
// CI signal: parsed.error (a deliberate, correct rejection e.g. wrong-export-type)
// is not a failure. Only an uncaught exception -- a real crash -- fails the job.
if(loadFailed||crashed) process.exit(1);
