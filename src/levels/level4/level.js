(function(C){
'use strict';
var $=C.$,$$=C.$$,el=C.el,award=C.award,makeQuiz=C.makeQuiz;

function btn(cls,text){var b=el('button',cls,text);b.type='button';return b}
function later(fn){requestAnimationFrame(function(){requestAnimationFrame(fn)})}

/* ---------- Mission 1: From Prompt to Process ---------- */
(function(){
  var STEPS=[
    {id:'a',t:'Choose this week’s one offer',min:5,best:'Human',ok:['Both'],must:false,why:'Strategy is your call. AI can brainstorm, but you decide what the bakery promotes.'},
    {id:'b',t:'Gather the facts: dates, prices, hours',min:10,best:'Human',ok:[],must:true,why:'These facts live in your head and your files. If the AI guesses them, wrong ones go out.'},
    {id:'c',t:'Draft the email body from those facts',min:40,best:'AI',ok:['Both'],must:false,why:'Drafting is where AI saves the most time. You still hand it the facts and a voice sample.'},
    {id:'d',t:'Check every fact against your list',min:10,best:'Human',ok:['Both'],must:true,why:'The AI cannot vouch for itself. A person compares the draft to the real list.'},
    {id:'e',t:'Write five subject line options',min:10,best:'AI',ok:['Both'],must:false,why:'Options are cheap for AI and slow for people. Quantity is the point.'},
    {id:'f',t:'Pick one subject line and tune the voice',min:6,best:'Both',ok:['Human'],must:false,why:'The AI proposes, you choose. Your ear for the brand is the final filter.'},
    {id:'g',t:'Schedule and send',min:5,best:'Human',ok:[],must:true,why:'Sending is the moment a mistake becomes public. A person presses the button.'}
  ];
  var TRUE_ORDER=['a','b','c','d','e','f','g'];
  var PILE_ORDER=['g','c','a','e','b','f','d'];
  var RULES=[
    ['a','b','Pick the offer before you gather facts. The facts depend on what you are promoting.'],
    ['b','c','Gather the facts before the AI drafts. Without them it guesses.'],
    ['c','d','Fact-check after there is a draft to check.'],
    ['c','e','Subject lines come from the draft, so draft first.'],
    ['d','f','Fact-check before the polish, so you are not polishing a wrong line.'],
    ['e','f','You need the subject line options before you can pick one.'],
    ['f','g','Nothing sends until the picks are made.']
  ];
  var TOTAL=0;STEPS.forEach(function(s){TOTAL+=s.min});
  var byId={};STEPS.forEach(function(s){byId[s.id]=s});
  var pile=$('#l4m1-pile'),seq=$('#l4m1-seq'),msg=$('#l4m1-msg'),ask=$('#l4m1-ask');
  var checkB=$('#l4m1-check'),fixB=$('#l4m1-fix'),undoB=$('#l4m1-undo'),resetB=$('#l4m1-reset');
  var sumWrap=$('#l4m1-sumwrap'),sumBtn=$('#l4m1-sumbtn'),tagCount=$('#l4m1-tagcount'),sum=$('#l4m1-sum');
  var placed=[],locked=false,tags={},pileBtns={},rows={},summed=false;

  function emptyRow(){var li=el('li','empty');li.appendChild(el('span','stxt','Your steps appear here, first at the top.'));seq.appendChild(li)}
  function addRow(id){
    var e=seq.querySelector('.empty');if(e)seq.removeChild(e);
    var li=el('li');var line=el('div','sline');line.appendChild(el('span','stxt',byId[id].t));li.appendChild(line);
    seq.appendChild(li);rows[id]=li;
  }
  function place(id){
    if(locked||placed.indexOf(id)>=0||!byId[id])return;
    placed.push(id);addRow(id);pileBtns[id].disabled=true;sync();
  }
  function sync(){
    checkB.disabled=placed.length<STEPS.length||locked;
    undoB.disabled=!placed.length||locked;
  }
  function buildPile(){
    pile.textContent='';
    PILE_ORDER.forEach(function(id){
      var b=btn('chip',byId[id].t);
      b.addEventListener('click',function(){place(id)});
      pile.appendChild(b);pileBtns[id]=b;
    });
  }
  function reset(){
    placed=[];locked=false;summed=false;tags={};rows={};seq.textContent='';emptyRow();buildPile();
    sumWrap.hidden=true;sum.hidden=true;sum.textContent='';sumBtn.disabled=true;tagCount.textContent='0 of 7 tagged';
    ask.textContent='Step 1 of 3. Tap the steps in the order you would do them.';
    msg.textContent='Tap a step to start. Several orders work. Each step just needs what it depends on to come first.';
    sync();
  }
  undoB.addEventListener('click',function(){
    if(locked||!placed.length)return;
    var id=placed.pop();var li=rows[id];if(li&&li.parentNode)li.parentNode.removeChild(li);delete rows[id];
    pileBtns[id].disabled=false;if(!placed.length)emptyRow();sync();
  });
  resetB.addEventListener('click',reset);
  fixB.addEventListener('click',function(){
    if(locked)return;
    placed=[];rows={};seq.textContent='';
    TRUE_ORDER.forEach(function(id){placed.push(id);addRow(id);pileBtns[id].disabled=true});
    msg.textContent='That is one sensible order. Press Check my order to lock it in.';sync();
  });
  function firstProblem(){
    var pos={};placed.forEach(function(id,i){pos[id]=i});
    for(var i=0;i<RULES.length;i++){if(pos[RULES[i][0]]>pos[RULES[i][1]])return RULES[i][2]}
    return null;
  }
  checkB.addEventListener('click',function(){
    if(locked||placed.length<STEPS.length)return;
    var p=firstProblem();
    if(p){msg.textContent='Not quite. '+p+' Move it with Undo last, or use Show me a sensible order.';return}
    locked=true;sync();
    msg.textContent='That order works. No step waits on something it needs.';
    award('m1:order',10);
    startTagging();
  });
  function allTagged(){return STEPS.every(function(s){return tags[s.id]})}
  function startTagging(){
    ask.textContent='Step 2 of 3. Who should do each step? Human: you. AI: the AI does it and you read it. Both: the AI proposes, you decide.';
    sumWrap.hidden=false;
    placed.forEach(function(id){
      var li=rows[id];li.classList.add('done');
      var grp=el('div','chips');grp.setAttribute('role','group');grp.setAttribute('aria-label','Who does: '+byId[id].t);
      ['Human','AI','Both'].forEach(function(t){
        var b=btn('chip',t);b.setAttribute('aria-pressed','false');
        b.addEventListener('click',function(){
          tags[id]=t;
          $$('.chip',grp).forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});
          var n=STEPS.filter(function(s){return tags[s.id]}).length;
          tagCount.textContent=n+' of 7 tagged';
          if(n===STEPS.length){sumBtn.disabled=false;award('m1:tag',10)}
        });
        grp.appendChild(b);
      });
      li.appendChild(grp);
    });
  }
  function frac(t){return t==='AI'?0.8:(t==='Both'?0.5:0)}
  sumBtn.addEventListener('click',function(){
    if(!locked||!allTagged())return;
    showSum(false);
  });
  function showSum(quiet){
    var saved=0,agree=0,stays=[],warns=[],firstOff=null,savesList=[];
    STEPS.forEach(function(s){
      var t=tags[s.id],sv=s.min*frac(t);saved+=sv;
      if(t==='Human'||t==='Both')stays.push(s);
      if(sv>0)savesList.push({s:s,v:sv});
      if(s.must&&t==='AI')warns.push(s);
      if(t===s.best||s.ok.indexOf(t)>=0)agree++;else if(!firstOff)firstOff=s;
    });
    saved=Math.round(saved);var after=TOTAL-saved;
    sum.textContent='';
    var bars=el('div','bars');
    [['Before',TOTAL],['With AI',after]].forEach(function(r,k){
      var row=el('div','row');row.appendChild(el('span','w',r[0]));
      var tr=el('span','track'),f=document.createElement('i');tr.appendChild(f);row.appendChild(tr);
      row.appendChild(el('span','pc',r[1]+' min'));bars.appendChild(row);
      if(quiet){f.style.width=Math.round(r[1]/TOTAL*100)+'%'}else{later(function(){f.style.width=Math.round(r[1]/TOTAL*100)+'%'})}
    });
    sum.appendChild(bars);
    sum.appendChild(el('p','verdict','Your tags save about '+saved+' of '+TOTAL+' minutes a week (example numbers). Your tags match the usual call on '+agree+' of 7 steps.'));
    if(warns.length){
      var wb=el('div','warnbox');
      wb.textContent='Careful: you gave the AI '+warns.map(function(s){return '“'+s.t+'”'}).join(' and ')+'. A wrong detail there reaches your readers with no one in between. Switch to Human or Both to keep a person on it.';
      sum.appendChild(wb);
    }else if(firstOff){
      sum.appendChild(el('p',null,'Worth a second look: “'+firstOff.t+'”. '+firstOff.why));
    }else{
      sum.appendChild(el('p',null,'Nice split. The AI does the drafting and options, and a person keeps the choices, the facts, and the send button.'));
    }
    var a=el('div','sumrow');a.appendChild(el('p','mini','Where a person stays'));
    var ul=el('ul','out');
    stays.forEach(function(s){var li=el('li');li.appendChild(el('span','t',s.t));li.appendChild(el('span','n',tags[s.id]));ul.appendChild(li)});
    if(!stays.length){var l0=el('li');l0.appendChild(el('span','t','Nobody. That is a risky setup.'));ul.appendChild(l0)}
    a.appendChild(ul);sum.appendChild(a);
    sum.hidden=false;
    ask.textContent='Step 3 of 3. That is your process. Next time, write it down and reuse it.';
    summed=true;
    if(!quiet)award('m1:sum',10);
  }
  reset();
  C.persist('m1.flow',{
    get:function(){return {placed:placed.slice(),locked:locked,tags:tags,summed:summed,msg:msg.textContent}},
    set:function(v){
      if(!v||typeof v!=='object')return;
      reset();
      var pl=Array.isArray(v.placed)?v.placed:[],seen={},i;
      for(i=0;i<pl.length;i++){if(typeof pl[i]==='string'&&byId[pl[i]]&&!seen[pl[i]]){seen[pl[i]]=1;place(pl[i])}}
      if(typeof v.msg==='string'&&v.msg.length<400&&placed.length)msg.textContent=v.msg;
      if(v.locked===true&&placed.length===STEPS.length&&!firstProblem()){
        locked=true;sync();
        msg.textContent='That order works. No step waits on something it needs.';
        startTagging();
        var tg=(v.tags&&typeof v.tags==='object')?v.tags:{};
        placed.forEach(function(id){
          var t=tg[id];if(t!=='Human'&&t!=='AI'&&t!=='Both')return;
          tags[id]=t;
          $$('.chip',rows[id]).forEach(function(x){x.setAttribute('aria-pressed',x.textContent===t?'true':'false')});
        });
        var n=STEPS.filter(function(s){return tags[s.id]}).length;
        tagCount.textContent=n+' of 7 tagged';
        if(n===STEPS.length){
          sumBtn.disabled=false;
          if(v.summed===true)showSum(true);
        }
      }
    }
  });
  makeQuiz($('#quiz1'),'m1',[
    {q:'Which task is the best first candidate for a workflow?',
     o:['A one-off brand video','A task you repeat every week with mostly the same steps','A strategy decision you make once a year'],c:1,xp:10,
     why:'Repetition is what makes a process pay off. Steps you repeat can be written down, tested, and reused.',
     hint:'Think about which one you could write the steps for after doing it three times.'},
    {q:'In the newsletter process, why does the fact check stay with a person?',
     o:['AI cannot read a price list','A wrong price or date goes out under your name, and the AI cannot vouch for itself','AI checking is too slow'],c:1,xp:10,
     why:'Same lesson as Level 1: confident does not mean correct. The check needs a source you can open.',
     hint:'Remember the four tells from Level 1. Who catches a made-up number?'}
  ]);
})();

