(function(){
'use strict';
var L=window.LEVEL;
var NEED=50,COUNT=4,TOTAL=NEED*COUNT;
var PKEY='aimbc-prefs-v1';
var NAMES=L.missions.map(function(m){return m.name});
var viewAll={};
var root=document.documentElement;
var CHECK='<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function lsGet(k){try{return window.localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{window.localStorage.setItem(k,v)}catch(e){}}
function lsDel(k){try{window.localStorage.removeItem(k)}catch(e){}}

/* ---------- progress store: one record for the whole course, shared by all five level pages ----------
   Key aimbc-course-v3 = {v:3, last:{level,t}, levels:{ "1":{got,cur,step,seen,ex,t}, ... }}
   Older per-level keys (aimbc-levelN-v2 / -v1) are imported once and left in place as a backup. */
var STORE='aimbc-course-v3',LEVELS=5,CORRUPT='aimbc-course-v3-corrupt';
var storageOK=true;
var state={got:{},cur:0,step:{},seen:{},ex:{}};
var hadSaved=false,frozen=false;
function cleanLevel(p){
  var o={got:{},cur:0,step:{},seen:{},ex:{},t:0};
  if(!p||typeof p!=='object')return o;
  if(p.got&&typeof p.got==='object'){for(var k in p.got){var v=p.got[k];if(/^m[1-4]:/.test(k)&&typeof v==='number'&&v>0&&v<=NEED)o.got[k]=v}}
  o.cur=clamp(p.cur|0,0,COUNT-1);
  if(p.step&&typeof p.step==='object'){for(var i=0;i<COUNT;i++){if(typeof p.step[i]==='number')o.step[i]=clamp(p.step[i]|0,0,3)}}
  if(p.seen&&typeof p.seen==='object'){for(var s in p.seen){if(/^[0-3]:[0-3]$/.test(s))o.seen[s]=1}}
  if(p.ex&&typeof p.ex==='object'){for(var e in p.ex){if(/^[A-Za-z0-9_.:\-]{1,80}$/.test(e)&&p.ex[e]!==undefined)o.ex[e]=p.ex[e]}}
  o.t=typeof p.t==='number'?p.t:0;
  return o;
}
function hasProgress(o){return Object.keys(o.got).length>0||o.cur>0||Object.keys(o.step).some(function(k){return o.step[k]>0})||Object.keys(o.seen).length>1||Object.keys(o.ex).length>0}
function readStore(){
  var raw=lsGet(STORE),st={v:3,last:null,levels:{}};
  if(raw){
    try{
      var p=JSON.parse(raw);
      if(p&&typeof p==='object'){
        if(p.levels&&typeof p.levels==='object'){for(var n=1;n<=LEVELS;n++){if(p.levels[n])st.levels[n]=cleanLevel(p.levels[n])}}
        if(p.last&&typeof p.last.level==='number')st.last={level:clamp(p.last.level|0,1,LEVELS),t:p.last.t||0};
      }
    }catch(e){lsSet(CORRUPT,raw)}
  }
  for(var m=1;m<=LEVELS;m++){
    if(!st.levels[m]){
      var old=lsGet('aimbc-level'+m+'-v2')||lsGet('aimbc-level'+m+'-v1');
      if(old){try{var q=cleanLevel(JSON.parse(old));if(hasProgress(q))st.levels[m]=q}catch(e){}}
    }
  }
  return st;
}
function writeStore(st){
  try{window.localStorage.setItem(STORE,JSON.stringify(st));return true}catch(e){storageOK=false;return false}
}
(function(){
  try{window.localStorage.setItem('aimbc-probe','1');window.localStorage.removeItem('aimbc-probe')}catch(e){storageOK=false}
  var st=readStore(),mine=st.levels[L.level];
  if(mine&&hasProgress(mine)){
    hadSaved=true;
    state.got=mine.got;state.cur=mine.cur;state.step=mine.step;state.seen=mine.seen;state.ex=mine.ex;
  }
  /* write the migrated record right away so every level page sees the same data */
  if(storageOK&&Object.keys(st.levels).length)writeStore(st);
})();
/* save merges with whatever is stored now, so a stale tab or a default value can never wipe saved progress */
function save(quiet){
  if(frozen)return;
  var st=readStore(),prev=st.levels[L.level]||cleanLevel(null),g={},k;
  for(k in prev.got)g[k]=prev.got[k];
  for(k in state.got)g[k]=Math.max(g[k]||0,state.got[k]);
  var seen={};for(k in prev.seen)seen[k]=1;for(k in state.seen)seen[k]=1;
  var ex={};for(k in prev.ex)ex[k]=prev.ex[k];for(k in state.ex)ex[k]=state.ex[k];
  st.levels[L.level]={got:g,cur:state.cur,step:state.step,seen:seen,ex:ex,t:Date.now()};
  if(!quiet||!st.last)st.last={level:L.level,t:Date.now()};
  writeStore(st);
}
function courseSummary(){
  var st=readStore(),out=[];
  for(var n=1;n<=LEVELS;n++){
    var lv=n===L.level?{got:state.got}:(st.levels[n]||{got:{}}),xp=0,done=0,per={};
    for(var k in lv.got){xp+=lv.got[k];var m=k.charAt(1);per[m]=(per[m]||0)+lv.got[k]}
    for(var m2 in per){if(per[m2]>=NEED)done++}
    out.push({n:n,xp:xp,done:done});
  }
  return {levels:out,last:st.last};
}
function totalXp(){var t=0;for(var k in state.got)t+=state.got[k];return t}
function mxp(i){var t=0;for(var k in state.got){if(k.indexOf('m'+i+':')===0)t+=state.got[k]}return t}
function has(k){return !!state.got[k]}

/* ---------- exercise state: levels register what to save; the engine saves it ----------
   persist(id, {get:function(){return jsonValue}, set:function(value){...apply it...}})
   get/set must be pure state, no awards. The engine restores once on registration and saves after
   every click, input, change, and when the page is hidden. Ids start with "mN." for mission N. */
var reg={},flushT=null,restoring=false;
function persist(id,h){
  if(!/^m[1-4]\.[A-Za-z0-9_.\-]{1,60}$/.test(id)||!h||typeof h.get!=='function'||typeof h.set!=='function')return;
  var e={get:h.get,set:h.set,broken:false,last:null};reg[id]=e;
  if(Object.prototype.hasOwnProperty.call(state.ex,id)){
    restoring=true;
    try{h.set(JSON.parse(JSON.stringify(state.ex[id])))}catch(err){e.broken=true}
    restoring=false;
  }
  try{var j=JSON.stringify(h.get());e.last=j===undefined?null:j}catch(err2){e.broken=true}
}
function flush(){
  clearTimeout(flushT);flushT=null;
  var changed=false;
  for(var id in reg){
    var e=reg[id];if(e.broken)continue;
    var j;try{j=JSON.stringify(e.get())}catch(x){continue}
    if(j===undefined||j===e.last)continue;
    e.last=j;state.ex[id]=JSON.parse(j);changed=true;
  }
  if(changed)save();
}
function schedule(){if(frozen)return;clearTimeout(flushT);flushT=setTimeout(flush,150)}
function clearEx(prefix){
  Object.keys(state.ex).forEach(function(k){if(k.indexOf(prefix)===0)delete state.ex[k]});
}
/* every plain form field in a mission is saved automatically; levels only register custom state */
function autoFields(){
  articles.forEach(function(a,i){
    var n=i+1,idx=0;
    $$('input,textarea,select',a).forEach(function(f){
      var t=(f.type||'').toLowerCase();
      if(t==='button'||t==='submit'||t==='reset'||t==='hidden'||t==='file')return;
      var base=f.id?f.id.replace(/[^A-Za-z0-9_\-]/g,'_'):('i'+idx);idx++;
      var id='m'+n+'.f_'+base.slice(0,50),box=(t==='checkbox'||t==='radio');
      persist(id,{
        get:function(){return box?!!f.checked:f.value},
        set:function(v){
          if(box){f.checked=!!v}else if(typeof v==='string'){f.value=v}
          f.dispatchEvent(new Event('input',{bubbles:true}));f.dispatchEvent(new Event('change',{bubbles:true}));
        }
      });
    });
  });
}

/* ---------- preferences (one record shared by every level page of this course) ---------- */
var DEF={theme:'system',text:'normal',motion:null,calm:false,focus:false,steps:true,hints:true,sound:false};
var prefs={};for(var dk in DEF)prefs[dk]=DEF[dk];
(function(){
  var raw=lsGet(PKEY);
  if(raw){
    try{
      var p=JSON.parse(raw);
      if(p&&typeof p==='object'){
        if(/^(system|light|dark)$/.test(p.theme))prefs.theme=p.theme;
        if(/^(normal|large)$/.test(p.text))prefs.text=p.text;
        if(p.motion==='reduce'||p.motion==='allow')prefs.motion=p.motion;
        ['calm','focus','steps','hints','sound'].forEach(function(k){if(typeof p[k]==='boolean')prefs[k]=p[k]});
      }
    }catch(e){}
  }
})();
function savePrefs(){lsSet(PKEY,JSON.stringify(prefs))}
var osReduce=false;
try{osReduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)}catch(e){}
function motionReduced(){return prefs.motion===null?osReduce:prefs.motion==='reduce'}
function oneStep(){return prefs.focus||prefs.steps}
var origTheme=root.getAttribute('data-theme'),themeForced=false;
function applyPrefs(){
  if(prefs.theme==='system'){
    if(themeForced){if(origTheme===null)root.removeAttribute('data-theme');else root.setAttribute('data-theme',origTheme);themeForced=false}
  }else{root.setAttribute('data-theme',prefs.theme);themeForced=true}
  root.setAttribute('data-text',prefs.text);
  root.setAttribute('data-motion',motionReduced()?'reduce':'allow');
  root.setAttribute('data-calm',prefs.calm?'on':'off');
  root.setAttribute('data-focus',prefs.focus?'on':'off');
  root.setAttribute('data-steps',oneStep()?'one':'all');
  $$('input[name="pf-theme"]').forEach(function(r){r.checked=(r.value===prefs.theme)});
  $$('input[name="pf-text"]').forEach(function(r){r.checked=(r.value===prefs.text)});
  var set=function(id,v,dis){var c=$('#'+id);if(c){c.checked=v;c.disabled=!!dis}};
  set('pf-focus',prefs.focus);
  set('pf-steps',oneStep(),prefs.focus);
  set('pf-hints',prefs.hints);
  set('pf-motion',motionReduced());
  set('pf-calm',prefs.calm);
  set('pf-sound',prefs.sound);
}

/* ---------- announcements, toast, sound ---------- */
var liveEl=$('#live'),toastEl=$('#toast'),toastT,flip=false;
function announce(msg){flip=!flip;liveEl.textContent=msg+(flip?' ':'')}
function toast(msg){
  announce(msg);
  if(prefs.calm)return;
  toastEl.textContent=msg;toastEl.classList.add('show');
  clearTimeout(toastT);toastT=setTimeout(function(){toastEl.classList.remove('show')},1600);
}
var actx=null;
function tone(f,t0,d,v){
  var o=actx.createOscillator(),g=actx.createGain(),n=actx.currentTime;
  o.type='sine';o.frequency.value=f;
  g.gain.setValueAtTime(0.0001,n+t0);g.gain.exponentialRampToValueAtTime(v,n+t0+0.02);g.gain.exponentialRampToValueAtTime(0.0001,n+t0+d);
  o.connect(g);g.connect(actx.destination);o.start(n+t0);o.stop(n+t0+d+0.05);
}
function chime(kind){
  if(!prefs.sound)return;
  try{
    var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    actx=actx||new AC();if(actx.state==='suspended')actx.resume();
    if(kind==='done'){tone(523,0,.16,.05);tone(784,.14,.24,.05)}else{tone(660,0,.14,.04)}
  }catch(e){}
}

/* ---------- elements ---------- */
var articles=$$('.mission'),nodes=$$('.node');
var xpEl=$('#xp'),ctxEl=$('#ctxbar'),resumeEl=$('#resume'),resumeText=$('#resumeText'),resumeBtn=$('#resumeBtn');
var card=$('#levelcard'),stampEl=$('#stamp'),levelSub=$('#levelsub');
function stepsOf(a){return $$('.mstep',a)}
function stepName(s){var h=$('h3.label',s);return h?h.textContent:'Step'}

/* ---------- views ---------- */
function headerH(){var t=$('#top');return t?t.offsetHeight:0}
function scrollToEl(e){
  if(!e)return;
  var y=e.getBoundingClientRect().top+window.pageYOffset-headerH()-12;
  try{window.scrollTo({top:Math.max(0,y),behavior:motionReduced()?'auto':'smooth'})}catch(x){window.scrollTo(0,Math.max(0,y))}
}
function renderCtx(){
  var i=state.cur,k=state.step[i]||0,secs=stepsOf(articles[i]);
  ctxEl.textContent='';
  var b=el('b',null,'Mission '+(i+1)+' of '+COUNT);
  ctxEl.appendChild(b);
  var cn=el('span','cn',' · '+NAMES[i]);
  ctxEl.appendChild(cn);
  ctxEl.appendChild(document.createTextNode(' · '+(secs[k]?stepName(secs[k]):'')));
}
function show(i,k,o){
  o=o||{};
  i=clamp(i,0,COUNT-1);
  var secs=stepsOf(articles[i]);k=clamp(k,0,secs.length-1);
  state.cur=i;state.step[i]=k;state.seen[i+':'+k]=1;save(!!o.init);
  articles.forEach(function(a,x){a.hidden=(x!==i)});
  nodes.forEach(function(n,x){n.setAttribute('aria-current',x===i?'true':'false')});
  var one=oneStep()&&!viewAll[i];
  articles[i].classList.toggle('viewing-all',oneStep()&&!!viewAll[i]);
  var va=$('.viewall',articles[i]);
  if(va){va.setAttribute('aria-pressed',viewAll[i]?'true':'false');va.textContent=viewAll[i]?'Back to one step at a time':'Show the whole mission'}
  secs.forEach(function(s,x){s.hidden=(one&&x!==k)});
  $$('.stepbtn',articles[i]).forEach(function(b,x){
    if(x===k)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');
    b.classList.toggle('seen',!!state.seen[i+':'+x]);
  });
  renderCtx();
  if(window.__resetLabels)window.__resetLabels();
  if(o.focus){
    var t=(o.focus==='mission')?$('h2',articles[i]):$('h3.label',secs[k]);
    if(t)t.focus({preventScroll:true});
  }
  if(o.scroll==='layout')scrollToEl($('.layout'));
  else if(o.scroll==='steps')scrollToEl($('.mtabs',articles[i]));
  else if(o.scroll==='section')scrollToEl($('h3.label',secs[k]));
  if(o.say)announce('Mission '+(i+1)+', step '+(k+1)+' of '+secs.length+': '+stepName(secs[k]));
}
function hideResume(){if(resumeEl)resumeEl.hidden=true}

/* ---------- render progress ---------- */
function renderHud(){
  var t=totalXp();
  xpEl.textContent='';
  xpEl.appendChild(el('b',null,String(t)));
  xpEl.appendChild(document.createTextNode(' / '+TOTAL+' XP'));
  xpEl.setAttribute('aria-label','Level progress: '+t+' of '+TOTAL+' XP');
  for(var i=1;i<=COUNT;i++){
    var x=mxp(i),done=x>=NEED,started=x>0,n=nodes[i-1],a=articles[i-1];
    n.classList.toggle('done',done);
    var ni=$('.ni',n);if(done)ni.innerHTML=CHECK;else ni.textContent=String(i);
    var status=done?'Done':(started?'In progress, '+x+' of '+NEED+' XP':'Not started');
    $('.ns',n).textContent=status;
    $('.nshort',n).textContent=done?'Done':x+'/'+NEED;
    var ms=$('.mstate',a);
    ms.className='mstate'+(done?' is-done':'');
    ms.innerHTML='';
    if(done){ms.insertAdjacentHTML('beforeend',CHECK);ms.appendChild(document.createTextNode('Complete'))}
    else ms.textContent=started?'In progress':'Not started';
    var pg=$('.mprog',a),bar=$('.bar-track',a);
    pg.classList.toggle('is-done',done);
    $('i',bar).style.width=Math.min(100,(x/NEED)*100)+'%';
    bar.setAttribute('aria-valuenow',String(Math.min(x,NEED)));
    $('.mprogtxt',a).textContent=Math.min(x,NEED)+' / '+NEED+' XP';
    $('.mdone',a).hidden=!done;
  }
  var show4=mxp(COUNT)>=NEED,wasHidden=card.hidden;
  card.hidden=!show4;
  if(show4){
    var full=t>=TOTAL;
    stampEl.innerHTML='';
    if(full)stampEl.insertAdjacentHTML('beforeend',CHECK);
    stampEl.appendChild(document.createTextNode(full?'Level complete':'Almost there'));
    stampEl.classList.toggle('pending',!full);
    levelSub.textContent=full?t+' of '+TOTAL+' XP. '+L.name+' cleared.':t+' of '+TOTAL+' XP. A mission in the list is not marked Done yet. Open it to finish the level.';
    if(wasHidden){stampEl.style.animation='none';void stampEl.offsetWidth;stampEl.style.animation=''}
  }
}
function award(key,pts){
  if(state.got[key]||restoring)return;
  var m=parseInt(key.charAt(1),10),before=mxp(m);
  state.got[key]=pts;save();hideResume();renderHud();renderCourse();
  if(before<NEED&&mxp(m)>=NEED){toast('Mission '+m+' complete');chime('done')}
  else{toast('+'+pts+' XP');chime('xp')}
}

/* ---------- quiz helper ----------
   items: [{q, o:[...], c:correctIndex, xp, why, hint}]  XP keys: mk+':q'+index */
function makeQuiz(host,mk,items){
  items.forEach(function(it,qi){
    var key=mk+':q'+qi;
    var fs=el('fieldset','q');fs.appendChild(el('legend',null,it.q));
    var list=el('div','qopts');var msg=el('p','why');msg.setAttribute('aria-live','polite');
    var hb=el('button','btn quiet hintbtn','Show a hint');hb.type='button';hb.hidden=true;
    hb.addEventListener('click',function(){msg.textContent='Hint: '+it.hint;hb.hidden=true});
    var btns=it.o.map(function(t,oi){
      var b=el('button','choice',t);b.type='button';
      b.addEventListener('click',function(){pick(oi)});
      list.appendChild(b);return b;
    });
    function solve(fresh){
      btns.forEach(function(b,k){b.disabled=true;if(k===it.c)b.classList.add('ok');else b.classList.add('dim')});
      msg.className='why good';msg.textContent='Right. '+it.why;hb.hidden=true;
      if(fresh)award(key,it.xp);
    }
    function pick(oi){
      if(oi===it.c){solve(true);return}
      btns[oi].classList.add('no');btns[oi].disabled=true;msg.className='why bad';
      if(prefs.hints){msg.textContent='Not quite. '+it.hint;hb.hidden=true}
      else{msg.textContent='Not quite. Try another answer.';hb.hidden=false}
    }
    if(state.got[key])solve(false);
    fs.appendChild(list);fs.appendChild(msg);fs.appendChild(hb);host.appendChild(fs);
  });
}

/* ---------- copy helper ----------
   cb(true) when the text reached the clipboard, cb(false) when it could only be selected. */
function copyText(text,selEl,cb){
  function fallback(){
    var sel=false,ok=false;
    try{var r=document.createRange();r.selectNodeContents(selEl);var s=window.getSelection();s.removeAllRanges();s.addRange(r);sel=true}catch(e){}
    try{ok=document.execCommand('copy')}catch(e){}
    cb(!!(ok&&sel));
  }
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){cb(true)},fallback);
  }else{fallback()}
}

