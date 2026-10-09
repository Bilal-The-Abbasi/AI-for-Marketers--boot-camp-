(function(C){
'use strict';
var $=C.$,$$=C.$$,el=C.el,award=C.award,makeQuiz=C.makeQuiz;

/* ---------- Mission 1: Strategy Map ---------- */
(function(){
  var QS=[
    {k:'quick',n:'Quick win',s:'High impact, low risk'},
    {k:'big',n:'Big bet',s:'High impact, high risk'},
    {k:'nice',n:'Nice to have',s:'Low impact, low risk'},
    {k:'skip',n:'Skip for now',s:'Low impact, high risk'}
  ];
  var USES=[
    {t:'Subject-line variants for the weekly email',r:'quick',
     why:'A person picks the winner in ten seconds. A weak line costs a few opens, not a customer, and it repeats every week.'},
    {t:'Customer replies that send automatically, with nobody reading first',r:'big',
     why:'It could give back hours each week, and one bad reply goes straight to a customer. Start with drafts a person approves.'},
    {t:'AI shifts the ad budget between campaigns on its own',r:'big',
     why:'Real money moves without anyone looking. The upside is real, so pilot it with a spending cap and a daily human glance.'},
    {t:'Writing the brand story from scratch',r:'nice',
     why:'You write it rarely, so the time saved is small. Use AI to react to your draft, not to replace your voice.'},
    {t:'A first draft of the monthly report from your exported numbers',r:'quick',
     why:'It saves hours every month, and you can check each figure against the export before anyone sees it.'},
    {t:'Lead scoring for 40 new leads a month (example volume)',r:'skip',
     why:'At 40 leads you can read them yourself. A wrong score could bury a good lead, and the payoff is tiny at this volume.'}
  ];
  function qname(k){for(var i=0;i<QS.length;i++){if(QS[i].k===k)return QS[i].n}return ''}
  var cardsEl=$('#l5m1-cards'),gridEl=$('#l5m1-grid'),trk=$('#l5m1-trk');
  var placed={},count=0,cards=[],cells={},ui=[],quiet=false;
  QS.forEach(function(q){
    var c=el('div','qcell '+q.k);
    var h=el('div','qh',q.n);h.appendChild(el('span',null,q.s));c.appendChild(h);
    gridEl.appendChild(c);cells[q.k]=c;
  });
  USES.forEach(function(u,i){
    var card=el('div','ucard');card.hidden=(i!==0);
    card.appendChild(el('p','ut',u.t));
    var pick=el('div','qpick');var bs=[];
    var fb=el('p','fb');fb.setAttribute('aria-live','polite');
    QS.forEach(function(q){
      var b=el('button','choice qb');b.type='button';
      b.appendChild(el('b',null,q.n));b.appendChild(el('span','qs',q.s));
      b.addEventListener('click',function(){place(i,q.k,bs,fb)});
      pick.appendChild(b);bs.push(b);
    });
    card.appendChild(pick);card.appendChild(fb);
    cardsEl.appendChild(card);cards.push(card);ui.push({bs:bs,fb:fb});
  });
  function place(i,k,bs,fb){
    if(placed[i]!==undefined)return;
    var u=USES[i];placed[i]=k;count++;
    bs.forEach(function(b,bi){
      b.disabled=true;
      if(QS[bi].k===u.r)b.classList.add('ok');
      else if(QS[bi].k===k)b.classList.add('no');
      else b.classList.add('dim');
    });
    fb.textContent=(k===u.r?'Same as our read. ':'We put this in '+qname(u.r)+'. ')+u.why
      +(k===u.r?'':' Your call can be fair if your team is different.');
    var it=el('div','qitem',u.t);
    if(k!==u.r)it.appendChild(el('i',null,'Our read: '+qname(u.r)));
    cells[k].appendChild(it);
    cards[i].hidden=false;
    for(var j=0;j<cards.length;j++){if(placed[j]===undefined){cards[j].hidden=false;break}}
    trk.textContent=count>=USES.length?'All six placed. Now pick your top three.':'Placed '+count+' of '+USES.length;
    if(count>=USES.length&&!quiet)award('m1:place',15);
  }
  var picksEl=$('#l5m1-picks'),pmsg=$('#l5m1-pickmsg'),lock=$('#l5m1-lock'),lmsg=$('#l5m1-lockmsg'),why=$('#l5m1-why');
  var chosen={},nchosen=0,chips=[];
  USES.forEach(function(u,i){
    var b=el('button','chip',u.t);b.type='button';b.setAttribute('aria-pressed','false');
    b.addEventListener('click',function(){
      if(chosen[i]){delete chosen[i];nchosen--;b.setAttribute('aria-pressed','false');pmsg.textContent=nchosen+' of 3 chosen.';return}
      if(nchosen>=3){pmsg.textContent='Three is the limit. Tap one you picked to put it back.';return}
      chosen[i]=true;nchosen++;b.setAttribute('aria-pressed','true');
      pmsg.textContent=nchosen+' of 3 chosen.';
    });
    picksEl.appendChild(b);chips.push(b);
  });
  lock.addEventListener('click',function(){
    if(count<USES.length){lmsg.textContent='Place all six ideas on the map first.';return}
    if(nchosen!==3){lmsg.textContent='Pick exactly three. You have '+nchosen+'.';return}
    if(!why.value.replace(/\s+/g,' ').trim()){lmsg.textContent='Add a line on why. It is the part your team will ask about.';return}
    var quick=0,big=0;
    Object.keys(chosen).forEach(function(i){var r=USES[i].r;if(r==='quick')quick++;if(r==='big')big++});
    var m;
    if(quick>=2)m='Strong start. Mostly quick wins, so you learn fast and the downside stays small.';
    else if(big>=2)m='Two big bets at once is a lot to supervise. Start with one, and put a person on it.';
    else m='Reasonable, but your list has few quick wins. A first clean win builds trust for the bigger moves.';
    lmsg.textContent='Locked in. '+m;
    award('m1:top3',15);
  });
  C.persist('m1.map',{
    get:function(){return USES.map(function(u,i){return placed[i]===undefined?null:placed[i]})},
    set:function(v){
      if(!Array.isArray(v))return;
      quiet=true;
      try{
        USES.forEach(function(u,i){
          var k=v[i];
          if(placed[i]!==undefined||typeof k!=='string'||!cells[k])return;
          place(i,k,ui[i].bs,ui[i].fb);
        });
      }finally{quiet=false}
    }
  });
  C.persist('m1.picks',{
    get:function(){return {c:Object.keys(chosen).map(Number),p:pmsg.textContent,l:lmsg.textContent}},
    set:function(v){
      if(!v||typeof v!=='object')return;
      if(Array.isArray(v.c)){
        chosen={};nchosen=0;
        v.c.forEach(function(i){
          if(typeof i==='number'&&i>=0&&i<USES.length&&i%1===0&&!chosen[i]&&nchosen<3){chosen[i]=true;nchosen++}
        });
        chips.forEach(function(b,i){b.setAttribute('aria-pressed',chosen[i]?'true':'false')});
      }
      if(typeof v.p==='string')pmsg.textContent=v.p.slice(0,400);
      if(typeof v.l==='string')lmsg.textContent=v.l.slice(0,400);
    }
  });
  makeQuiz($('#quiz1'),'m1',[
    {q:'Which is the safest place for a team to start?',
     o:['AI moves ad budgets on its own','AI drafts variants and a person picks one','AI sends customer replies unreviewed'],c:1,xp:10,
     why:'A person chooses, so a bad draft never ships. You learn how the tool behaves before it can cost you.',
     hint:'Look for the option where a person decides before anything goes out.'},
    {q:'A task is high impact and high risk. What is the sensible move?',
     o:['Never try it','Pilot it small, with a cap and a person watching','Run it fully automatic because the impact is high'],c:1,xp:10,
     why:'High impact is worth pursuing. A small pilot with a cap and a reviewer lets you collect proof before you scale.',
     hint:'There is a middle path between never and all at once.'}
  ]);
})();

/* ---------- Mission 2: Rules of the Road ---------- */
(function(){
  var OPT=[{k:'fine',n:'Fine'},{k:'sign',n:'Needs a human sign-off'},{k:'dont',n:'Don’t'}];
  var CARDS=[
    {a:'fine',tag:'Everyday drafting',t:'You ask your AI tool for 10 subject-line ideas for a sale, then edit one and send it.',
     why:'Nothing private goes in, and you read it before it ships.'},
    {a:'dont',tag:'Customer data',t:'You paste a spreadsheet of customer names, emails, and order history into a free AI tool to tidy it up.',
     why:'Customer data belongs only in tools your company has approved for it. Test your prompt with made-up sample rows instead.'},
    {a:'sign',tag:'Claims',t:'AI drafts an ad for a health clinic that says its treatment “works for most patients.”',
     why:'A health claim needs evidence behind it and a qualified reviewer to approve the wording before it runs.'},
    {a:'dont',tag:'Testimonials',t:'You ask AI to write five glowing customer reviews to fill the testimonials page.',
     why:'Made-up testimonials are fake, however nice they read. Ask real customers for real ones.'},
    {a:'sign',tag:'Disclosure',t:'The chat box on your site is answered by AI, and nothing tells the visitor.',
     why:'Whether and how to say so depends on your industry and place. Have whoever owns policy decide once, then follow it.'},
    {a:'dont',tag:'Copyrighted material',t:'You paste a competitor’s brochure into AI and ask for a “rewrite” to use as your own.',
     why:'That is borrowing someone else’s work with extra steps. Write from your own facts and your own angle.'},
    {a:'fine',tag:'Images',t:'AI makes an abstract background image for a blog header. No people, no logos, no brand marks.',
     why:'Low stakes, and nothing real is misrepresented. Still follow your tool’s usage terms.'},
    {a:'sign',tag:'Testimonials',t:'A customer sent a lovely note. You ask AI to tighten it for an ad.',
     why:'You need the customer’s permission, and the edited version must still say what they meant. Show them, and get a second pair of eyes.'},
    {a:'dont',tag:'Brand safety',t:'An AI tool replies to angry public reviews overnight, and nobody reads the replies before they post.',
     why:'Public, emotional, and fast is the worst mix to automate. Let AI draft and a person send.'},
    {a:'fine',tag:'Your own words',t:'You paste a blog post your team already published and ask for a clearer version of the intro.',
     why:'It is your own public text, so nothing private is shared. Read the result before you swap it in.'}
  ];
  function oname(k){for(var i=0;i<OPT.length;i++){if(OPT[i].k===k)return OPT[i].n}return ''}
  var host=$('#l5m2-host'),endEl=$('#l5m2-end'),cardLbl=$('#l5m2-card'),stLbl=$('#l5m2-streak'),bestLbl=$('#l5m2-best');
  var token=0,streak=0,best=0,right=0,done=0,cur=0,quiet=false,ans=[],fin=false,cbtn=[],nbtn=[];
  function labels(){
    cardLbl.textContent='Card '+Math.min(cur+1,CARDS.length)+' of '+CARDS.length;
    stLbl.textContent='Streak '+streak;bestLbl.textContent='Best streak '+best;
  }
  function build(){
    token++;var my=token;streak=0;best=0;right=0;done=0;cur=0;ans=[];fin=false;cbtn=[];nbtn=[];
    host.textContent='';endEl.textContent='';labels();
    var cards=[];
    CARDS.forEach(function(c,i){
      var card=el('div','ucard');card.hidden=(i!==0);
      card.appendChild(el('p','mini',c.tag));
      card.appendChild(el('p','scn',c.t));
      var list=el('div','sent');var bs=[];
      var rev=el('div','reveal');rev.hidden=true;rev.setAttribute('aria-live','polite');
      var answered=false;
      ans[i]=null;cbtn[i]=[];
      OPT.forEach(function(o,oi){
        var b=el('button','choice',o.n);b.type='button';
        b.addEventListener('click',function(){
          if(my!==token||answered)return;
          answered=true;done++;ans[i]=oi;
          var ok=(o.k===c.a);
          if(ok){streak++;right++;if(streak>best)best=streak}else{streak=0}
          bs.forEach(function(x,k){
            x.disabled=true;
            if(OPT[k].k===c.a)x.classList.add('ok');
            else if(k===OPT.indexOf(o))x.classList.add('no');
            else x.classList.add('dim');
          });
          rev.textContent='';
          rev.appendChild(el('span','tagchip',ok?'Matches our call':'Our call: '+oname(c.a)));
          rev.appendChild(el('p',null,(ok?'Streak: '+streak+'. ':'Streak reset. ')+c.why));
          var last=(i===CARDS.length-1);
          var nb=el('button','btn',last?'See my results':'Next card');nb.type='button';nb.style.justifySelf='start';
          nbtn[i]=nb;
          nb.addEventListener('click',function(){
            if(my!==token)return;
            nb.disabled=true;
            if(last){finish()}
            else{cur=i+1;cards[i+1].hidden=false;labels()}
          });
          rev.appendChild(nb);rev.hidden=false;
          labels();
          if(done>=5&&!quiet)award('m2:half',10);
          if(done>=CARDS.length&&!quiet)award('m2:sort',15);
        });
        list.appendChild(b);bs.push(b);cbtn[i].push(b);
      });
      card.appendChild(list);card.appendChild(rev);host.appendChild(card);cards.push(card);
    });
  }
  function finish(){
    fin=true;cur=CARDS.length;labels();
    var m=right>=9?'You think like a policy owner.':right>=6?'Solid instincts. The misses are the cards worth a second look.':'Rules like these are easy to get wrong, which is the point of writing them down.';
    endEl.textContent='You matched our call on '+right+' of '+CARDS.length+'. Best streak: '+best+'. '+m
      +' Your own policies and counsel have the final word.';
    var again=el('button','btn ghost','Play again');again.type='button';again.setAttribute('data-smoke','skip');
    again.style.marginTop='10px';again.style.display='block';
    again.addEventListener('click',function(){build()});
    host.appendChild(again);
  }
  build();
  C.persist('m2.run',{
    get:function(){return {a:ans.slice(),cur:cur,fin:fin}},
    set:function(v){
      if(!v||typeof v!=='object'||!Array.isArray(v.a))return;
      quiet=true;
      try{
        build();
        var c=(typeof v.cur==='number')?Math.max(0,Math.min(CARDS.length,Math.floor(v.cur))):0;
        var f=(v.fin===true);
        for(var i=0;i<CARDS.length;i++){
          var a=v.a[i];
          if(typeof a!=='number'||a<0||a>=OPT.length||a%1!==0)break;
          cbtn[i][a].click();
          if((f||i<c)&&nbtn[i])nbtn[i].click();
        }
      }finally{quiet=false}
    }
  });
  makeQuiz($('#quiz2'),'m2',[
    {q:'You are not sure a claim in your ad is allowed in your industry. What do you do?',
     o:['Run it small and see if anyone complains','Ask the AI whether it is allowed','Ask whoever owns compliance, or your counsel, before it runs'],c:2,xp:15,
     why:'The AI cannot vouch for rules in your industry and place. A person who is accountable for the answer has to give it.',
     hint:'Who is responsible if the claim turns out to be a problem?'},
    {q:'A teammate pastes a client’s private contract into a free AI tool to summarize it. Which rule would have prevented this?',
     o:['Use your best judgment','Name which tools are approved for which kinds of data, in writing','Never use AI for summaries'],c:1,xp:10,
     why:'A written list of approved tools by data type removes the guessing. Blanket bans get ignored and judgment varies by person.',
     hint:'Pick the rule a new hire could follow on day one.'}
  ]);
})();

/* ---------- Mission 3: Prove It ---------- */
(function(){
  var WEEKS=4.33;
  var F=[
    {id:'hours',l:'Hours saved per week',min:0,max:20,step:0.5,def:6,pre:'',suf:' h'},
    {id:'review',l:'Review time per week',min:0,max:20,step:0.5,def:1.5,pre:'',suf:' h'},
    {id:'q',l:'Quality loss (share of kept time lost to redo)',min:0,max:60,step:1,def:15,pre:'',suf:'%'},
    {id:'rate',l:'Hourly cost of your time',min:0,max:150,step:1,def:35,pre:'$',suf:''},
    {id:'tool',l:'Tool cost per month',min:0,max:500,step:5,def:40,pre:'$',suf:''}
  ];
  var BAD={hours:3,review:2.5,q:30,rate:35,tool:60};
  var fieldsEl=$('#l5m3-fields'),netEl=$('#l5m3-net'),verdict=$('#l5m3-verdict'),formula=$('#l5m3-formula');
  var nums={},rngs={};
  function clamp(v,f){if(isNaN(v))v=0;return Math.max(f.min,Math.min(f.max,v))}
  function val(f){var v=parseFloat(nums[f.id].value);return clamp(v,f)}
  function money(x){var r=Math.round(Math.abs(x));var s='$'+String(r).replace(/\B(?=(\d{3})+(?!\d))/g,',');return (x<0&&r>0?'-':'')+s}
  function num(x){return String(Math.round(x*100)/100)}
  F.forEach(function(f){
    var w=el('div','fld wide');
    var lab=el('label',null,null);lab.setAttribute('for','l5m3-'+f.id);
    lab.appendChild(el('span',null,f.l));w.appendChild(lab);
    var pair=el('div','pair');
    var n=document.createElement('input');n.type='number';n.id='l5m3-'+f.id;n.min=f.min;n.max=f.max;n.step=f.step;n.value=f.def;n.setAttribute('inputmode','decimal');
    var r=document.createElement('input');r.type='range';r.min=f.min;r.max=f.max;r.step=f.step;r.value=f.def;r.setAttribute('aria-label',f.l+' slider');
    n.addEventListener('input',function(){
      var v=parseFloat(n.value);if(!isNaN(v))r.value=clamp(v,f);
      touched();calc();
    });
    n.addEventListener('change',function(){n.value=clamp(parseFloat(n.value),f);r.value=n.value;calc()});
    r.addEventListener('input',function(){n.value=r.value;touched();calc()});
    pair.appendChild(n);pair.appendChild(r);w.appendChild(pair);fieldsEl.appendChild(w);
    nums[f.id]=n;rngs[f.id]=r;
  });
  var booting=true;setTimeout(function(){booting=false},0);
  function touched(){if(booting)return;award('m3:calc',10)}
  function setAll(o){F.forEach(function(f){nums[f.id].value=o[f.id];rngs[f.id].value=o[f.id]});calc()}
  function calc(){
    var h=val(F[0]),rv=val(F[1]),q=val(F[2]),rate=val(F[3]),tool=val(F[4]);
    var kept=h-rv,usable=kept*(1-q/100),perWeek=usable*rate,value=perWeek*WEEKS,net=value-tool;
    netEl.textContent=money(net)+' a month';
    netEl.className='bignum '+(net>0.5?'pos':net<-0.5?'neg':'');
    var be='';
    var denom=(1-q/100)*rate*WEEKS;
    if(denom>0){be=' You break even at about '+num(Math.round((tool/denom+rv)*10)/10)+' hours saved per week.'}
    verdict.textContent=(net>0.5?'Positive, but only if the saved time went to real work.':net<-0.5?'Negative. At these numbers the tool costs more than it returns.':'About break-even.')+be;
    formula.textContent='';
    function li(words,math){var x=el('li',null,words);x.appendChild(el('span','fm',math));formula.appendChild(x)}
    li('Hours kept: hours saved minus the time you spend reviewing.',num(h)+' - '+num(rv)+' = '+num(kept)+' hours a week');
    li('Usable hours: hours kept, minus the share lost to redo or weaker quality.',num(kept)+' x (1 - '+num(q/100)+') = '+num(usable)+' hours a week');
    li('Value per month: usable hours times your hourly cost times 4.33 weeks.',num(usable)+' x '+money(rate)+' x '+WEEKS+' = '+money(value));
    li('Net per month: that value minus what the tool costs.',money(value)+' - '+money(tool)+' = '+money(net));
    li('Net per year: the monthly net times 12.',money(net)+' x 12 = '+money(Math.round(net)*12));
  }
  $('#l5m3-bad').addEventListener('click',function(){setAll(BAD);award('m3:bad',10)});
  $('#l5m3-reset').addEventListener('click',function(){
    var o={};F.forEach(function(f){o[f.id]=f.def});setAll(o);
  });
  calc();

  /* vanity vs real */
  var M=[
    {t:'Number of AI drafts generated this month',a:'vanity',why:'Activity, not outcome. A pile of drafts proves nothing reached anyone.'},
    {t:'Hours from brief to approved draft',a:'real',why:'Time is what you are buying. Measure the same task before and after.'},
    {t:'Posts published per week',a:'vanity',why:'More posts is not more results. Pair it with what the posts did.'},
    {t:'Cost per qualified lead',a:'real',why:'It ties spend to an outcome the business cares about.'},
    {t:'Share of AI drafts approved with light edits',a:'real',why:'A quality check. If most drafts need heavy rewrites, the saved time is a mirage.'},
    {t:'Number of prompts run by the team',a:'vanity',why:'Usage is not value. Heavy use of a weak workflow is still a weak workflow.'}
  ];
  var mhost=$('#l5m3-metrics'),mdone=0,mq=false,mans=[],mfn=[];
  M.forEach(function(m,mi){
    var row=el('div','mrow');row.appendChild(el('p','mt',m.t));
    var chips=el('div','chips');var bs=[];var fb=el('p','fb');fb.setAttribute('aria-live','polite');
    var answered=false;
    ['vanity','real'].forEach(function(k){
      var b=el('button','chip',k==='vanity'?'Vanity':'Real');b.type='button';b.setAttribute('aria-pressed','false');
      b.addEventListener('click',function(){
        if(answered)return;answered=true;mdone++;mans[mi]=k;
        bs.forEach(function(x){x.disabled=true});
        b.setAttribute('aria-pressed','true');
        if(k===m.a)b.classList.add('seen');
        fb.textContent=(k===m.a?'Yes. ':'Not quite, this one is '+m.a+'. ')+m.why;
        if(mdone>=M.length&&!mq)award('m3:vanity',10);
      });
      chips.appendChild(b);bs.push(b);
    });
    mfn[mi]=function(k){bs[k==='vanity'?0:1].click()};
    row.appendChild(chips);row.appendChild(fb);mhost.appendChild(row);
  });

  /* what could be wrong */
  var D=[
    {t:'The saved hours never became other work',n:'Hits: hours saved. Time only counts if it went somewhere useful. Ask what you did with the hours. If the answer is nothing, call it relief, not return.'},
    {t:'Review took longer than I guessed',n:'Hits: review time. People often guess low. Time it for one real week and use that.'},
    {t:'Drafts needed heavy rewrites',n:'Hits: quality loss. Raise the percentage, and track how many drafts you approve with light edits.'},
    {t:'The tool cost grows as more people join',n:'Hits: tool cost. Multiply by the seats you really expect, plus any add-ons.'},
    {t:'I only counted my best weeks',n:'Hits: hours saved. Use an average over at least a month, messy weeks included.'}
  ];
  var dhost=$('#l5m3-doubts'),dmsg=$('#l5m3-doubtmsg'),dseen={},dn=0,dsel=-1,dq=false,dbtn=[];
  D.forEach(function(d,i){
    var b=el('button','chip',d.t);b.type='button';b.setAttribute('aria-pressed','false');
    b.addEventListener('click',function(){
      $$('#l5m3-doubts .chip').forEach(function(x){x.setAttribute('aria-pressed','false')});
      b.setAttribute('aria-pressed','true');b.classList.add('seen');dsel=i;
      if(!dseen[i]){dseen[i]=true;dn++}
      dmsg.textContent=d.n+(dn>=3?'':' ('+dn+' of 3 looked at.)');
      if(dn>=3&&!dq)award('m3:wrong',10);
    });
    dhost.appendChild(b);dbtn.push(b);
  });
  C.persist('m3.metrics',{
    get:function(){return M.map(function(m,i){return mans[i]||null})},
    set:function(v){
      if(!Array.isArray(v))return;
      mq=true;
      try{M.forEach(function(m,i){if(!mans[i]&&(v[i]==='vanity'||v[i]==='real'))mfn[i](v[i])})}
      finally{mq=false}
    }
  });
  C.persist('m3.doubts',{
    get:function(){return {seen:Object.keys(dseen).map(Number),sel:dsel}},
    set:function(v){
      if(!v||typeof v!=='object'||!Array.isArray(v.seen))return;
      var ok=v.seen.filter(function(i){return typeof i==='number'&&i>=0&&i<D.length&&i%1===0});
      if(!ok.length)return;
      dq=true;
      try{
        ok.forEach(function(i){if(!dseen[i])dbtn[i].click()});
        if(typeof v.sel==='number'&&dseen[v.sel]&&v.sel!==dsel)dbtn[v.sel].click();
      }finally{dq=false}
    }
  });
  makeQuiz($('#quiz3'),'m3',[
    {q:'Your calculator shows +$540 a month (an example). What should you do before you report it?',
     o:['Report it, math is math','Check the hours saved and the rework rate against a month of real notes','Round it up so the number looks safe'],c:1,xp:10,
     why:'The formula is only as good as its inputs. Replace guesses with timed work and counted rewrites, then say which numbers are still estimates.',
     hint:'The math was fine. Which part of it came from a guess?'}
  ]);
})();

/* ---------- Mission 4: Ship It ---------- */
(function(){
  var T=[
    {n:'Spring sale email series',
     goal:'Bring in 40 first-time buyers from a 3-email series in two weeks (example target)',
     inputs:'Offer details and dates, product list, last year’s best subject lines, brand voice notes',
     steps:'AI: draft three emails and five subject lines for each\nMe: cut any claim, price, or date that is not in the offer details\nAI: tighten each email to the length limit\nMe: send a test to myself and schedule the series',
     checks:'I read every email before it is scheduled\nA second person checks the discount and the dates',
     metric:'First-time buyers from the series, counted 14 days after the first send',
     risk:'AI invents a discount or deadline. Guard: I check every number against the offer sheet.'},
    {n:'Weekly social posts',
     goal:'Publish three posts a week in under 45 minutes of my time (example target)',
     inputs:'This week’s promotions, two photos, three past posts that did well, brand voice notes',
     steps:'AI: draft six post ideas with captions from my inputs\nMe: pick three and rewrite one line in each so it sounds like us\nAI: suggest alt text for each photo\nMe: schedule the posts',
     checks:'I read every caption before it is scheduled\nNothing mentions a customer by name without their okay',
     metric:'Minutes spent per week, tracked for four weeks, plus saves and replies per post',
     risk:'Captions drift into a generic voice. Guard: I keep three past posts in the prompt every week.'},
    {n:'Monthly performance report',
     goal:'Send the monthly report by the 5th, with a first draft ready in 30 minutes (example target)',
     inputs:'Exported numbers from last month and the month before, the goals sheet, notes on anything unusual',
     steps:'Me: export the numbers into one sheet\nAI: write a plain summary of what changed and three possible reasons\nMe: check every figure against the export and delete reasons I cannot support\nMe: add next month’s plan and send',
     checks:'Every number in the report is checked against the export\nI confirm the reasons with someone who ran the campaign',
     metric:'Hours spent per report, compared with the last three manual ones, by month end',
     risk:'AI explains a change with a reason that sounds right and is not. Guard: reasons stay as questions until confirmed.'},
    {n:'New-lead follow-up emails',
     goal:'Reply to every new lead within one business day, using drafts (example target)',
     inputs:'The lead’s form answers, our service list, two past replies that worked, our meeting link',
     steps:'AI: draft a reply from the form answers and past replies\nMe: read it, fix anything that is not true, and add one personal line\nMe: send from my own inbox\nAI: draft a gentle follow-up for leads who have not replied in three days',
     checks:'I read every reply before it is sent\nNo reply promises a price or a date I have not confirmed',
     metric:'Share of leads answered within one business day, counted weekly for a month',
     risk:'A draft promises something we do not offer. Guard: the service list is the only source in the prompt.'}
  ];
  var F={
    sel:$('#l5m4-campaign'),goal:$('#l5m4-goal'),inputs:$('#l5m4-inputs'),steps:$('#l5m4-steps'),
    checks:$('#l5m4-checks'),metric:$('#l5m4-metric'),risk:$('#l5m4-risk')
  };
  var plan=$('#l5m4-plan'),rev=$('#l5m4-review'),rmsg=$('#l5m4-reviewmsg'),cp=$('#l5m4-copy'),cn=$('#l5m4-copynote');
  T.forEach(function(t,i){var o=document.createElement('option');o.value=i;o.textContent=t.n;F.sel.appendChild(o)});
  function load(i){
    var t=T[i]||T[0];
    F.goal.value=t.goal;F.inputs.value=t.inputs;F.steps.value=t.steps;
    F.checks.value=t.checks;F.metric.value=t.metric;F.risk.value=t.risk;
  }
  function lines(s){return s.split(/\r?\n/).map(function(x){return x.replace(/\s+/g,' ').trim()}).filter(function(x){return x})}
  function one(s){return s.replace(/\s+/g,' ').trim()}
  function build(){
    var idx=parseInt(F.sel.value,10);if(isNaN(idx)||!T[idx])idx=0;
    var st=lines(F.steps.value),ck=lines(F.checks.value),out=[];
    out.push('AI WORKFLOW PLAN');
    out.push('Campaign: '+T[idx].n);
    out.push('Goal: '+(one(F.goal.value)||'[add a goal]'));
    out.push('What goes in: '+(one(F.inputs.value)||'[add your inputs]'));
    out.push('');out.push('Steps:');
    if(st.length){st.forEach(function(s,i){out.push((i+1)+'. '+s)})}else{out.push('[add your steps]')}
    out.push('');out.push('Human checkpoints:');
    if(ck.length){ck.forEach(function(s){out.push('- '+s)})}else{out.push('[add a checkpoint]')}
    out.push('');
    out.push('Success metric: '+(one(F.metric.value)||'[add a metric]'));
    out.push('Top risk: '+(one(F.risk.value)||'[add a risk and a guard]'));
    return out.join('\n');
  }
  function refresh(){plan.textContent=build()}
  function sync(){
    var ready=C.has('m4:plan')&&C.has('m4:check');
    cp.disabled=!ready;
    cn.textContent=ready?(C.has('m4:copy')?'Copied. Your plan is ready to share.':'Ready. Copy it and send it to your team.'):'Locked until your plan is checked and the boxes are ticked.';
  }
  F.sel.addEventListener('change',function(){load(F.sel.value);refresh()});
  ['goal','inputs','steps','checks','metric','risk'].forEach(function(k){
    F[k].addEventListener('input',refresh);F[k].addEventListener('change',refresh);
  });
  load(0);refresh();
  rev.addEventListener('click',function(){
    var empty=[];
    [['goal','goal'],['inputs','inputs'],['steps','steps'],['checks','human checkpoints'],['metric','success metric'],['risk','top risk']].forEach(function(p){
      if(!one(F[p[0]].value))empty.push(p[1]);
    });
    if(empty.length){rmsg.textContent='Still empty: '+empty.join(', ')+'.';return}
    var tips=[];
    if(lines(F.steps.value).length<3)tips.push('Add at least three steps so the handoffs show.');
    if(!/\d/.test(F.metric.value))tips.push('Put a number and a date in the metric.');
    if(!/\b(me|i)\b/i.test(F.checks.value))tips.push('Name a person in the checkpoints, such as “I read it”.');
    rmsg.textContent=tips.length?'Plan accepted. To tighten it: '+tips.join(' '):'Plan accepted. No gaps found: steps, checkpoints, metric, and risk are all there.';
    award('m4:plan',20);sync();
  });
  var boxes=$$('#l5m4-list input');
  function checkAll(){
    var all=boxes.every(function(b){return b.checked});
    if(all)award('m4:check',10);
    sync();
  }
  boxes.forEach(function(b){b.addEventListener('change',checkAll)});
  if(C.has('m4:check')){boxes.forEach(function(b){b.checked=true})}
  function done(ok){
    cn.textContent=ok?'Copied. Paste it into a doc and send it to your team.':'Text selected. Press copy on your keyboard, then paste it into a doc.';
    award('m4:copy',20);
  }
  cp.addEventListener('click',function(){
    if(cp.disabled)return;
    C.copy(build(),plan,done);
  });
  sync();
  C.persist('m4.review',{
    get:function(){return rmsg.textContent},
    set:function(v){if(typeof v==='string')rmsg.textContent=v.slice(0,600);sync()}
  });
})();
})(window.Course);