/* ---------- Mission 2: Meet the Agent ---------- */
(function(){
  var log=$('#l4m2-log'),stageEls=$$('#l4m2-stages li'),startB=$('#l4m2-start'),replayB=$('#l4m2-replay');
  var decided=[],kinds=[],tones=[],picks=[],running=false,restoring=false;
  function setStage(n){stageEls.forEach(function(li,k){li.classList.toggle('on',k===n);li.classList.toggle('done',k<n)})}

  function scenes(){
    var sent=(kinds[1]==='Stop')?0:1;
    return [
      {stage:1,title:'The plan',tools:['Read: your goal, your facts, and your limits'],
       boxLabel:'The agent proposes this plan',
       box:'1. Search for independent cafes within 10 miles.\n2. Check which ones sell cold drinks.\n3. Draft a short intro email to the best three.\n4. Ask you before sending anything.',
       q:'Do you let it start?',
       opts:[
        {k:'Approve',l:'Approve the plan as written',tone:'mid',tag:'Fine, a bit loose',
         r:'The agent finds 6 cafes, including a chain with 14 locations. You never said to skip chains, so it stays on the list and gets a draft. Not harmful, just wasted effort.'},
        {k:'Edit',l:'Edit: independent cafes only, skip chains',tone:'good',tag:'Sharp edit',
         r:'The plan updates. The list drops to 5 independent cafes. One sentence from you saved a draft nobody needed.'},
        {k:'Stop',l:'Stop the run',tone:'safe',tag:'Safe, slower',
         r:'Nothing is searched, nothing is sent. Stopping is right when the plan is wrong. This plan was close, so a small edit would have kept it moving. For this walkthrough, the run continues.'}
       ]},
      {stage:2,title:'Acting with tools',tools:['Tool: web search, found 5 independent cafes','Tool: read the Corner Mug Cafe menu, sells cold brew and iced tea','Tool: drafted an email to Corner Mug Cafe'],
       boxLabel:'Draft email, ready to send',
       box:'Subject: A local iced tea for your cold case\n\nHi, I’m with Tidewater Tea Co. We make small-batch iced tea in three flavors, and we are already stocked in 40 cafes across the state. Could we drop off a free tasting case this week?',
       q:'Your fact sheet says small-batch, three flavors, free tasting case. Nothing else. Sending is permanent. What do you do?',
       opts:[
        {k:'Approve',l:'Approve: send it as written',tone:'bad',tag:'Costly',
         r:'Sent. The owner replies that afternoon: “Which 40 cafes?” You have no list. A sent email cannot be pulled back, and your first impression is a claim you cannot back up.'},
        {k:'Edit',l:'Edit: cut the “40 cafes” line, then send',tone:'good',tag:'Good catch',
         r:'You delete the line. The agent sends the cleaner version. The owner replies the next morning: “Sure, send the tasting case.”'},
        {k:'Stop',l:'Stop: do not send',tone:'safe',tag:'Safe, slower',
         r:'Nothing goes out. The agent asks which facts it may use, and you still have to fix the draft. Safe, but you did the work twice.'}
       ]},
      {stage:4,title:'Check and report',tools:['Check: re-read its drafts against your fact sheet','Check: dropped Seawall Coffee, closed since last year','Report: drafted 3, sent '+sent+', '+(3-sent)+' waiting for your OK'],
       boxLabel:'The agent also suggests',
       box:'“To close these faster, I will follow up with all three cafes every day this week and offer a 15% launch discount.”',
       q:'Your limits said no discounts. Does the suggestion fit the goal?',
       opts:[
        {k:'Approve',l:'Approve the extra plan',tone:'bad',tag:'Costly',
         r:'The agent offers 15% to three cafes, three days in a row. You never chose a discount. One cafe forwards the offer to a friend, and now you are holding a deal you did not pick.'},
        {k:'Edit',l:'Edit: one follow-up after 5 days, no discounts',tone:'good',tag:'Sharp edit',
         r:'The agent schedules one polite follow-up and leaves pricing alone. Discounts are your call, so they stay with you.'},
        {k:'Stop',l:'Stop: skip the extra plan',tone:'safe',tag:'Safe, slower',
         r:'The agent files its report and ends. Nothing extra happens. You can still add a follow-up later, on your terms.'}
       ]}
    ];
  }
  var toneClass={good:'ok',bad:'no',safe:'mid',mid:'mid'};
  var tagClass={good:'good',bad:'',safe:'mid',mid:'mid'};

  function showScene(i){
    var S=scenes()[i];setStage(S.stage);
    var card=el('div','scene');
    card.appendChild(el('h3',null,'Step '+(i+1)+' of 3: '+S.title));
    S.tools.forEach(function(t){card.appendChild(el('p','tool',t))});
    card.appendChild(el('p','mini',S.boxLabel));
    card.appendChild(el('div','draft',S.box));
    card.appendChild(el('p','ask',S.q));
    var opts=el('div','opts');var bs=[];
    var out=el('div','reveal');out.hidden=true;out.setAttribute('aria-live','polite');
    S.opts.forEach(function(o,oi){
      var b=btn('choice',o.l);
      function choose(){
        if(decided[i])return;
        decided[i]=true;kinds[i]=o.k;tones[i]=o.tone;picks[i]=oi;
        bs.forEach(function(x,k){x.disabled=true;if(k===oi){x.classList.add(toneClass[o.tone])}else{x.classList.add('dim')}});
        out.textContent='';
        out.appendChild(el('span','tagchip '+tagClass[o.tone],o.tag));
        out.appendChild(el('p',null,o.r));
        out.hidden=false;
        if(restoring)return;
        award('m2:d'+(i+1),8);
        if(i<2){showScene(i+1)}else{finish()}
      }
      b.addEventListener('click',choose);
      b.chooseNow=choose;
      opts.appendChild(b);bs.push(b);
    });
    card.appendChild(opts);card.appendChild(out);
    log.appendChild(card);
    if(!restoring){try{card.scrollIntoView({block:'nearest'})}catch(e){}}
    return bs;
  }
  function finish(){
    setStage(5);
    var card=el('div','scene');
    card.appendChild(el('h3',null,'Run finished'));
    var a=0,e=0,s=0,bad=0;
    kinds.forEach(function(k,i){if(k==='Approve')a++;else if(k==='Edit')e++;else s++;if(tones[i]==='bad')bad++});
    card.appendChild(el('p','verdict','Your calls: Approve '+a+', Edit '+e+', Stop '+s+'. Costly moments let through: '+bad+'.'));
    card.appendChild(el('p',null,bad>0
      ?'The agent did the legwork, but you owned the moments where its work touched the outside world. Reading and drafting are easy to undo. Sending and spending are not, so that is where the pause belongs.'
      :'Nothing costly got through. That is the job: you set the goal and limits, the agent does the legwork, and you hold the approval at every step that cannot be undone.'));
    card.appendChild(el('p','note','The loop you just watched: goal, plan, act with tools, check, report.'));
    log.appendChild(card);
    replayB.hidden=false;running=false;
    if(restoring)return;
    award('m2:done',6);
    try{card.scrollIntoView({block:'nearest'})}catch(er){}
  }
  startB.addEventListener('click',function(){
    if(running)return;
    running=true;startB.disabled=true;decided=[];kinds=[];tones=[];picks=[];
    showScene(0);
  });
  replayB.addEventListener('click',function(){
    log.textContent='';setStage(0);decided=[];kinds=[];tones=[];picks=[];running=false;
    startB.disabled=false;replayB.hidden=true;
  });
  setStage(0);
  C.persist('m2.run',{
    get:function(){return {started:startB.disabled,picks:picks.slice()}},
    set:function(v){
      if(!v||typeof v!=='object'||v.started!==true)return;
      var pk=[],i,src=Array.isArray(v.picks)?v.picks:[];
      for(i=0;i<3&&i<src.length;i++){
        if(typeof src[i]==='number'&&src[i]===Math.floor(src[i])&&src[i]>=0&&src[i]<3)pk.push(src[i]);else break;
      }
      restoring=true;
      try{
        log.textContent='';setStage(0);decided=[];kinds=[];tones=[];picks=[];replayB.hidden=true;
        running=true;startB.disabled=true;
        for(i=0;i<pk.length;i++){var bs=showScene(i);bs[pk[i]].chooseNow()}
        if(pk.length<3)showScene(pk.length);else finish();
      }catch(err){}
      restoring=false;
    }
  });
  makeQuiz($('#quiz2'),'m2',[
    {q:'What makes something an agent rather than a single chat answer?',
     o:['It costs more to run','It plans steps and uses tools, with you setting the goal and limits','It no longer needs checking'],c:1,xp:10,
     why:'The loop is the difference: plan, act with tools, check, report. The goal and the limits stay with you.',
     hint:'Look back at the run. What did the agent do besides write text?'},
    {q:'Where does an agent most need a human checkpoint?',
     o:['When it searches the web','Right before an action you cannot undo, like sending or spending','When it writes its final summary'],c:1,xp:10,
     why:'Searching and drafting are cheap to redo. A sent email or a changed budget is out in the world.',
     hint:'Which step in the run could not be taken back?'}
  ]);
})();