/* ---------- build the step tabs and step navigation ---------- */
function buildSteps(){
  articles.forEach(function(a,i){
    var secs=stepsOf(a),nav=$('.mtabs',a),ol=el('ol');
    secs.forEach(function(s,k){
      var li=el('li'),b=el('button','stepbtn');b.type='button';
      var sn=el('span','sn',String(k+1));sn.setAttribute('aria-hidden','true');
      var tx=el('span',null,stepName(s));
      if(k===secs.length-1){tx.appendChild(el('small',null,'Optional'))}
      b.appendChild(sn);b.appendChild(tx);
      b.addEventListener('click',function(){hideResume();show(i,k,{focus:'step',scroll:(oneStep()&&!viewAll[i])?'steps':'section',say:true})});
      li.appendChild(b);ol.appendChild(li);
    });
    nav.appendChild(ol);
    var vb=el('button','btn quiet viewall','Show the whole mission');vb.type='button';vb.setAttribute('aria-pressed','false');
    vb.addEventListener('click',function(){viewAll[i]=!viewAll[i];show(i,state.step[i]||0,{});announce(viewAll[i]?'Showing every step of this mission':'Showing one step at a time')});
    nav.appendChild(vb);
    var lines=['Finished the exercise? Next, see why it worked.','Next, check what stuck.','Next, go deeper if you like, or move on.',i<COUNT-1?'Next, start the next mission.':'That is the last mission in this level.'];
    secs.forEach(function(s,k){
      var sn=el('div','stepnav'),info=el('p','nextline',lines[k]||''),acts=el('div','acts');
      if(k>0){
        var bk=el('button','btn ghost','Back: '+stepName(secs[k-1]));bk.type='button';
        bk.addEventListener('click',function(){show(i,k-1,{focus:'step',scroll:'steps',say:true})});acts.appendChild(bk);
      }
      if(k<secs.length-1){
        var nx=el('button','btn','Next: '+stepName(secs[k+1]));nx.type='button';
        nx.addEventListener('click',function(){show(i,k+1,{focus:'step',scroll:'steps',say:true})});acts.appendChild(nx);
        if(k===secs.length-2&&i<COUNT-1){
          var sk=el('button','btn ghost','Skip to Mission '+(i+2));sk.type='button';
          sk.addEventListener('click',function(){show(i+1,0,{focus:'mission',scroll:'layout',say:true})});acts.appendChild(sk);
        }
      }else if(i<COUNT-1){
        var nm=el('button','btn','Next mission: '+NAMES[i+1]);nm.type='button';
        nm.addEventListener('click',function(){show(i+1,0,{focus:'mission',scroll:'layout',say:true})});acts.appendChild(nm);
      }
      sn.appendChild(info);sn.appendChild(acts);s.appendChild(sn);
    });
    var pg=$('.pager',a);
    if(i>0){var b1=el('button','btn ghost','Back: '+NAMES[i-1]);b1.type='button';b1.addEventListener('click',function(){show(i-1,0,{focus:'mission',scroll:'layout'})});pg.appendChild(b1)}
    if(i<COUNT-1){var b2=el('button','btn','Next: '+NAMES[i+1]);b2.type='button';b2.addEventListener('click',function(){show(i+1,0,{focus:'mission',scroll:'layout'})});pg.appendChild(b2)}
  });
}

