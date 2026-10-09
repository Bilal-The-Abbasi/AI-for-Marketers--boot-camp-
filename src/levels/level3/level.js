(function(C){
'use strict';
var $=C.$,$$=C.$$,el=C.el,award=C.award,makeQuiz=C.makeQuiz;

function btn(cls,text){var b=el('button',cls,text);b.type='button';return b}

/* Shared helper: a group of answer buttons where wrong picks give a hint and right pick resolves. */
function pickGroup(host,opts,correct,onSolved){
  var btns=[],solved=false;
  var msg=null;
  opts.forEach(function(o,i){
    var b=btn('choice',o.t);
    b.addEventListener('click',function(){
      if(solved)return;
      if(i===correct){
        solved=true;
        btns.forEach(function(x,k){x.disabled=true;x.classList.add(k===i?'ok':'dim')});
        onSolved(o.why||'',true);
      }else{
        b.disabled=true;b.classList.add('no');
        onSolved(o.hint||'',false);
      }
    });
    host.appendChild(b);btns.push(b);
  });
  /* saved state: one code per button, 0 untouched, 1 wrong pick, 2 right pick, 3 dimmed after solving */
  btns.read=function(){return btns.map(function(b){return b.classList.contains('ok')?2:b.classList.contains('no')?1:b.classList.contains('dim')?3:0})};
  btns.restore=function(codes){
    if(!Array.isArray(codes)||solved)return false;
    var hit=-1;
    btns.forEach(function(b,k){if(codes[k]===2)hit=k});
    btns.forEach(function(b,k){
      if(codes[k]===1){b.disabled=true;b.classList.add('no')}
      if(hit>=0){b.disabled=true;b.classList.add(k===hit?'ok':'dim')}
    });
    if(hit>=0)solved=true;
    return hit>=0;
  };
  return btns;
}

/* ---------- Mission 1: Research Sprint ---------- */
(function(){
  var BINS=['Use it','Check first','Cut'];
  var CLAIMS=[
    {t:'In your survey, 62% of the 240 respondents said they drink tea mostly in the afternoon.',a:0,
     why:'It matches the survey you pasted, so you can point to exactly where it came from.'},
    {t:'As one customer put it: “I swapped my third coffee for your Assam and my afternoons changed.”',a:2,
     why:'You never gave it a quote. Unless you can find it in a real review or message, it was invented. Cut it.'},
    {t:'Remote workers in this age group typically spend about $30 a month on specialty drinks.',a:1,
     why:'A specific number with no source in anything you pasted. It may be close. Find a real source or label it as an assumption.'},
    {t:'Your respondents’ most common reason for buying is a break from coffee.',a:0,
     why:'41% is the biggest share in your data, ahead of taste at 33%.'},
    {t:'An industry report predicts loose-leaf sales to this segment will double within three years.',a:2,
     why:'No report name, no link, and it is a forecast. You cannot check what you cannot find. Cut it, or search for a real report yourself.'},
    {t:'Many in this segment work hybrid schedules, so the afternoon is their quiet window for a break.',a:1,
     why:'Sensible, and it fits your afternoon result. But your survey never asked about schedules. Check it with a question to customers.'}
  ];
  var host=$('#l3m1-claims'),track=$('#l3m1-track');
  var done=0,right=0,picks=CLAIMS.map(function(){return -1}),crow=[];
  function paintTrack(){
    track.textContent=done>=CLAIMS.length
      ?'All six sorted. '+right+' of 6 matched. Wrong calls teach more than right ones.'
      :'Sorted '+done+' of '+CLAIMS.length+'.';
  }
  CLAIMS.forEach(function(c,ci){
    var box=el('div','claim');
    box.appendChild(el('p','txt',c.t));
    var chips=el('div','chips');
    var res=el('p','res');res.setAttribute('aria-live','polite');
    var bs=BINS.map(function(name,bi){
      var b=btn('chip',name);b.setAttribute('aria-pressed','false');
      b.addEventListener('click',function(){
        applyPick(ci,bi);
        paintTrack();
        if(done>=CLAIMS.length)award('m1:sort',20);
      });
      chips.appendChild(b);return b;
    });
    box.appendChild(chips);box.appendChild(res);host.appendChild(box);
    crow.push({box:box,res:res,bs:bs});
  });
  function applyPick(ci,bi){
    var r=crow[ci],c=CLAIMS[ci];
    r.bs.forEach(function(x){x.disabled=true});
    r.bs[bi].setAttribute('aria-pressed','true');
    var ok=(bi===c.a);
    r.box.classList.add(ok?'right':'miss');
    r.res.textContent=(ok?'Right call. ':'Closer to “'+BINS[c.a]+'”. ')+c.why;
    picks[ci]=bi;done++;if(ok)right++;
  }
  paintTrack();
  C.persist('m1.sort',{
    get:function(){return picks.slice()},
    set:function(v){
      if(!Array.isArray(v))return;
      CLAIMS.forEach(function(c,ci){
        var bi=v[ci];
        if(picks[ci]===-1&&typeof bi==='number'&&bi>=0&&bi<BINS.length&&bi%1===0)applyPick(ci,bi);
      });
      paintTrack();
    }
  });

  var MOVES=[
    {n:'Paste your own data',l:'My survey results are below. Base your findings on them and say which result each finding comes from.',
     o:'Findings now point at your survey: “62% drink tea mostly in the afternoon (your survey).”'},
    {n:'Ask what it is unsure of',l:'Tell me what you are unsure about, and what you could not know without a source.',
     o:'It admits gaps: “I do not know typical monthly spend for this group. I would need a source.”'},
    {n:'Ask for a claims-to-verify list',l:'End with a list of every claim I should verify, and how to check each one.',
     o:'It hands you the to-do list: “Verify: monthly spend figure. Check: hybrid schedules, ask customers.”'}
  ];
  var base='Summarize what we know about home-office workers who buy loose-leaf tea.';
  var baseOut='A smooth summary. Every claim sounds equally sure.';
  var on=[false,false,false],seen=[false,false,false],last=-1;
  var chipsEl=$('#l3m1-moves'),pr=$('#l3m1-prompt'),out=$('#l3m1-out'),msg=$('#l3m1-msg');
  var mb=MOVES.map(function(m,i){
    var b=btn('chip',m.n);b.setAttribute('aria-pressed','false');
    b.addEventListener('click',function(){
      on[i]=!on[i];if(on[i]){seen[i]=true;last=i}else last=-1;
      b.setAttribute('aria-pressed',on[i]?'true':'false');
      if(seen[i])b.classList.add('seen');
      render();
      if(seen[0]&&seen[1]&&seen[2])award('m1:moves',10);
    });
    chipsEl.appendChild(b);return b;
  });
  function render(){
    pr.textContent='';
    pr.appendChild(el('div','ln',base));
    MOVES.forEach(function(m,i){if(on[i])pr.appendChild(el('div','ln'+(i===last?' new':''),m.l))});
    out.textContent='';
    var anyOn=on[0]||on[1]||on[2];
    if(!anyOn)out.appendChild(el('li',null,baseOut));
    MOVES.forEach(function(m,i){if(on[i]){var li=el('li');li.appendChild(el('span','t',m.o));out.appendChild(li)}});
    var n=on.filter(Boolean).length;
    msg.textContent=n===0?'With no moves, you get a smooth summary and nothing to check.'
      :n===3?'All three on. Now the answer comes with its own checking list.'
      :n+' of 3 moves on. Keep adding.';
  }
  render();
  C.persist('m1.moves',{
    get:function(){return {on:on.slice(),seen:seen.slice(),last:last}},
    set:function(v){
      if(!v||typeof v!=='object')return;
      MOVES.forEach(function(m,i){
        on[i]=!!(v.on&&v.on[i]===true);seen[i]=on[i]||!!(v.seen&&v.seen[i]===true);
        mb[i].setAttribute('aria-pressed',on[i]?'true':'false');
        if(seen[i])mb[i].classList.add('seen');else mb[i].classList.remove('seen');
      });
      last=(typeof v.last==='number'&&v.last>=0&&v.last<MOVES.length&&v.last%1===0&&on[v.last])?v.last:-1;
      render();
    }
  });

  makeQuiz($('#quiz1'),'m1',[
    {q:'Which prompt line makes the research easiest to check?',
     o:['Be accurate.','List every claim you are less than sure about, and mark which ones came from my data.','Write like an expert.'],c:1,xp:10,
     why:'It splits the answer into claims you can check, and shows which ones trace back to you.',
     hint:'“Be accurate” asks for a quality it cannot measure. Which line gives you something to act on?'},
    {q:'You paste your survey results into the prompt. What does that change?',
     o:['The AI is now guaranteed to be correct','The AI has real facts to work from, so you can check its claims against the page','The AI will remember the survey in every future chat'],c:1,xp:10,
     why:'Your data gives it something real to point at. It still needs checking, but now you know where to look.',
     hint:'Think about what you can compare the answer against.'}
  ]);
})();

/* ---------- Mission 2: Content Engine ---------- */
(function(){
  var WHO=['Human','AI','Both'];
  var STEPS=[
    {n:'1. Search intent',d:'What does someone searching this want to know, and do next?',s:[1,0,2],best:'Both',
     why:'You know what your customers really ask. AI can list questions you missed. Leaving it to AI alone gets you the average searcher, not yours.'},
    {n:'2. Outline',d:'Turn that intent into sections.',s:[1,1,2],best:'Both',
     why:'AI proposes a structure in seconds. You cut sections and add the ones only you can write.'},
    {n:'3. Draft',d:'Write the first version from your notes and facts.',s:[1,2,1],best:'AI',
     why:'First drafts are what it is good at, if you hand it your notes and tell it to leave gaps instead of guessing. You will edit it anyway.'},
    {n:'4. Fact check',d:'Confirm every claim, number, and how-to step.',s:[2,0,1],best:'Human',
     why:'The AI cannot vouch for its own claims. It can list what to verify (that is why Both scores a point), but opening the sources is on you.'},
    {n:'5. Voice edit',d:'Make it sound like your shop, not like everyone’s.',s:[2,0,2],best:'Human or Both',
     why:'Either works if the last ear is yours. AI alone sands off the quirks that make you sound like you.'},
    {n:'6. Publish check',d:'Links, title, images, a last read, then the button.',s:[2,0,1],best:'Human',
     why:'Your name is on it, so the final look is yours. AI can catch typos, but you press publish.'}
  ];
  var host=$('#l3m2-steps'),scoreBtn=$('#l3m2-score'),redo=$('#l3m2-redo'),count=$('#l3m2-count'),total=$('#l3m2-total');
  var pick=STEPS.map(function(){return -1});
  var scored=false,rows=[];
  function assigned(){return pick.filter(function(x){return x>=0}).length}
  function refresh(quiet){
    var n=assigned();
    count.textContent=n+' of 6 assigned';
    scoreBtn.disabled=(n<6)||scored;
    if(n>=6&&!quiet)award('m2:assign',10);
  }
  STEPS.forEach(function(s,si){
    var box=el('div','step');
    box.appendChild(el('p','nm',s.n));
    box.appendChild(el('p','ds',s.d));
    var chips=el('div','chips');
    var res=el('p','res');
    var bs=WHO.map(function(w,wi){
      var b=btn('chip',w);b.setAttribute('aria-pressed','false');
      b.addEventListener('click',function(){
        if(scored)return;
        pick[si]=wi;
        bs.forEach(function(x,k){x.setAttribute('aria-pressed',k===wi?'true':'false')});
        refresh();
      });
      chips.appendChild(b);return b;
    });
    box.appendChild(chips);box.appendChild(res);host.appendChild(box);
    rows.push({box:box,bs:bs,res:res});
  });
  scoreBtn.addEventListener('click',function(){
    if(scored||assigned()<6)return;
    showScore();
    award('m2:score',20);
  });
  function showScore(){
    scored=true;var sum=0;
    STEPS.forEach(function(s,si){
      var p=s.s[pick[si]];sum+=p;
      var r=rows[si];
      r.bs.forEach(function(b){b.disabled=true});
      r.box.classList.add('s'+p);
      r.res.textContent='';
      r.res.appendChild(el('span','pts',p+' of 2 points. Best: '+s.best+'. '));
      r.res.appendChild(document.createTextNode(s.why));
    });
    var line=sum>=10?'Strong pipeline: AI drafts, you decide.'
      :sum>=7?'Mostly right. Read the reasons under the lower scores.'
      :'A rough first pass. The reasons below are the lesson.';
    total.textContent=sum+' of 12. '+line;
    scoreBtn.disabled=true;redo.hidden=false;
  }
  redo.addEventListener('click',function(){
    scored=false;total.textContent='';redo.hidden=true;
    rows.forEach(function(r,si){
      r.box.className='step';r.res.textContent='';
      r.bs.forEach(function(b,k){b.disabled=false;b.setAttribute('aria-pressed',pick[si]===k?'true':'false')});
    });
    refresh();
  });
  refresh();
  C.persist('m2.pipeline',{
    get:function(){return {pick:pick.slice(),scored:scored}},
    set:function(v){
      if(!v||typeof v!=='object'||!Array.isArray(v.pick)||scored)return;
      STEPS.forEach(function(s,si){
        var w=v.pick[si];
        pick[si]=(typeof w==='number'&&w>=0&&w<WHO.length&&w%1===0)?w:-1;
        rows[si].bs.forEach(function(x,k){x.setAttribute('aria-pressed',k===pick[si]?'true':'false')});
      });
      refresh(true);
      if(v.scored===true&&assigned()>=6)showScore();
    }
  });

  makeQuiz($('#quiz2'),'m2',[
    {q:'Before any tricks, what makes a post worth publishing?',
     o:['It uses the keyword as many times as possible','It gives the searcher what they came for and says something only you can say','It is as long as it can be'],c:1,xp:10,
     why:'Helpful and original beats mechanical. Repeating a phrase or padding the length does not help a reader.',
     hint:'Which option is about the reader, not the page?'},
    {q:'Your AI draft reads like every other post on the topic. Best fix?',
     o:['Add your own examples, customer questions, and facts','Ask for synonyms','Make it longer'],c:0,xp:10,
     why:'Generic comes from generic input. Your own details are the part nobody else can write.',
     hint:'What can you add that a competitor cannot?'}
  ]);
})();

/* ---------- Mission 3: Ad Copy Lab ---------- */
(function(){
  function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function clicks(n,seed){var r=mulberry(seed),c=0;for(var i=0;i<n;i++){if(r()<0.04)c++}return c}
  var SIZES=[100,500,2000,10000];
  var NOTES={
    100:'Only 100 people each. A few clicks swing it.',
    500:'500 each. Still easy for luck to show up.',
    2000:'2,000 each. The gaps get smaller.',
    10000:'10,000 each. Luck evens out, so the gap shrinks.'
  };
  var size=100,runs=0,wins=[],lastSize=0;
  var sizesEl=$('#l3m3-sizes'),runBtn=$('#l3m3-run'),runsEl=$('#l3m3-runs'),barsEl=$('#l3m3-bars'),verdict=$('#l3m3-verdict'),log=$('#l3m3-log');
  var sb=SIZES.map(function(n){
    var b=btn('chip',n.toLocaleString('en-US'));b.setAttribute('aria-pressed',n===size?'true':'false');
    b.addEventListener('click',function(){
      size=n;sb.forEach(function(x,k){x.setAttribute('aria-pressed',SIZES[k]===n?'true':'false')});
    });
    sizesEl.appendChild(b);return b;
  });
  var rows=['A','B'].map(function(nm){
    var row=el('div','row');var w=el('span','w','Ad '+nm);var tr=el('span','track');var f=document.createElement('i');tr.appendChild(f);
    var pc=el('span','pc','0');row.appendChild(w);row.appendChild(tr);row.appendChild(pc);barsEl.appendChild(row);
    return {fill:f,pc:pc};
  });
  verdict.textContent='Pick an audience size and press Run the test. Both ads share the same true click rate, set to 4% (example).';
  function paintRun(sz,quiet){
    var s=54+runs*7919+sz;
    var a=clicks(sz,s*2+1),b=clicks(sz,s*2+2);
    var mx=Math.max(a,b,1);
    rows[0].fill.style.width=(a/mx*100)+'%';rows[0].pc.textContent=a;
    rows[1].fill.style.width=(b/mx*100)+'%';rows[1].pc.textContent=b;
    var txt;
    if(a===b){txt='Dead heat: '+a+' clicks each. Same ad, same result this time.';if(!quiet)wins.push('tie')}
    else{
      var win=a>b?'A':'B',hi=Math.max(a,b),lo=Math.min(a,b);
      var gap=lo>0?'a gap of '+Math.round((hi-lo)/lo*100)+'%':'a gap of '+(hi-lo)+' clicks';
      txt='Ad '+win+' “wins” with '+hi+' clicks to '+lo+', '+gap+'. It is the same ad. '+NOTES[sz];
      if(!quiet)wins.push(win);
    }
    verdict.textContent=txt;
    runsEl.textContent='Runs so far: '+runs;
    log.textContent='Winners so far: '+wins.slice(-8).join(', ')+(runs>=3?'. Same ad every time. The winner is just luck.':'. Run it a few more times.');
  }
  runBtn.addEventListener('click',function(){
    runs++;lastSize=size;
    paintRun(size,false);
    if(runs>=3)award('m3:run',10);
  });
  C.persist('m3.sandbox',{
    get:function(){return {size:size,runs:runs,wins:wins.slice(-8),lastSize:lastSize}},
    set:function(v){
      if(!v||typeof v!=='object')return;
      var n=(typeof v.size==='number'&&SIZES.indexOf(v.size)>=0)?v.size:size;
      size=n;sb.forEach(function(x,k){x.setAttribute('aria-pressed',SIZES[k]===n?'true':'false')});
      var r=(typeof v.runs==='number'&&v.runs>0&&v.runs<100000&&v.runs%1===0)?v.runs:0;
      if(r>0&&typeof v.lastSize==='number'&&NOTES[v.lastSize]&&Array.isArray(v.wins)){
        runs=r;lastSize=v.lastSize;
        wins=v.wins.filter(function(x){return x==='A'||x==='B'||x==='tie'}).slice(-8);
        paintRun(lastSize,true);
      }
    }
  });

  var d1=$('#l3m3-d1'),d2=$('#l3m3-d2'),dmsg=$('#l3m3-dmsg');
  var solvedCount=0;
  function solved(text,ok){
    dmsg.textContent=text;
    if(ok){solvedCount++;dmsg.textContent='Good call. One more choice to make.';if(solvedCount>=2){dmsg.textContent='A fair test: one change, both ads at the same time, and a result you read at the end you planned.';award('m3:design',10)}}
  }
  var g1=pickGroup(d1,[
    {t:'Change the headline, image, and offer at once, to go big',hint:'If B wins you will not know why. Change one thing.'},
    {t:'Change only the headline',why:''},
    {t:'Show A on weekdays and B on weekends',hint:'Different days bring different shoppers. Run both at the same time.'}
  ],1,solved);
  var g2=pickGroup(d2,[
    {t:'The moment B pulls ahead',hint:'Early leads often fade. Decide the end before you start.'},
    {t:'After one day, to save budget',hint:'One day is a small sample, and days of the week differ.'},
    {t:'At the end date and audience size you set before starting',why:''}
  ],2,solved);
  C.persist('m3.design',{
    get:function(){return {g1:g1.read(),g2:g2.read(),msg:dmsg.textContent}},
    set:function(v){
      if(!v||typeof v!=='object'||solvedCount>0)return;
      var n=(g1.restore(v.g1)?1:0)+(g2.restore(v.g2)?1:0);
      solvedCount=n;
      if(!Array.isArray(v.g1)&&!Array.isArray(v.g2))return;
      /* wrong picks only disable their buttons; restore the visible message the learner last saw */
      dmsg.textContent=n>=2?'A fair test: one change, both ads at the same time, and a result you read at the end you planned.'
        :(typeof v.msg==='string'?v.msg.slice(0,400):'');
    }
  });

  var cases=[
    {t:'Day 1. 300 people saw each ad. A got 9 clicks, B got 14.',a:1,
     why:'Day 1 with small numbers is easy to over-read. Let it run to the end you planned.',
     h:['Too early. Small numbers swing a lot.',null,'Nothing was unfair about the test. It just is not finished.']},
    {t:'Two weeks, both ads at the same time, only the headline differed. 10,000 people saw each ad. A got 410 clicks, B got 505.',a:0,
     why:'Big audience, planned length, one change, and a gap far bigger than luck tends to make at that size. Ship B, then test the next idea.',
     h:[null,'You already have a fair test with plenty of people. More waiting adds little.','The setup was fair. Ship it and put your effort into the next test.']},
    {t:'B beat A last week by a lot. But B also had a new photo and a new offer, and ran during a holiday sale. A did not.',a:2,
     why:'Several things differed at once, so nobody knows what helped. Retest with one change and the same timing.',
     h:['Many things changed at once. You would be shipping a guess.','More time will not fix a test where several things differ.',null]}
  ];
  var caseHost=$('#l3m3-cases'),caseDone=0,crows=[];
  var NAMES=['Ship','Wait','Retest'];
  cases.forEach(function(c,ci){
    var box=el('div','case');
    box.appendChild(el('p',null,c.t));
    var opts=el('div','opts');
    var msg=el('p','msg');msg.setAttribute('aria-live','polite');
    var bs=NAMES.map(function(n,i){
      var b=btn('choice',n);
      b.addEventListener('click',function(){
        if(i===c.a){
          markCase(ci,i,-1);
          caseDone++;if(caseDone>=cases.length)award('m3:decide',10);
        }else{markCase(ci,-1,i)}
      });
      opts.appendChild(b);return b;
    });
    box.appendChild(opts);box.appendChild(msg);caseHost.appendChild(box);
    crows.push({bs:bs,msg:msg,solved:false,wrong:[],last:-1});
  });
  /* right >= 0 marks the solved choice; wrong >= 0 marks one rejected choice */
  function markCase(ci,right,wrong){
    var r=crows[ci],c=cases[ci];
    if(right>=0){
      r.solved=true;
      r.bs.forEach(function(x,k){x.disabled=true;x.classList.add(k===right?'ok':'dim')});
      r.msg.textContent='Right. '+c.why;
    }else{
      r.bs[wrong].disabled=true;r.bs[wrong].classList.add('no');r.last=wrong;
      if(r.wrong.indexOf(wrong)<0)r.wrong.push(wrong);
      r.msg.textContent=c.h[wrong];
    }
  }
  C.persist('m3.cases',{
    get:function(){return crows.map(function(r){return {ok:r.solved,wrong:r.wrong.slice(),last:r.last}})},
    set:function(v){
      if(!Array.isArray(v))return;
      cases.forEach(function(c,ci){
        var r=crows[ci],e=v[ci];
        if(r.solved||!e||typeof e!=='object')return;
        if(Array.isArray(e.wrong)){
          e.wrong.forEach(function(w){
            if(typeof w==='number'&&w>=0&&w<NAMES.length&&w%1===0&&w!==c.a&&r.wrong.indexOf(w)<0)markCase(ci,-1,w);
          });
          if(typeof e.last==='number'&&r.wrong.indexOf(e.last)>=0){r.last=e.last;r.msg.textContent=c.h[e.last]}
        }
        if(e.ok===true){markCase(ci,c.a,-1);caseDone++}
      });
    }
  });

  makeQuiz($('#quiz3'),'m3',[
    {q:'Ad A got 3 clicks and Ad B got 5. What can you say?',
     o:['B is the winner, ship it','There are too few clicks to tell. Keep it running','A is broken'],c:1,xp:10,
     why:'Two clicks of difference is the kind of gap luck makes all the time. You just watched it happen with identical ads.',
     hint:'Remember the identical ads. How big were the gaps there?'},
    {q:'Why change only one thing between variants?',
     o:['The ad platform requires it','So a real difference points to the thing you changed','It saves time writing'],c:1,xp:10,
     why:'If you change three things, you will not know which one mattered.',
     hint:'Think about what you want to learn from the result.'}
  ]);
})();

/* ---------- Mission 4: Read the Numbers ---------- */
(function(){
  var askHost=$('#l3m4-ask'),askMsg=$('#l3m4-askmsg');
  var askG=pickGroup(askHost,[
    {t:'Is my marketing working?',hint:'Too vague. You will get something that sounds nice and means little.'},
    {t:'What caused the week 5 jump? Give me the reason.',hint:'The table shows timing, not cause. This pushes the AI to pick a story.'},
    {t:'Using only this table, tell me which numbers moved between weeks 1 and 6 and which stayed flat. For each move, list other things that could explain it and what data I would need to know.',
     why:'It keeps the AI inside your data, asks for what changed, and asks for rivals to the obvious story.'},
    {t:'Write a positive summary for my boss.',hint:'That asks for spin, not for what the numbers show.'}
  ],2,function(text,ok){
    askMsg.textContent=ok?'Best question. '+text:text;
    if(ok)award('m4:ask',10);
  });
  C.persist('m4.ask',{
    get:function(){return {g:askG.read(),msg:askMsg.textContent}},
    set:function(v){
      if(!v||typeof v!=='object'||!Array.isArray(v.g))return;
      askG.restore(v.g);
      askMsg.textContent=typeof v.msg==='string'?v.msg.slice(0,600):'';
    }
  });

  var CL=[
    {t:'Revenue peaked in week 5 at $3,320, up $440 from week 4.',bad:false,
     why:'Supported. 3,320 minus 2,880 is 440.'},
    {t:'The newsletter in weeks 4 and 5 caused the jump in orders.',bad:true,
     why:'Cause read from timing. Ad spend also rose in week 5. The table shows what happened together, not why.'},
    {t:'Average order value held at $40 every week, so the extra revenue came from more orders, not bigger baskets.',bad:false,
     why:'Supported. Revenue divided by orders is $40 in every week.'},
    {t:'The new Instagram ad converts better than any other channel.',bad:true,
     why:'Tiny sample: 4 orders. And the table has no numbers for other channels to compare against.'},
    {t:'Orders are up 38% since week 3.',bad:true,
     why:'Cherry-picked period. 83 against 60 is 38%, but it starts at the lowest week and ends at the highest. Week 6 is 66, about 10% above week 3.'},
    {t:'Ad spend rose from $300 to $450 in weeks 5 and 6, a 50% increase.',bad:false,
     why:'Supported. 150 on top of 300 is 50%.'}
  ];
  var host=$('#l3m4-claims'),checkBtn=$('#l3m4-check'),cnt=$('#l3m4-count'),ver=$('#l3m4-verdict');
  var flagged=CL.map(function(){return false}),checked=false,fb=[],rs=[];
  function recount(){var n=flagged.filter(Boolean).length;cnt.textContent=n+' flagged'}
  CL.forEach(function(c,ci){
    var w=el('div','flagwrap');
    var b=btn('flag',c.t);b.setAttribute('aria-pressed','false');
    b.addEventListener('click',function(){
      if(checked)return;
      flagged[ci]=!flagged[ci];
      b.setAttribute('aria-pressed',flagged[ci]?'true':'false');
      recount();
    });
    var r=el('p','res');r.setAttribute('aria-live','polite');
    w.appendChild(b);w.appendChild(r);host.appendChild(w);fb.push(b);rs.push(r);
  });
  recount();
  checkBtn.addEventListener('click',function(){
    if(checked)return;
    grade();
    award('m4:flags',15);
  });
  function grade(){
    checked=true;var right=0;
    CL.forEach(function(c,ci){
      var ok=(flagged[ci]===c.bad);if(ok)right++;
      fb[ci].disabled=true;fb[ci].classList.add(ok?'right':'miss');
      rs[ci].textContent=(ok?'Right. ':(c.bad?'Missed. ':'Not a problem. '))+c.why;
    });
    ver.textContent=right+' of 6 right. Three claims had nothing wrong with them. Three overreached.';
    checkBtn.disabled=true;
  }
  C.persist('m4.flags',{
    get:function(){return {flagged:flagged.slice(),checked:checked}},
    set:function(v){
      if(!v||typeof v!=='object'||!Array.isArray(v.flagged)||checked)return;
      CL.forEach(function(c,ci){
        flagged[ci]=v.flagged[ci]===true;
        fb[ci].setAttribute('aria-pressed',flagged[ci]?'true':'false');
      });
      recount();
      if(v.checked===true)grade();
    }
  });

  var data=$('#l3m4-data'),who=$('#l3m4-who'),fmt=$('#l3m4-fmt'),rulesEl=$('#l3m4-rules'),pre=$('#l3m4-prompt'),copyBtn=$('#l3m4-copy'),cn=$('#l3m4-copynote');
  data.value=['Week | Sessions | Orders | Revenue | Ad spend | Newsletter',
    '1 | 2,100 | 63 | $2,520 | $300 | no','2 | 2,250 | 65 | $2,600 | $300 | no','3 | 2,150 | 60 | $2,400 | $300 | no',
    '4 | 2,400 | 72 | $2,880 | $300 | yes','5 | 2,300 | 83 | $3,320 | $450 | yes','6 | 2,200 | 66 | $2,640 | $450 | no'].join('\n');
  var RULES=[
    'Use only the numbers above. If something is missing, ask me before writing.',
    'Separate what the data shows from what might explain it. Never state a cause as fact.',
    'Say when a number is too small to rely on.',
    'Compare equal periods and tell me which weeks you used.'
  ];
  var rb=RULES.map(function(t,i){
    var li=el('li');var lab=document.createElement('label');
    var cb=document.createElement('input');cb.type='checkbox';cb.checked=true;
    lab.appendChild(cb);lab.appendChild(document.createTextNode(' '+t));li.appendChild(lab);rulesEl.appendChild(li);
    cb.addEventListener('change',refresh);return cb;
  });
  function build(){
    var d=data.value.replace(/\s+$/,'').trim()||'[paste your table here]';
    var rules=RULES.filter(function(t,i){return rb[i].checked});
    return 'You are helping me write a weekly marketing report.\n\n'
      +'Here is the data (replace the example numbers with yours):\n'+d+'\n\n'
      +(rules.length?'Rules:\n'+rules.map(function(t){return '- '+t}).join('\n')+'\n\n':'')
      +'Write it for '+who.value+'. Format: '+fmt.value+'.\n'
      +'Use plain language. Explain any marketing term a non-marketer would not know.';
  }
  function refresh(){pre.textContent=build()}
  [data,who,fmt].forEach(function(x){x.addEventListener('input',refresh);x.addEventListener('change',refresh)});
  refresh();
  var copied=0;
  var COPYMSG=['','Copied. Paste it into your AI tool with this week’s numbers.','Text selected. Press copy on your keyboard, then paste it into your AI tool.'];
  C.persist('m4.copied',{
    get:function(){return copied},
    set:function(v){if(v===1||v===2){copied=v;cn.textContent=COPYMSG[v]}}
  });
  copyBtn.addEventListener('click',function(){
    C.copy(build(),pre,function(ok){
      copied=ok?1:2;
      cn.textContent=ok?'Copied. Paste it into your AI tool with this week’s numbers.':'Text selected. Press copy on your keyboard, then paste it into your AI tool.';
      award('m4:copy',25);
    });
  });
})();
})(window.Course);
