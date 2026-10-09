(function(C){
'use strict';
var $=C.$,$$=C.$$,el=C.el,award=C.award,makeQuiz=C.makeQuiz;

/* ---------- Mission 1 ---------- */
(function(){
  var ALL=['everyday runs','comfort','speed','the trail','champions'];
  var SHOW=['comfort','champions','the trail','everyday runs','speed'];
  var CTX=[
    {n:'Discount sports chain',p:[38,30,14,10,8]},
    {n:'Luxury performance label',p:[10,18,28,8,36]},
    {n:'Trail-running club',p:[8,16,14,52,10]}
  ];
  var guessWrap=$('#guess1'),reveal=$('#reveal1'),barsEl=$('#bars1'),verdict=$('#verdict1'),ctxWrap=$('#ctx1');
  var note=$('#ctxnote1'),trk=$('#trk1'),blank=$('#blank1'),ask=$('#ask1'),ctxName=$('#ctxName1');
  var guess=null,cur=0,seen={0:true},rows=[],gbtns=[],cbtns=[];

  function paint(){
    rows.forEach(function(r,i){r.fill.style.width=CTX[cur].p[i]+'%';r.pc.textContent=CTX[cur].p[i]+'%'});
  }
  function tracker(){
    var n=Object.keys(seen).length;
    trk.textContent=n>=3?'All three voices tried.':'Voices tried: '+n+' of 3';
  }
  var ctxUsed=false;
  function showGuess(g,fresh){
      var w=ALL[g],b=gbtns[SHOW.indexOf(w)];
      guess=g;
      gbtns.forEach(function(x){x.disabled=true});
      b.setAttribute('aria-pressed','true');
      blank.textContent=w;
      ask.textContent='Here is how the AI ranked all five.';
      var pr=CTX[0].p,rank=1,top=0;
      for(var j=0;j<pr.length;j++){if(pr[j]>pr[guess])rank++;if(pr[j]>pr[top])top=j}
      verdict.textContent=(rank===1)
        ?'“'+w+'” is the top pick at '+pr[guess]+'%. You think like the model.'
        :'You picked “'+w+'”. The AI rates it #'+rank+' at '+pr[guess]+'%. Its favorite is “'+ALL[top]+'” at '+pr[top]+'%.';
      rows[guess].row.classList.add('mine');
      reveal.hidden=false;
      if(fresh)requestAnimationFrame(function(){requestAnimationFrame(paint)});else paint();
      tracker();
  }
  SHOW.forEach(function(w){
    var b=el('button','chip',w);b.type='button';
    b.addEventListener('click',function(){
      if(guess!==null)return;
      showGuess(ALL.indexOf(w),true);
      award('m1:guess',10);
    });
    guessWrap.appendChild(b);gbtns.push(b);
  });
  ALL.forEach(function(w){
    var row=el('div','row');
    var wl=el('span','w',w);var tr=el('span','track');var f=document.createElement('i');tr.appendChild(f);
    var pc=el('span','pc','0%');
    row.appendChild(wl);row.appendChild(tr);row.appendChild(pc);barsEl.appendChild(row);
    rows.push({row:row,fill:f,pc:pc});
  });
  CTX.forEach(function(c,idx){
    var b=el('button','chip',c.n);b.type='button';b.setAttribute('aria-pressed',idx===0?'true':'false');
    if(idx===0)b.classList.add('seen');
    b.addEventListener('click',function(){
      selectCtx(idx);
      if(Object.keys(seen).length>=3)award('m1:explore',10);
    });
    ctxWrap.appendChild(b);cbtns.push(b);
  });
  function selectCtx(idx){
      var c=CTX[idx];
      ctxUsed=true;
      cur=idx;seen[idx]=true;
      cbtns.forEach(function(x,k){x.setAttribute('aria-pressed',k===idx?'true':'false');if(seen[k])x.classList.add('seen')});
      ctxName.textContent=c.n;paint();
      if(idx===0){note.textContent='Back to the baseline.'}
      else{
        var best=0,bi=0;
        for(var j=0;j<ALL.length;j++){var d=c.p[j]-CTX[0].p[j];if(Math.abs(d)>Math.abs(best)){best=d;bi=j}}
        note.textContent='“'+ALL[bi]+'” '+(best>0?'jumped':'dropped')+' from '+CTX[0].p[bi]+'% to '+c.p[bi]+'%. Same sentence, different voice, different odds.';
      }
      tracker();
  }
  C.persist('m1.state',{
    get:function(){return {g:guess,c:cur,u:ctxUsed,s:Object.keys(seen).map(Number)}},
    set:function(v){
      if(!v||typeof v!=='object'||guess!==null)return;
      var g=v.g,c=v.c;
      if(typeof g!=='number'||g%1!==0||g<0||g>=ALL.length)return;
      if(typeof c!=='number'||c%1!==0||c<0||c>=CTX.length)c=0;
      if(Array.isArray(v.s)){seen={0:true};v.s.forEach(function(k){if(typeof k==='number'&&k>=0&&k<CTX.length&&k%1===0)seen[k]=true})}
      showGuess(g,false);
      if(v.u===true){selectCtx(c)}
      else{cur=c;cbtns.forEach(function(x,k){x.setAttribute('aria-pressed',k===c?'true':'false')});ctxName.textContent=CTX[c].n;paint()}
    }
  });
  makeQuiz($('#quiz1'),'m1',[
    {q:'At its core, what is an AI writing tool doing?',
     o:['Looking up answers in a database of facts','Rating likely next words based on the text so far','Working out what is true, then writing it down'],c:1,xp:15,
     why:'It ranks what usually comes next. Facts can show up in that ranking, but it is not checking them.',
     hint:'Think about the shoe sentence. It was weighing odds, not looking anything up.'},
    {q:'You paste your brand voice guide above your request. What changes?',
     o:['The odds shift toward words that fit that voice','The AI permanently learns your brand','Nothing, it ignores anything above the request'],c:0,xp:15,
     why:'Context moves the odds for this conversation. It does not retrain the model.',
     hint:'Remember the three brand voices. What moved when you switched?'}
  ]);
})();

/* ---------- Mission 2 ---------- */
(function(){
  var base='Write email subject lines for our spring plant sale.';
  var adds=[
    {n:'Audience',l:'Audience: first-time plant owners who are nervous about killing plants.'},
    {n:'Goal and offer',l:'Goal: get opens from people who have never bought from us. Offer: 20% off, ends Sunday.'},
    {n:'Constraints',l:'Constraints: under 45 characters, no exclamation marks, no emoji.'},
    {n:'Voice',l:'Voice: friendly and a little dry. A past winner: “Your fern called. It’s fine.”'}
  ];
  var outs=[
    ['Spring Plant Sale: Save Up To 30% Today!','Don’t Miss Our Spring Sale','Refresh Your Space With Beautiful Plants'],
    ['Plants that forgive you for forgetting to water them','Beginner-proof plants, now on sale','Yes, you can keep this one alive'],
    ['Beginner-proof plants, 20% off until Sunday','Your first plant is 20% off (we’ll help you keep it alive)','20% off ends Sunday: start with a plant that forgives you'],
    ['Beginner-proof plants, 20% off till Sunday','Your first plant is 20% off till Sunday','Plants that forgive you: 20% off till Sunday'],
    ['20% off plants that forgive mistakes.','Beginner plants, 20% off till Sunday. Easy.','Hard to kill, 20% off until Sunday.']
  ];
  var notes=[
    'Generic. Could be any store, and it invented a 30% discount you never mentioned.',
    'It knows who is reading now.',
    'It has a job and a deadline.',
    'It follows your rules. Check the character counts.',
    'It sounds like someone from your shop wrote it.'
  ];
  var levels=['Could be anyone’s','Knows the reader','Has a job','Fits the rules','Sounds like us'];
  var s=0;
  var pr=$('#prompt2'),out=$('#out2'),meter=$$('#meter2 i'),ml=$('#mlabel2'),nt=$('#note2'),add=$('#add2'),rs=$('#reset2'),cnt=$('#count2');
  function render(){
    pr.textContent='';
    var l0=el('div','ln'+(s===0?' new':''),base);pr.appendChild(l0);
    for(var i=0;i<s;i++){pr.appendChild(el('div','ln'+(i===s-1?' new':''),adds[i].l))}
    out.textContent='';
    outs[s].forEach(function(t){
      var li=el('li');li.appendChild(el('span','t',t));
      var len=t.length;var constrained=s>=3;
      var n=el('span','n'+(constrained&&len<45?' fit':''),len+' chars'+(constrained&&len<45?' ✓':''));
      li.appendChild(n);out.appendChild(li);
    });
    meter.forEach(function(m,k){m.classList.toggle('on',k<=s)});
    ml.textContent=levels[s];nt.textContent=notes[s];
    cnt.textContent=s+' of 4 ingredients';
    if(s<4){add.disabled=false;add.textContent='Add: '+adds[s].n}else{add.disabled=true;add.textContent='All four added'}
  }
  add.addEventListener('click',function(){if(s<4){s++;render();if(s===4)award('m2:build',20)}});
  rs.addEventListener('click',function(){s=0;render()});
  render();
  C.persist('m2.step',{
    get:function(){return s},
    set:function(v){if(typeof v==='number'&&v%1===0&&v>=0&&v<=4){s=v;render()}}
  });
  makeQuiz($('#quiz2'),'m2',[
    {q:'Which ingredient stopped the AI from guessing who was reading?',
     o:['Audience','Constraints','Voice'],c:0,xp:15,
     why:'Audience was the first fix. Before it, the AI wrote for everyone.',
     hint:'Look at what changed between the first and second set of lines.'},
    {q:'You get 12 generic subject lines. What is the best first fix?',
     o:['Ask it to try harder','Add who it is for and what the offer is','Regenerate until one works'],c:1,xp:15,
     why:'A tighter brief narrows the odds. “Try harder” gives it nothing new to work with.',
     hint:'Which choice gives the AI new information?'}
  ]);
})();

/* ---------- Mission 3 ---------- */
(function(){
  var R=[
    {brief:'Intro paragraph for Fernwood Coffee’s cold brew post. Facts you gave it: small-batch roaster, cold brew steeped 12 to 18 hours. No statistics.',
     s:['Fernwood steeps its small-batch cold brew for 12 to 18 hours.',
        'A 2024 Harvard study found that 87% of cold brew drinkers feel more focused within ten minutes.',
        'Because the water is cold, the brew tastes less acidic than hot coffee, which many people find smoother.',
        'The long steep is what gives it that rounded, slow-sipping character.'],
     bad:1,tag:'Invented statistic',hint:'Look for something precise that you never supplied.',
     why:'A specific number and a named source sound trustworthy. You gave it neither, so it produced something shaped like a citation. Find the real source or cut the line.'},
    {brief:'Press blurb for a loyalty program. Facts you gave it: 1 point per dollar, free bag after 10 purchases, launches in March. No quotes.',
     s:['Fernwood Rewards launches in March.',
        'Members earn one point for every dollar spent.',
        '“It’s the best loyalty program in the Midwest,” said a leading food critic.',
        'After ten purchases, members get a free bag.'],
     bad:2,tag:'Invented quote',hint:'Check each line against the brief. Which one has no source in it?',
     why:'You never gave it a quote, so nobody said this. AI will happily write one and attribute it to someone vague or real. Only publish quotes from people who actually said them.'},
    {brief:'Summary of Instagram posting-time advice for a small bakery. Facts you gave it: none, general advice only.',
     s:['Posting at consistent times helps followers know when to expect you.',
        'The best time to post on Instagram is always 11 a.m. on Tuesdays.',
        'Your own account insights show when your followers are most active.',
        'Try a few time slots for two weeks, then compare reach.'],
     bad:1,tag:'Overconfident rule',hint:'Look for a word that leaves no room for exceptions.',
     why:'“Always” is the tell. Best times shift by audience and over time. Treat any universal rule as a guess and check it against your own analytics.'}
  ];
  var host=$('#rounds3'),idx=0,wrong=[],solved=false;
  function render(pre){
    var r=R[idx],tries=0;
    wrong=[];solved=false;
    host.textContent='';
    host.appendChild(el('p','roundline','Round '+(idx+1)+' of '+R.length));
    var br=el('div','brief');var bb=el('b',null,'Your brief: ');br.appendChild(bb);br.appendChild(document.createTextNode(r.brief));host.appendChild(br);
    host.appendChild(el('p','ask','The AI wrote this. Tap the one sentence you would not publish without checking.'));
    var list=el('div','sent');var btns=[];
    var msg=el('p','msg');msg.setAttribute('aria-live','polite');
    var rev=el('div','reveal');rev.hidden=true;
    r.s.forEach(function(t,i){
      var b=el('button','choice',t);b.type='button';
      b.addEventListener('click',function(){
        if(solved)return;
        if(i===r.bad){
          solve(true);
        }else{
          miss(b,i);
        }
      });
      list.appendChild(b);btns.push(b);
    });
    function solve(fresh){
          solved=true;
          var i=r.bad;
          btns.forEach(function(x,k){x.disabled=true;if(k===i)x.classList.add('ok');else x.classList.add('dim')});
          msg.textContent='';
          rev.textContent='';
          rev.appendChild(el('span','tagchip',r.tag));
          rev.appendChild(el('p',null,r.why));
          if(idx<R.length-1){
            var nb=el('button','btn','Next round');nb.type='button';nb.style.justifySelf='start';
            nb.addEventListener('click',function(){idx++;render()});rev.appendChild(nb);
          }else{
            rev.appendChild(el('p','note','That is all three rounds. The four tells below are your 10-second check.'));
          }
          rev.hidden=false;
          if(fresh)award('m3:r'+idx,10);
    }
    function miss(b,i){
          tries++;wrong.push(i);b.disabled=true;b.classList.add('no');
          msg.textContent=tries<2?'That one holds up against your brief. Keep looking.':'Hint: '+r.hint;
    }
    host.appendChild(list);host.appendChild(msg);host.appendChild(rev);
    if(pre){
      pre.w.forEach(function(i){miss(btns[i],i)});
      if(pre.s)solve(false);
    }
  }
  render();
  C.persist('m3.round',{
    get:function(){return {i:idx,w:wrong.slice(),s:solved}},
    set:function(v){
      if(!v||typeof v!=='object')return;
      var i=v.i;
      if(typeof i!=='number'||i%1!==0||i<0||i>=R.length)return;
      var w=[];
      if(Array.isArray(v.w))v.w.forEach(function(k){
        if(typeof k==='number'&&k%1===0&&k>=0&&k<R[i].s.length&&k!==R[i].bad&&w.indexOf(k)<0)w.push(k);
      });
      idx=i;render({w:w,s:v.s===true});
    }
  });
  makeQuiz($('#quiz3'),'m3',[
    {q:'Your AI draft says: “Studies show 9 in 10 customers prefer fresh-roasted coffee.” What do you do?',
     o:['Publish it, it sounds right','Ask the AI to confirm it is true','Find the study yourself, or cut the line'],c:2,xp:20,
     why:'The AI cannot vouch for its own claims. The check has to come from a source you can open.',
     hint:'Asking the AI to confirm itself is asking the same guesser twice.'}
  ]);
})();

/* ---------- Mission 4 ---------- */
(function(){
  var f={ch:$('#f-channel'),goal:$('#f-goal'),offer:$('#f-offer'),aud:$('#f-audience'),tone:$('#f-tone'),lim:$('#f-limit')};
  var pre=$('#p4'),copyBtn=$('#copy4'),cn=$('#copynote4');
  function v(x,ph){var t=x.value.replace(/\s+/g,' ').trim();return t||ph}
  function build(){
    return 'Act as a copywriter for a small business.\n\n'
      +'Write 3 '+v(f.ch,'[what you are writing]')+' for this offer: '+v(f.offer,'[your offer]')+'.\n'
      +'Audience: '+v(f.aud,'[your audience]')+'.\n'
      +'Goal: '+v(f.goal,'[your goal]')+'.\n'
      +'Tone: '+v(f.tone,'[your tone]')+'.\n'
      +'Limits: '+v(f.lim,'[your limit]')+'. No exclamation marks.\n\n'
      +'Use only the facts I gave you. Do not invent statistics, quotes, prices, or deadlines. If you need a fact I did not give you, ask me before writing.\n\n'
      +'Finish by telling me which of the three you would post and why, in one sentence.';
  }
  function refresh(){pre.textContent=build()}
  Object.keys(f).forEach(function(k){f[k].addEventListener('input',refresh);f[k].addEventListener('change',refresh)});
  refresh();
  function selectPre(){
    try{var r=document.createRange();r.selectNodeContents(pre);var s=window.getSelection();s.removeAllRanges();s.addRange(r);return true}catch(e){return false}
  }
  var copied=null;
  function copyNote(ok){
    copied=ok;
    cn.textContent=ok?'Copied. Paste it into your AI tool, then come back and grade the result.':'Text selected. Press copy on your keyboard, then paste it into your AI tool.';
  }
  function done(ok){
    copyNote(ok);
    award('m4:copy',20);
  }
  C.persist('m4.copied',{
    get:function(){return copied},
    set:function(v){if(typeof v==='boolean')copyNote(v)}
  });
  copyBtn.addEventListener('click',function(){
    var text=build();
    function fallback(){
      var sel=selectPre(),ok=false;
      try{ok=document.execCommand('copy')}catch(e){}
      done(ok&&sel);
    }
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){done(true)},fallback);
    }else{fallback()}
  });
  var boxes=$$('#checklist4 input'),ckmsg=$('#ckmsg');
  function checkAll(){
    var all=boxes.every(function(b){return b.checked});
    if(all){ckmsg.textContent='All four ticked. Mission complete.';award('m4:check',30)}
    else if(!C.has('m4:check')){ckmsg.textContent=''}
  }
  boxes.forEach(function(b){b.addEventListener('change',checkAll)});
  if(C.has('m4:check')){boxes.forEach(function(b){b.checked=true});ckmsg.textContent='All four ticked. Mission complete.'}
})();
})(window.Course);