/* ---------- resume card ---------- */
function renderResume(returning){
  var t=totalXp(),i=state.cur,k=state.step[i]||0,secs=stepsOf(articles[i]);
  resumeText.textContent='';
  if(t>=TOTAL){
    resumeText.appendChild(el('b',null,'Level complete.'));
    resumeText.appendChild(el('span','sub','All four missions are done. Open any mission to review it.'));
    resumeBtn.hidden=true;return;
  }
  resumeBtn.hidden=false;
  if(returning){
    resumeText.appendChild(el('b',null,'Welcome back.'));
    resumeText.appendChild(el('span','sub','You were in Mission '+(i+1)+', '+NAMES[i]+', at step '+(k+1)+': '+stepName(secs[k])+'. '+Math.min(mxp(i+1),NEED)+' of '+NEED+' XP in this mission.'+(Object.keys(state.ex).some(function(k){return k.indexOf('m'+(i+1)+'.')===0})?' Your answers are saved.':'')));
    resumeBtn.textContent='Continue where you left off';
    resumeBtn.onclick=function(){hideResume();show(i,k,{focus:'step',scroll:'steps',say:true})};
  }else{
    resumeText.appendChild(el('b',null,'Start here.'));
    resumeText.appendChild(el('span','sub','Mission 1, '+NAMES[0]+', takes about '+(L.missions[0].min||10)+' minutes.'));
    resumeBtn.textContent='Start Mission 1';
    resumeBtn.onclick=function(){hideResume();show(0,0,{focus:'step',scroll:'steps',say:true})};
  }
}