/* ---------- Mission 3: Wire It Up ---------- */
(function(){
  var G=[
    {id:'trigger',label:'When this happens',opts:[
      {id:'form',l:'A form is submitted',c:'a cake enquiry form is submitted',r:'A form submission starts the chain the moment it arrives.'},
      {id:'sheet',l:'A new row hits the lead sheet',c:'a new row appears in the lead sheet',r:'A new row starts it. Handy when leads come from several places.'},
      {id:'weekly',l:'Every Monday at 8:00',c:'every Monday at 8:00, for every row in the lead sheet',r:'A schedule runs on the clock, with or without a new lead. Watch for it re-reading old rows.'}]},
    {id:'filter',label:'Only continue if',opts:[
      {id:'all',l:'Run on every entry',c:'every entry, tidy or not',r:'No filter: everything gets through, tidy or not.'},
      {id:'valid',l:'Only complete entries with a valid email',c:'the email looks valid and the interest box is filled in',r:'Filter on. Broken entries stop before the AI sees them.'}]},
    {id:'repeats',label:'Repeats',opts:[
      {id:'allow',l:'Allow repeats',c:'no memory, so one person can start it twice',r:'No memory. The same person can start it twice.'},
      {id:'skip',l:'Skip people already handled',c:'skip anyone already handled',r:'Repeat check on. Each person is handled once.'}]},
    {id:'send',label:'What happens to the reply',opts:[
      {id:'auto',l:'Send automatically',c:'send the reply right away',r:'Auto-send: fast, and nobody reads it first.'},
      {id:'draft',l:'Save as a draft for me to review',c:'save the reply as a draft and notify me',r:'Drafts only: nothing leaves without you.'}]},
    {id:'cap',label:'Safety brake',opts:[
      {id:'none',l:'No daily limit',c:'no daily limit',r:'No limit. A glitch has no brake.'},
      {id:'cap',l:'Stop after 20 a day',c:'stop after 20 a day',r:'Brake on: it stops after 20 in a day.'}]}
  ];
  var sel={trigger:'form',filter:'all',repeats:'allow',send:'auto',cap:'none'};
  var ctl=$('#l4m3-ctl'),chain=$('#l4m3-chain'),meter=$$('#l4m3-meter i'),mlabel=$('#l4m3-mlabel'),risks=$('#l4m3-risks');
  var msg=$('#l4m3-msg'),testB=$('#l4m3-test'),testOut=$('#l4m3-testout'),testMsg=$('#l4m3-testmsg');
  var restoring=false,chipRefs={},LABELS=['Safe to switch on','Mostly safe','Watch it closely','Risky','Risky','Do not switch on'];
  function opt(gid){var g=G.filter(function(x){return x.id===gid})[0];return g.opts.filter(function(o){return o.id===sel[gid]})[0]}

  function score(){
    var bad=sel.filter==='all'?1:0,dup=sel.repeats==='allow'?1:0,rev=sel.send==='auto'?2:0,brake=(sel.send==='auto'&&sel.cap==='none')?1:0;
    return {bad:bad,dup:dup,rev:rev,brake:brake,total:bad+dup+rev+brake};
  }
  function dupText(open){
    if(!open)return 'Covered: people already handled are skipped.';
    if(sel.trigger==='form')return 'A double-click on submit makes two entries, and each one starts the chain.';
    if(sel.trigger==='sheet')return 'Edit or re-import the sheet and old rows look new, so they start the chain again.';
    return 'Every Monday it sees last week’s rows again unless it remembers which were handled.';
  }
  function render(changedLine){
    chain.textContent='';
    var lines=[
      ['trigger','WHEN: '+opt('trigger').c],
      ['filter','ONLY IF: '+opt('filter').c],
      ['repeats','REPEATS: '+opt('repeats').c],
      ['ai','THEN: the AI drafts a reply from your template and the entry’s answers'],
      ['send','FINALLY: '+opt('send').c+'; '+opt('cap').c]
    ];
    lines.forEach(function(ln){
      var d=el('div','ln'+(ln[0]===changedLine||(changedLine==='cap'&&ln[0]==='send')?' new':''),ln[1]);chain.appendChild(d);
    });
    var s=score();
    meter.forEach(function(m,k){m.classList.toggle('on',k<s.total)});
    mlabel.textContent='Risk '+s.total+' of 5: '+LABELS[s.total];
    risks.textContent='';
    var items=[
      ['Bad data',s.bad?'Entries with a typo email or an empty box still go through, and the AI fills the gaps with guesses.':'Covered: broken entries stop at the filter.',s.bad],
      ['Duplicates',dupText(s.dup),s.dup],
      ['No review',s.rev?'Nobody reads the reply before the customer does. An odd entry, like a refund request, gets a cheerful sales email.':'Covered: nothing leaves without your OK.',s.rev],
      ['No brake',sel.send==='draft'?'Not needed while drafts wait for you.':(s.brake?'If something loops, it can send hundreds before you notice.':'Covered: a runaway stops at 20.'),s.brake]
    ];
    items.forEach(function(it){
      var li=el('li');var t=el('span','t');t.appendChild(el('b',null,it[0]+': '));t.appendChild(document.createTextNode(it[1]));
      li.appendChild(t);li.appendChild(el('span','n'+(it[2]?' open':' fit'),it[2]?'Open':'Covered'));risks.appendChild(li);
    });
    if(s.total<=1&&!restoring)award('m3:low',15);
    return s;
  }
  function clearTest(){
    if(testOut.children.length){testOut.textContent='';testMsg.textContent='Settings changed. Run the test again to see the new result.'}
  }
  G.forEach(function(g){
    var wrap=el('div','grp');wrap.setAttribute('role','group');wrap.setAttribute('aria-label',g.label);
    wrap.appendChild(el('p','mini',g.label));
    var row=el('div','chips');chipRefs[g.id]={};
    g.opts.forEach(function(o){
      var b=btn('chip',o.l);b.setAttribute('aria-pressed',sel[g.id]===o.id?'true':'false');
      b.addEventListener('click',function(){
        sel[g.id]=o.id;
        $$('.chip',row).forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});
        var s=render(g.id);
        msg.textContent=o.r+(s.total<=1?' The meter is low. Run the test to see it work.':'');
        clearTest();
        if(g.id==='trigger')award('m3:trigger',5);
      });
      row.appendChild(b);chipRefs[g.id][o.id]=b;
    });
    wrap.appendChild(row);ctl.appendChild(wrap);
  });
  var ENTRIES=[
    {n:'Dana Ruiz',d:'clean entry',k:'clean'},
    {n:'Dana Ruiz again',d:'double-click, same entry',k:'dupe'},
    {n:'“asdf”',d:'email “dana@”, interest box empty',k:'bad'},
    {n:'Marcus Lee',d:'clean entry',k:'clean'},
    {n:'Priya Nair',d:'asks for a refund, not a cake',k:'odd'}
  ];
  testB.addEventListener('click',function(){
    runTest();
    award('m3:test',10);
  });
  function runTest(){
    var auto=sel.send==='auto',sent=0,drafts=0,skipped=0,probs=0;
    testOut.textContent='';
    ENTRIES.forEach(function(e){
      var res,st;
      if(e.k==='clean'){res=auto?'Reply sent.':'Draft waiting for you.';st='ok';auto?sent++:drafts++}
      else if(e.k==='dupe'){
        if(sel.repeats==='skip'){res='Skipped: already handled.';st='ok';skipped++}
        else if(auto){res='A second reply went out to the same person.';st='bad';sent++;probs++}
        else{res='A second draft is waiting. You delete it.';st='warn';drafts++}
      }else if(e.k==='bad'){
        if(sel.filter==='valid'){res='Stopped at the filter.';st='ok';skipped++}
        else if(auto){res='A guess-filled reply went to a broken address.';st='bad';sent++;probs++}
        else{res='A draft built from guesses is waiting. You catch it.';st='warn';drafts++}
      }else{
        if(auto){res='A cheerful sales reply went to an upset customer.';st='bad';sent++;probs++}
        else{res='Draft waiting. You see it and answer yourself.';st='ok';drafts++}
      }
      var li=el('li');var t=el('span','t');t.appendChild(el('b',null,e.n));t.appendChild(document.createTextNode(' ('+e.d+'): '+res));
      li.appendChild(t);li.appendChild(el('span','n'+(st==='ok'?' fit':(st==='bad'?' open':'')),st==='ok'?'Fine':(st==='bad'?'Mistake':'Caught')));
      testOut.appendChild(li);
    });
    testMsg.textContent='Of 5 entries: '+sent+' sent, '+drafts+' drafts waiting, '+skipped+' skipped. '+(probs>0
      ?probs+' mistake'+(probs>1?'s':'')+' reached real people. Change a setting and run it again.'
      :'No mistakes reached anyone.');
  }
  render();
  msg.textContent='These settings are risky on purpose. Change one and the meter moves.';
  C.persist('m3.chain',{
    get:function(){return {sel:sel,tested:testOut.children.length>0,msg:msg.textContent,testMsg:testMsg.textContent}},
    set:function(v){
      if(!v||typeof v!=='object')return;
      var sv=(v.sel&&typeof v.sel==='object')?v.sel:{};
      restoring=true;
      try{
        G.forEach(function(g){
          var ok=g.opts.some(function(o){return o.id===sv[g.id]});
          if(ok)sel[g.id]=sv[g.id];
          $$('.chip',$$('.grp',ctl)[G.indexOf(g)]).forEach(function(x,k){x.setAttribute('aria-pressed',g.opts[k].id===sel[g.id]?'true':'false')});
        });
        render();
        if(typeof v.msg==='string'&&v.msg.length<400)msg.textContent=v.msg;
        if(v.tested===true)runTest();
        if(typeof v.testMsg==='string'&&v.testMsg.length<400)testMsg.textContent=v.testMsg;
      }catch(err){}
      restoring=false;
    }
  });
  makeQuiz($('#quiz3'),'m3',[
    {q:'Which setting does the most to lower the risk of a brand-new automation?',
     o:['Saving replies as drafts for you to review','Adding more steps to the chain','Running it more often'],c:0,xp:10,
     why:'A draft step puts a person between a mistake and the customer. You can loosen it later, once the drafts have stayed clean.',
     hint:'Look at which setting moved the meter the most.'},
    {q:'A customer double-clicks your form button. What protects you?',
     o:['A faster trigger','A repeat check that skips people already handled','A longer email template'],c:1,xp:10,
     why:'The chain cannot tell a double-click from a new lead unless it remembers who it already handled.',
     hint:'Which setting is about remembering who came in already?'}
  ]);
})();

