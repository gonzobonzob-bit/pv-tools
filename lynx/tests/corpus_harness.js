
const fs=require('fs');
const html=fs.readFileSync(process.argv[2],'utf8');
const blocks=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
global.window={addEventListener(){},location:{href:''}};
global.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],
 createElement:()=>({style:{},classList:{add(){},remove(){}},appendChild(){},setAttribute(){}}),
 addEventListener(){},body:{appendChild(){}}};
global.navigator={userAgent:'node'};
for(const b of blocks){ try{ eval(b); }catch(e){} }
const LIMIT_RE=/cannot be checked|not testable|does not apply|No Grid trace in this export|could not be computed|could not run|Too Coarse|coverage is incomplete|is not available/i;
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
  }catch(e){ o.crash=String(e).slice(0,60); }
  console.log(JSON.stringify(o));
}