/* ---------- preferences panel ---------- */
function wirePrefs(){
  var btn=$('#prefsBtn'),panel=$('#prefs');
  function open(){panel.hidden=false;btn.setAttribute('aria-expanded','true');var f=$('input:checked',panel)||$('input',panel);if(f)f.focus()}
  function close(back){panel.hidden=true;btn.setAttribute('aria-expanded','false');if(back)btn.focus()}
  btn.addEventListener('click',function(){if(panel.hidden)open();else close(false)});
  $('#prefsClose').addEventListener('click',function(){close(true)});
  panel.addEventListener('keydown',function(e){if(e.key==='Escape'){e.stopPropagation();close(true)}});
  $$('input[name="pf-theme"]').forEach(function(r){r.addEventListener('change',function(){if(r.checked){prefs.theme=r.value;savePrefs();applyPrefs();announce('Theme: '+r.value)}})});
  $$('input[name="pf-text"]').forEach(function(r){r.addEventListener('change',function(){if(r.checked){prefs.text=r.value;savePrefs();applyPrefs();announce(r.value==='large'?'Larger text on':'Standard text size')}})});
  function bool(id,fn,label){
    $('#'+id).addEventListener('change',function(e){fn(e.target.checked);savePrefs();applyPrefs();announce(label+(e.target.checked?' on':' off'))});
  }
  bool('pf-focus',function(v){prefs.focus=v;refresh();if(v){close(false);var t=$('h3.label',stepsOf(articles[state.cur])[state.step[state.cur]||0]);if(t)t.focus({preventScroll:true})}},'Focus mode');
  bool('pf-steps',function(v){prefs.steps=v;refresh()},'One step at a time');
  bool('pf-hints',function(v){prefs.hints=v},'Hints after a wrong answer');
  bool('pf-motion',function(v){prefs.motion=v?'reduce':'allow'},'Reduce motion');
  bool('pf-calm',function(v){prefs.calm=v},'Calmer screen');
  bool('pf-sound',function(v){prefs.sound=v;if(v)chime('xp')},'Sound effects');
  function refresh(){
    root.setAttribute('data-steps',oneStep()?'one':'all');
    show(state.cur,state.step[state.cur]||0,{});
    window.scrollTo(0,0);
  }
  $('#exitFocus').addEventListener('click',function(){prefs.focus=false;savePrefs();applyPrefs();refresh();announce('Focus mode off');btn.focus()});
  $('#persistNote').textContent=storageOK?'Preferences, progress and your answers are saved in this browser and shared by all five levels.':'This browser is blocking saved data. The course still works, but progress and answers will be lost when you close the page.';
  var xb=$('#xferBtn');
  if(xb)xb.addEventListener('click',function(){
    var msg=importCode($('#xferIn').value);$('#xferMsg').textContent=msg;
    if(msg.indexOf('Imported')===0)setTimeout(reloadPage,400);
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!panel.hidden){close(true)}});
}