/* ---------- Mission 4: Trust Test ---------- */
(function(){
  var OUT=[
    {t:'Dog-wash day is this Saturday, 10 to 2. Bring your dog, skip the appointment, and the wash is $12.',key:[1,1,1],note:'Meets all three.'},
    {t:'Dog-wash day is this Saturday, 10 to 4. Walk in, no appointment, $12 a wash.',key:[0,1,1],note:'The fact sheet says 10 to 2. This says 10 to 4.'},
    {t:'Dog-wash day is this Saturday, 10 to 2! Bring your furry friend and make a splash!',key:[1,0,0],note:'Two exclamation marks, and the price is missing.'},
    {t:'Heads up: dog-wash day is this Saturday, 10 to 2. It is $12 a wash, no appointment, and we will not comment on the smell.',key:[1,1,1],note:'Meets all three.'},
    {t:'Saturday, 10 to 2: dog-wash day, $12, by appointment only. Come as muddy as you like, we have seen worse.',key:[0,1,1],note:'The fact sheet says no appointment needed. This says by appointment only.'}
  ];
  var CRIT=['Accurate','On voice','On brief'];
  var list=$('#l4m4-list'),lockB=$('#l4m4-lock'),count=$('#l4m4-count'),msg=$('#l4m4-msg'),ask=$('#l4m4-ask');
  var actions=$('#l4m4-actions'),sum=$('#l4m4-sum'),part2=$('#l4m4-part2');
  var quick={},careful=[[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],cards=[],locked=false,compared=false,compareB=null,restoring=false;

  OUT.forEach(function(o,i){
    var c=el('div','cand');
    c.appendChild(el('p','mini','Version '+(i+1)));
    c.appendChild(el('p','qt','“'+o.t+'”'));
    var row=el('div','chips');row.setAttribute('role','group');row.setAttribute('aria-label','Quick look, version '+(i+1));
    ['Looks fine','Looks off'].forEach(function(t,k){
      var b=btn('chip',t);b.setAttribute('aria-pressed','false');
      b.addEventListener('click',function(){
        if(locked)return;
        quick[i]=k===0;
        $$('.chip',row).forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});
        var n=Object.keys(quick).length;count.textContent=n+' of 5 scored';
        lockB.disabled=n<5;
      });
      row.appendChild(b);
    });
    c.appendChild(row);list.appendChild(c);
    cards.push({card:c,quickRow:row});
  });

  lockB.addEventListener('click',function(){
    if(locked||Object.keys(quick).length<5)return;
    lockQuick();
  });
  function lockQuick(){
    locked=true;lockB.disabled=true;
    cards.forEach(function(cd){$$('.chip',cd.quickRow).forEach(function(b){b.disabled=true})});
    ask.textContent='Round 2, the careful score. Check each version against the brief and the fact sheet. Tap each rule it meets.';
    msg.textContent='Accurate: every fact matches the sheet. On voice: friendly, a little dry, no exclamation marks. On brief: two sentences, with the time and the price.';
    if(!restoring)award('m4:quick',5);
    OUT.forEach(function(o,i){
      var rub=el('div','chips');rub.setAttribute('role','group');rub.setAttribute('aria-label','Careful score, version '+(i+1));
      CRIT.forEach(function(name,k){
        var b=btn('chip','Meets: '+name);b.setAttribute('aria-pressed','false');
        b.addEventListener('click',function(){
          if(compared)return;
          careful[i][k]=careful[i][k]?0:1;
          b.setAttribute('aria-pressed',careful[i][k]?'true':'false');
        });
        rub.appendChild(b);
      });
      cards[i].card.appendChild(rub);cards[i].rub=rub;
    });
    compareB=btn('btn','Compare my scores');
    compareB.addEventListener('click',compare);
    actions.appendChild(compareB);count.textContent='Tap the rules each version meets, then compare.';
  }

  function compare(){
    if(compared)return;
    compared=true;compareB.disabled=true;
    var miss=0,right=0,match=0,quickRight=0;
    OUT.forEach(function(o,i){
      var pass=o.key[0]&&o.key[1]&&o.key[2];
      if(quick[i]&&!pass)miss++;
      if(!!quick[i]===!!pass)quickRight++;
      var m=0;for(var k=0;k<3;k++){if(careful[i][k]===o.key[k])m++}
      match+=m;
      $$('.chip',cards[i].rub).forEach(function(b){b.disabled=true});
      var r=el('p','res '+(pass?'good':'bad'));
      r.appendChild(el('b',null,'Quick: '+(quick[i]?'fine':'off')+'. Careful check: '+(pass?'passes':'fails')+'. '));
      r.appendChild(document.createTextNode(o.note+' Your ticks matched on '+m+' of 3.'));
      cards[i].card.appendChild(r);
    });
    sum.textContent='';
    sum.appendChild(el('p','verdict','Quick scoring got '+quickRight+' of 5 right. It passed '+miss+' version'+(miss===1?'':'s')+' that failed the careful check. Your careful ticks matched the key on '+match+' of 15.'));
    sum.appendChild(el('p',null,miss>0
      ?'Tone and length are easy to judge in five seconds. A wrong hour or a wrong rule reads just like a right one. Facts need a source beside them.'
      :'Your quick look caught every problem this time. With 5 versions that is doable. With 200 a week it is not, which is why you set rules.'));
    sum.hidden=false;
    ask.textContent='Round 2 done. Now decide how much checking each kind of work deserves.';
    if(!restoring)award('m4:careful',10);
    buildPolicy();
  }

  /* ----- Part 2: rules by risk ----- */
  var TASKS=[
    {id:'t1',t:'Meeting-notes summaries for the team (internal)',risk:'Low risk',ideal:2,why:'Nobody outside sees it. Skim the weekly log and move on.',loose:''},
    {id:'t2',t:'Blog topic ideas for the content calendar',risk:'Low risk',ideal:2,why:'Ideas are cheap to throw away. Nothing is published as-is.',loose:''},
    {id:'t3',t:'Product descriptions for the website',risk:'Medium risk',ideal:1,why:'Facts matter, but a sample checked against the spec sheet shows you the pattern.',loose:'A wrong spec on a live page costs trust. Keep a sample check.'},
    {id:'t4',t:'Replies to common customer questions (hours, shipping)',risk:'Medium risk',ideal:1,why:'Check a sample against your real hours and policies, and everything it flags.',loose:'A wrong hours line goes to everyone who asks. Keep a sample check.'},
    {id:'t5',t:'Emails that mention prices, discounts, or deadlines',risk:'High risk',ideal:0,why:'A wrong price or date is a promise you now have to keep.',loose:'A wrong price or date is a promise. Check each one.'},
    {id:'t6',t:'Anything that changes your ad budget or bids',risk:'High risk',ideal:0,why:'Money moves fast. A person approves every change.',loose:'Money moves fast. Every change needs a person.'}
  ];
  var POL=['Check every one','Spot-check','Run alone'];
  var pol={},touched={},polMsgs={},polRows={},sampleSel=null;
  TASKS.forEach(function(t){pol[t.id]=1});
  var pre=$('#l4m4-pre'),own=$('#l4m4-own'),who=$('#l4m4-who'),copyB=$('#l4m4-copy'),copyNote=$('#l4m4-copynote');

  function buildCard(){
    var rate=sampleSel?sampleSel.value:'1 in 5';
    function bucket(n){
      var a=TASKS.filter(function(t){return pol[t.id]===n}).map(function(t){return '- '+t.t});
      return a.length?a.join('\n'):'- (nothing yet)';
    }
    var o=own.value.replace(/\s+/g,' ').trim()||'(none yet)';
    var w=who.value.replace(/\s+/g,' ').trim()||'(not set)';
    return 'APPROVAL RULES (example: Brightside Pet Supply)\n\n'
      +'Always needs a human before it goes out:\n'+bucket(0)+'\n\n'
      +'Spot-check ('+rate+', plus anything the AI flags):\n'+bucket(1)+'\n\n'
      +'Can run alone (read the weekly log):\n'+bucket(2)+'\n\n'
      +'My own rule: '+o+'\n'
      +'Who checks, and when: '+w+'\n'
      +'Review these rules: once a month, and whenever the prompt or tool changes.';
  }
  function refreshCard(){pre.textContent=buildCard()}
  function paintPol(t,row,fb){
    var k=pol[t.id];
    $$('.chip',row).forEach(function(x,xi){x.setAttribute('aria-pressed',xi===k?'true':'false')});
    if(k===t.ideal){fb.className='msg res good';fb.textContent='Fits the risk. '+t.why}
    else if(k<t.ideal){fb.className='msg res';fb.textContent='Safe, but it costs you time. '+t.why}
    else{fb.className='msg res bad';fb.textContent='Too loose. '+t.loose}
  }
  function buildPolicy(){
    part2.textContent='';
    part2.appendChild(el('p','ask','Set a rule for each kind of AI work. Starting suggestion: spot-check everything. Change any that should be stricter or looser.'));
    TASKS.forEach(function(t){
      var card=el('div','polcard');
      card.appendChild(el('p','rk',t.risk));
      card.appendChild(el('p',null,t.t));
      var row=el('div','chips');row.setAttribute('role','group');row.setAttribute('aria-label','Rule for: '+t.t);
      var fb=el('p','msg');fb.setAttribute('aria-live','polite');
      POL.forEach(function(name,k){
        var b=btn('chip',name);b.setAttribute('aria-pressed',pol[t.id]===k?'true':'false');
        b.addEventListener('click',function(){
          pol[t.id]=k;touched[t.id]=true;
          paintPol(t,row,fb);
          refreshCard();
          if(TASKS.every(function(x){return touched[x.id]})){
            award('m4:policy',5);
            copyB.disabled=false;copyNote.textContent='Add your own rule, then copy the card.';
          }
        });
        row.appendChild(b);
      });
      card.appendChild(row);card.appendChild(fb);part2.appendChild(card);polRows[t.id]={row:row,fb:fb};
    });
    var f=el('label','fld');f.setAttribute('for','l4m4-rate');f.appendChild(el('span',null,'How much do you spot-check?'));
    var s=document.createElement('select');s.id='l4m4-rate';
    ['1 in 5','1 in 10','1 in 20'].forEach(function(v){var o=document.createElement('option');o.value=v;o.textContent=v;s.appendChild(o)});
    s.addEventListener('change',refreshCard);s.addEventListener('input',refreshCard);
    f.appendChild(s);part2.appendChild(f);sampleSel=s;
    part2.hidden=false;refreshCard();
  }
  own.addEventListener('input',refreshCard);who.addEventListener('input',refreshCard);
  refreshCard();

  function done(ok){
    copyNote.textContent=ok?'Copied. Paste it where your team will see it, like the top of your shared folder.':'Text selected. Press copy on your keyboard, then paste it where your team will see it.';
    award('m4:card',15);
  }
  copyB.addEventListener('click',function(){
    if(copyB.disabled)return;
    C.copy(buildCard(),pre,done);
  });
  C.persist('m4.trust',{
    get:function(){return {quick:quick,locked:locked,careful:careful,compared:compared,pol:pol,touched:touched,rate:sampleSel?sampleSel.value:null}},
    set:function(v){
      if(!v||typeof v!=='object')return;
      var q=(v.quick&&typeof v.quick==='object')?v.quick:{},i,k,n=0,qq={};
      for(i=0;i<5;i++){if(typeof q[i]==='boolean'){qq[i]=q[i];n++}}
      if(!n)return;
      restoring=true;
      try{
        quick=qq;
        cards.forEach(function(cd,ci){
          $$('.chip',cd.quickRow).forEach(function(b,bi){b.setAttribute('aria-pressed',(ci in qq)&&((bi===0)===qq[ci])?'true':'false')});
        });
        count.textContent=n+' of 5 scored';lockB.disabled=n<5;
        if(v.locked===true&&n===5){
          lockQuick();
          var cr=Array.isArray(v.careful)?v.careful:[];
          for(i=0;i<5;i++){
            for(k=0;k<3;k++){careful[i][k]=(cr[i]&&cr[i][k]===1)?1:0}
            $$('.chip',cards[i].rub).forEach(function(b,bi){b.setAttribute('aria-pressed',careful[i][bi]?'true':'false')});
          }
          if(v.compared===true){
            compare();
            var pv=(v.pol&&typeof v.pol==='object')?v.pol:{},tv=(v.touched&&typeof v.touched==='object')?v.touched:{};
            TASKS.forEach(function(t){
              if(pv[t.id]===0||pv[t.id]===1||pv[t.id]===2)pol[t.id]=pv[t.id];
              if(tv[t.id]===true){touched[t.id]=true;paintPol(t,polRows[t.id].row,polRows[t.id].fb)}
              else{$$('.chip',polRows[t.id].row).forEach(function(x,xi){x.setAttribute('aria-pressed',xi===pol[t.id]?'true':'false')})}
            });
            if(sampleSel&&typeof v.rate==='string'){
              for(i=0;i<sampleSel.options.length;i++){if(sampleSel.options[i].value===v.rate)sampleSel.value=v.rate}
            }
            refreshCard();
            if(TASKS.every(function(x){return touched[x.id]})){
              copyB.disabled=false;copyNote.textContent='Add your own rule, then copy the card.';
            }
          }
        }
      }catch(err){}
      restoring=false;
    }
  });
  makeQuiz($('#quiz4'),'m4',[
    {q:'A quick look said a text was fine, but it listed the wrong store hours. What does that tell you?',
     o:['Quick looks are useless','Quick looks catch tone, but facts need comparing against a source','The rubric has too many rules'],c:1,xp:8,
     why:'A glance is good for voice and length. A wrong hour reads just like a right one, so facts need a source beside them.',
     hint:'Think about which of the three rules a glance can actually test.'},
    {q:'A new automation drafts emails with prices in them. How often should a person check them?',
     o:['Every one, until they have stayed clean for a long stretch','1 in 20','Never, the AI is careful with numbers'],c:0,xp:7,
     why:'Prices are promises. Start with every one, and loosen only after a long clean record. Even then, keep a sample.',
     hint:'Which risk level did prices land in on your rules card?'}
  ]);
})();
})(window.Course);
