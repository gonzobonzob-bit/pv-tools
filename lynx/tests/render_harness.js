
// Render-path harness. The existing corpus harness returns null from
// getElementById, so every branch guarded by "if (el)" is SKIPPED — which is
// exactly how v1.30 and v1.31 shipped a ReferenceError that threw on the first
// real render while 40 files passed twice. This shim returns a STUB for every
// id the page uses, so those branches actually execute.
const fs=require('fs');
const html=fs.readFileSync(process.argv[2],'utf8');
const blocks=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const ids=[...new Set([...html.matchAll(/id="([a-zA-Z][\w-]*)"/g)].map(m=>m[1]))];
function stub(id){
  const e={ id, _html:'', _text:'', style:{}, dataset:{}, children:[],
    classList:{_s:new Set(),add(...c){c.forEach(x=>this._s.add(x));},
      remove(...c){c.forEach(x=>this._s.delete(x));},
      toggle(c){this._s.has(c)?this._s.delete(c):this._s.add(c);},
      contains(c){return this._s.has(c);}},
    appendChild(c){this.children.push(c); return c;},
    setAttribute(){}, removeAttribute(){}, getAttribute(){return null;},
    addEventListener(){}, removeEventListener(){}, remove(){},
    querySelector(){return stub('q');}, querySelectorAll(){return [];},
    scrollIntoView(){}, focus(){}, click(){}, getBoundingClientRect(){
      return {top:0,left:0,width:800,height:400,bottom:400,right:800};},
    getContext(){return {clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},
      fill(){},arc(){},fillRect(){},fillText(){},save(){},restore(){},setLineDash(){},
      closePath(){},measureText(){return {width:10};}};},
  };
  Object.defineProperty(e,'innerHTML',{get(){return e._html;},set(v){e._html=String(v);}});
  Object.defineProperty(e,'textContent',{get(){return e._text;},set(v){e._text=String(v);}});
  Object.defineProperty(e,'value',{get(){return '';},set(){}});
  return e;
}
const REG={}; ids.forEach(i=>REG[i]=stub(i));
global.window={addEventListener(){},location:{href:''},matchMedia:()=>({matches:false,addListener(){}}),
  requestAnimationFrame:(f)=>f(), devicePixelRatio:1, getComputedStyle:()=>({getPropertyValue:()=>''})};
global.document={
  getElementById:(id)=>REG[id]||null,
  querySelector:(s)=>{const m=/^#([\w-]+)$/.exec(s); return m?(REG[m[1]]||null):stub('qs');},
  querySelectorAll:()=>[],
  createElement:(t)=>stub('created-'+t),
  createElementNS:(ns,t)=>stub('created-'+t),
  addEventListener(){}, body:stub('body'), documentElement:stub('html'),
};
global.navigator={userAgent:'node'};
global.FileReader=function(){}; global.Blob=function(){}; global.URL={createObjectURL:()=>''};
let loadFailed=false;
for(const b of blocks){ try{ eval(b); }catch(e){ loadFailed=true; console.log(JSON.stringify({phase:'load',err:String(e).slice(0,140)})); } }

let crashed=false;
for(const f of process.argv.slice(3)){
  const o={file:f.split('/').pop()};
  try{
    const parsed=rowsFromCSV(fs.readFileSync(f,'utf8'));
    if(parsed.error){ o.parseError=parsed.error; console.log(JSON.stringify(o)); continue; }
    const report=runDiagnostic(parsed);
    // THE CALL THE OLD HARNESS NEVER MADE
    renderReport(report, parsed, o.file);
    o.rendered=true;
    o.banner=REG['status-headline']?REG['status-headline']._text:null;
    o.summary=REG['status-summary']?REG['status-summary']._text:null;
    o.cardsHtml=REG['detail-cards']?REG['detail-cards']._html.length:0;
    o.bannerClasses=REG['status-banner']?[...REG['status-banner'].classList._s]:null;
  }catch(ex){ o.renderCrash=String(ex).slice(0,180); }
  if(o.renderCrash) crashed=true;
  // Gate A, per LYNX_HANDOFF_PROTOCOL.md: renderCrash absent on every file, and
  // cardsHtml > 0 wherever a report was produced. Validated against the full
  // corpus before wiring this in -- 0 of 81 legitimately-rendered files carry
  // cardsHtml===0, so this does not introduce a new false-failure mode.
  if(o.rendered && !o.cardsHtml) { o.emptyCards=true; crashed=true; }
  console.log(JSON.stringify(o));
}
if(loadFailed||crashed) process.exit(1);