/* ---------- restart and reset (two-step confirm) ---------- */
function reloadPage(){try{window.location.reload()}catch(e){}}
function missionCounts(m){
  var xp=0,ans=0,k;
  for(k in state.got){if(k.indexOf('m'+m+':')===0)xp+=state.got[k]}
  for(k in state.ex){if(k.indexOf('m'+m+'.')===0)ans++}
  return {xp:xp,ans:ans};
}
function wipe(scope){
  frozen=true;clearTimeout(flushT);
  var st=readStore(),n;
  if(scope==='course'){for(n=1;n<=LEVELS;n++)st.levels[n]=cleanLevel(null);st.last=null}
  else if(scope==='level'){st.levels[L.level]=cleanLevel(null)}
  else{
    var e=st.levels[L.level]||cleanLevel(null),m=state.cur+1,k;
    for(k in e.got){if(k.indexOf('m'+m+':')===0)delete e.got[k]}
    for(k in e.ex){if(k.indexOf('m'+m+'.')===0)delete e.ex[k]}
    for(k in e.seen){if(k.charAt(0)===String(state.cur))delete e.seen[k]}
    e.step[state.cur]=0;e.cur=state.cur;st.levels[L.level]=e;
  }
  if(!writeStore(st)){frozen=false;return false}
  for(n=1;n<=LEVELS;n++){if(scope==='course'||n===L.level){lsDel('aimbc-level'+n+'-v2');lsDel('aimbc-level'+n+'-v1')}}
  reloadPage();return true;
}
function arm(btn,label,confirmLabel,note,run){
  var armed=false,t,note$=$('#confirmNote');
  function disarm(){armed=false;btn.textContent=label();clearTimeout(t)}
  btn.addEventListener('click',function(){
    if(!armed){armed=true;btn.textContent=confirmLabel();note$.textContent=note();t=setTimeout(function(){disarm();note$.textContent=''},8000);return}
    disarm();note$.textContent='';run();
  });
  btn.addEventListener('blur',function(){setTimeout(function(){if(document.activeElement!==btn){disarm()}},150)});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&armed){disarm();note$.textContent='Cancelled. Nothing was erased.'}});
  btn.refreshLabel=function(){if(!armed)btn.textContent=label()};
  btn.refreshLabel();
}
function wireReset(){
  var rm=$('#restartM'),rl=$('#reset'),rc=$('#resetAll');
  arm(rm,function(){return 'Restart Mission '+(state.cur+1)},function(){return 'Confirm: erase Mission '+(state.cur+1)},function(){
    var c=missionCounts(state.cur+1);
    return 'This erases '+c.xp+' XP and your saved answers in Mission '+(state.cur+1)+' of Level '+L.level+'. Other missions and levels are not touched. Press Escape to cancel.';
  },function(){wipe('mission')});
  arm(rl,function(){return 'Reset Level '+L.level},function(){return 'Confirm: erase Level '+L.level},function(){
    return 'This erases '+totalXp()+' XP and all saved answers in all four missions of Level '+L.level+'. Other levels are not touched. Press Escape to cancel.';
  },function(){wipe('level')});
  arm(rc,function(){return 'Reset the whole course'},function(){return 'Confirm: erase all five levels'},function(){
    var s=courseSummary(),x=0;s.levels.forEach(function(l){x+=l.xp});
    return 'This erases '+x+' XP and all saved answers in all five levels, and cannot be undone. Your display preferences are kept. Press Escape to cancel.';
  },function(){wipe('course')});
  window.__resetLabels=function(){rm.refreshLabel&&rm.refreshLabel()};
}

/* ---------- course-wide summary, level chips, last-visited level ---------- */
function renderCourse(){
  var s=courseSummary(),xp=0,done=0;
  s.levels.forEach(function(l){
    xp+=l.xp;done+=l.done;
    var c=$('.lvp[data-n="'+l.n+'"]');
    if(c){
      c.textContent='';
      var v=el('span',null,l.done+'/'+COUNT);v.setAttribute('aria-hidden','true');
      var r=el('span','sr',' '+l.done+' of '+COUNT+' missions done');
      c.appendChild(v);c.appendChild(r);
    }
  });
  var cb=$('#coursebar');
  if(cb)cb.textContent='Whole course: '+xp+' of '+(TOTAL*LEVELS)+' XP, '+done+' of '+(COUNT*LEVELS)+' missions done.';
  var ro=$('#resumeOther');
  if(ro){
    ro.textContent='';ro.hidden=true;
    var last=s.last;
    if(last&&last.level!==L.level){
      var lv=s.levels[last.level-1];
      if(lv&&(lv.xp>0)&&lv.done<COUNT){
        var a=el('a',null,'Open Level '+last.level);a.href='level'+last.level+'.html';
        ro.appendChild(document.createTextNode('You were last in Level '+last.level+' ('+lv.done+' of '+COUNT+' missions done). '));
        ro.appendChild(a);ro.hidden=false;
      }
    }
  }
}

/* ---------- carry progress from an older link (transfer code) ---------- */
function importCode(str){
  try{
    str=String(str||'').replace(/\s+/g,'');
    if(str.indexOf('AIMBC1.')!==0)return 'That is not a transfer code from this course.';
    var data=JSON.parse(decodeURIComponent(escape(atob(str.slice(7)))));
    if(!data||typeof data!=='object'||!data.levels)return 'That code is empty.';
    var st=readStore(),n,added=0;
    for(n=1;n<=LEVELS;n++){
      if(!data.levels[n])continue;
      var inc=cleanLevel(data.levels[n]);if(!hasProgress(inc))continue;
      var cur=(n===L.level)?{got:state.got,cur:state.cur,step:state.step,seen:state.seen,ex:state.ex}:(st.levels[n]||cleanLevel(null));
      var had=hasProgress(cur),k;
      for(k in inc.got){if((cur.got[k]||0)<inc.got[k]){cur.got[k]=inc.got[k];added++}}
      if(!had){cur.cur=inc.cur;cur.step=inc.step}
      for(k in inc.seen)cur.seen[k]=1;
      for(k in inc.ex){if(!(k in cur.ex))cur.ex[k]=inc.ex[k]}
      cur.t=Date.now();
      st.levels[n]=cleanLevel(cur);
    }
    if(!writeStore(st))return 'This browser is blocking saved progress, so nothing could be imported.';
    return 'Imported. Reloading.';
  }catch(e){return 'That code could not be read. Check that you copied all of it.'}
}

/* ---------- scrollable tables must be reachable by keyboard ---------- */
function enhanceScrollers(r){
  $$('.tblwrap,.tablewrap',r).forEach(function(w){
    if(w.getAttribute('tabindex')===null){w.setAttribute('tabindex','0');w.setAttribute('role','region');w.setAttribute('aria-label','Table. Scroll sideways if it does not fit.')}
  });
}

/* ---------- start ---------- */
function start(){
  if(!root.getAttribute('lang'))root.setAttribute('lang','en');
  enhanceScrollers(document);
  try{new MutationObserver(function(){enhanceScrollers(document)}).observe($('#stage'),{childList:true,subtree:true})}catch(e){}
  var returning=hadSaved&&(totalXp()>0||state.cur>0||(state.step[state.cur]||0)>0||Object.keys(state.seen).length>1||Object.keys(state.ex).length>0);
  buildSteps();
  autoFields();
  ['click','input','change','keyup'].forEach(function(t){document.addEventListener(t,schedule,true)});
  window.addEventListener('pagehide',flush);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')flush()});
  window.addEventListener('storage',function(e){
    if(e.key!==STORE||frozen)return;
    var m=readStore().levels[L.level];if(!m)return;
    var grew=false;for(var k in m.got){if((state.got[k]||0)<m.got[k]){state.got[k]=m.got[k];grew=true}}
    if(grew)renderHud();
    renderCourse();
  });
  nodes.forEach(function(n,i){n.addEventListener('click',function(){hideResume();show(i,state.step[i]||0,{focus:'mission',scroll:'layout',say:true})})});
  $('#skip').addEventListener('click',function(e){e.preventDefault();var h=$('h2',articles[state.cur]);if(h){h.focus({preventScroll:true});scrollToEl(h)}});
  applyPrefs();
  wirePrefs();wireReset();
  show(state.cur,state.step[state.cur]||0,{init:true});
  renderHud();
  renderCourse();
  renderResume(returning);
  if(!storageOK){
    var w=el('span','sub','This browser is blocking saved data, so progress will not be kept after you close the page.');
    resumeText.appendChild(w);
  }
}

window.Course={$:$,$$:$$,el:el,award:award,has:has,persist:persist,toast:toast,makeQuiz:makeQuiz,copy:copyText,start:start,level:L.level,prefs:function(){return prefs}};
})();
