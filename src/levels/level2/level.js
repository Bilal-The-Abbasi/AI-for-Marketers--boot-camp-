(function(C){
'use strict';
var $=C.$,$$=C.$$,el=C.el,award=C.award,makeQuiz=C.makeQuiz;

/* ---------- Mission 1: Write Like You ---------- */
(function(){
  /* step 1: pick the draft that matches */
  var DR=[
    {t:'Juniper Row Bakery is pleased to offer freshly prepared cinnamon rolls on Saturday morning, beginning at seven o’clock, while supplies last.',
     no:'Too formal. Both real posts use short sentences and plain words, nothing like “is pleased to offer.”'},
    {t:'Cinnamon rolls. Saturday, 7 a.m., until they’re gone. We have no notes.',ok:true},
    {t:'We’re thrilled to announce our amazing cinnamon rolls are back this Saturday! Treat yourself to a delicious morning!',
     no:'Too loud. The real posts have no exclamation marks and no hype words.'}
  ];
  var host=$('#l2m1-drafts'),rev=$('#l2m1-r1'),dbtns=[],done1=false,tries1=0,wrong1=[],okIdx1=-1;
  function pick1(i,quiet){
    var d=DR[i],b=dbtns[i];
    if(done1)return;
    if(d.ok){
      done1=true;okIdx1=i;
      dbtns.forEach(function(x,k){x.disabled=true;x.classList.add(k===i?'ok':'dim')});
      rev.textContent='';
      rev.appendChild(el('span','tagchip','What gave it away'));
      rev.appendChild(el('p',null,'Short sentences. Dry humor (“We have no notes”). Plain words. No exclamation marks. You did not need a rulebook, you just heard it. Next, put names on those habits.'));
      rev.hidden=false;
      if(!quiet)award('m1:pick',10);
    }else{
      tries1++;wrong1.push(i);b.disabled=true;b.classList.add('no');
      rev.hidden=false;rev.textContent='';
      rev.appendChild(el('p',null,d.no+(tries1>=2?' The last one is the match.':'')));
    }
  }
  DR.forEach(function(d,i){
    var b=el('button','choice',d.t);b.type='button';
    b.addEventListener('click',function(){pick1(i)});
    host.appendChild(b);dbtns.push(b);
  });
  C.persist('m1.pick',{
    get:function(){return {wrong:wrong1.slice(),ok:okIdx1}},
    set:function(v){
      if(!v||typeof v!=='object'||done1||wrong1.length)return;
      var w=Array.isArray(v.wrong)?v.wrong:[];
      w.forEach(function(i){if(typeof i==='number'&&i>=0&&i<DR.length&&i%1===0&&!DR[i].ok&&wrong1.indexOf(i)<0)pick1(i,true)});
      if(typeof v.ok==='number'&&v.ok>=0&&v.ok<DR.length&&DR[v.ok].ok)pick1(v.ok,true);
    }
  });

  /* step 2: name the traits */
  var TR=[
    {n:'Short sentences',y:true},{n:'Dry humor',y:true},{n:'Plain words',y:true},
    {n:'Exclamation marks',y:false},{n:'Emoji',y:false},{n:'Long, formal sentences',y:false}
  ];
  var tw=$('#l2m1-traits'),tmsg=$('#l2m1-tmsg'),tb=[],checks=0,tmsgState='';
  TR.forEach(function(t){
    var b=el('button','chip',t.n);b.type='button';b.setAttribute('aria-pressed','false');
    b.addEventListener('click',function(){b.setAttribute('aria-pressed',b.getAttribute('aria-pressed')==='true'?'false':'true')});
    tw.appendChild(b);tb.push(b);
  });
  $('#l2m1-check').addEventListener('click',function(){
    var missed=[],extra=[],any=false;
    tb.forEach(function(b,i){
      var on=b.getAttribute('aria-pressed')==='true';if(on)any=true;
      if(TR[i].y&&!on)missed.push(TR[i].n);
      if(!TR[i].y&&on)extra.push(TR[i].n);
    });
    if(!any){tmsg.textContent='Tap at least one trait first.';tmsgState='';return}
    checks++;
    if(!missed.length&&!extra.length){
      tmsg.textContent='Exactly right: short sentences, dry humor, plain words. Those three are your card’s core.';
      tmsgState='ok';award('m1:traits',10);return;
    }
    if(checks>=2){
      tb.forEach(function(b,i){b.setAttribute('aria-pressed',TR[i].y?'true':'false')});
      tmsg.textContent='I set the answer for you: short sentences, dry humor, plain words. The posts have no exclamation marks, no emoji, and nothing formal.';
      tmsgState='set';award('m1:traits',10);return;
    }
    tmsg.textContent=(extra.length?'Not in the posts: '+extra.join(', ')+'. ':'')+(missed.length?'Still missing '+missed.length+' trait'+(missed.length>1?'s':'')+'. Reread the two posts.':'Take those out and check again.');
    tmsgState=tmsg.textContent;
  });
  C.persist('m1.traits',{
    get:function(){return {on:tb.map(function(b){return b.getAttribute('aria-pressed')==='true'}),checks:checks,msg:tmsgState}},
    set:function(v){
      if(!v||typeof v!=='object')return;
      if(Array.isArray(v.on))tb.forEach(function(b,i){b.setAttribute('aria-pressed',v.on[i]===true?'true':'false')});
      if(typeof v.checks==='number'&&isFinite(v.checks))checks=Math.max(0,Math.min(99,Math.floor(v.checks)));
      if(v.msg==='ok'){tmsg.textContent='Exactly right: short sentences, dry humor, plain words. Those three are your card’s core.';tmsgState='ok'}
      else if(v.msg==='set'){tmsg.textContent='I set the answer for you: short sentences, dry humor, plain words. The posts have no exclamation marks, no emoji, and nothing formal.';tmsgState='set'}
      else if(typeof v.msg==='string'&&v.msg&&v.msg.length<300){tmsg.textContent=v.msg;tmsgState=v.msg}
    }
  });

  /* step 3: voice card builder */
  var TONE=[
    {n:'Dry',card:'Dry. Understated, a little deadpan, never gushing.'},
    {n:'Warm',card:'Warm. A friendly neighbor, welcoming, plain words.'},
    {n:'Bold',card:'Bold. Confident and direct, urgent without shouting.'}
  ];
  var LEN=[{n:'Short sentences',card:'short, up to 8 words each.'},{n:'Flowing sentences',card:'flowing, up to 25 words each.'}];
  var BANG=[{n:'No exclamation marks',card:'no exclamation marks.'},{n:'Exclamation marks fine',card:'exclamation marks are fine.'}];
  var OUT={
    '0,0':'Cinnamon rolls are back Saturday. 7 a.m., $4.50, until they’re gone.',
    '0,1':'Saturday morning, the cinnamon rolls come out at 7 and stay until the tray is empty, which is usually sooner than we would like. They are $4.50 each.',
    '1,0':'Saturday means cinnamon rolls. They come out warm at 7 a.m. Come say hi. $4.50 each, until they’re gone.',
    '1,1':'Saturday mornings at Juniper Row smell like cinnamon, and the first rolls come out at 7. Pop in, grab a warm one for $4.50, and stay a minute if you can.',
    '2,0':'Saturday, 7 a.m. Cinnamon rolls. Be early. $4.50 each, until they’re gone.',
    '2,1':'Set an alarm. Saturday’s cinnamon rolls hit the counter at 7 a.m. and they do not last, so plan to get here early. They are $4.50 each.'
  };
  $('#l2m1-plain').textContent='We’re thrilled to announce that our amazing cinnamon rolls are back this Saturday! Treat yourself to a delicious, freshly baked delight starting at 7 a.m. Only $4.50!';
  var sel={t:0,l:0,b:0},tried={},groups={};
  function trkText(n){return n>=3?'Three cards tried. Same request, different voices.':'Cards tried: '+n+' of 3'}
  var card=$('#l2m1-card'),withEl=$('#l2m1-with'),trk=$('#l2m1-trk');
  function mk(hostId,list,key){
    var h=$(hostId),bs=[];
    list.forEach(function(o,i){
      var b=el('button','chip',o.n);b.type='button';b.setAttribute('aria-pressed',i===sel[key]?'true':'false');
      b.addEventListener('click',function(){
        sel[key]=i;bs.forEach(function(x,k){x.setAttribute('aria-pressed',k===i?'true':'false')});paint(true);
      });
      h.appendChild(b);bs.push(b);
    });
    groups[key]=bs;
  }
  function paint(user){
    card.textContent='';
    [['Voice card: Juniper Row Bakery',0],['Tone: '+TONE[sel.t].card,1],['Sentences: '+LEN[sel.l].card,1],['Punctuation: '+BANG[sel.b].card,1],
     ['Avoid: hype words like amazing, thrilled, treat yourself.',1],['Sounds like: “Closed Monday. Even bread needs a day off.”',1]].forEach(function(r,i){
      card.appendChild(el('div','ln',r[0]));
    });
    var txt=OUT[sel.t+','+sel.l];
    if(sel.b===1)txt=txt.replace(/\.$/,'!');
    withEl.textContent=txt;
    if(user){
      tried[sel.t+','+sel.l+','+sel.b]=true;
      var n=Object.keys(tried).length;
      trk.textContent=trkText(n);
      if(n>=3)award('m1:card',10);
    }else{trk.textContent='Cards tried: 0 of 3. Tap a setting.'}
  }
  mk('#l2m1-tone',TONE,'t');mk('#l2m1-len',LEN,'l');mk('#l2m1-bang',BANG,'b');
  paint(false);
  if(C.has('m1:card'))trk.textContent='Three cards tried. Same request, different voices.';
  C.persist('m1.card',{
    get:function(){return {t:sel.t,l:sel.l,b:sel.b,tried:Object.keys(tried)}},
    set:function(v){
      if(!v||typeof v!=='object')return;
      function pickIdx(x,max){return (typeof x==='number'&&x>=0&&x<max&&x%1===0)?x:0}
      sel.t=pickIdx(v.t,TONE.length);sel.l=pickIdx(v.l,LEN.length);sel.b=pickIdx(v.b,BANG.length);
      ['t','l','b'].forEach(function(k){groups[k].forEach(function(x,i){x.setAttribute('aria-pressed',i===sel[k]?'true':'false')})});
      tried={};
      if(Array.isArray(v.tried))v.tried.forEach(function(k){if(typeof k==='string'&&/^[0-2],[01],[01]$/.test(k)&&+k.charAt(0)<TONE.length)tried[k]=true});
      paint(false);
      var n=Object.keys(tried).length;
      if(n>0||C.has('m1:card'))trk.textContent=trkText(Math.max(n,C.has('m1:card')?3:0));
    }
  });

  makeQuiz($('#l2m1-quiz'),'m1',[
    {q:'Which line belongs on a voice card?',
     o:['Sound authentic and professional','Short sentences. Dry. No exclamation marks.','Be the best bakery voice ever'],c:1,xp:10,
     why:'The AI can follow habits it can count or spot. Moods like “authentic” give it nothing to check.',
     hint:'Pick the one you could verify by reading a draft.'},
    {q:'Why add one real sample line to the card?',
     o:['It makes the card longer, so the AI pays more attention','It shows the traits working together in a single sentence','It stops the AI from ever writing anything else'],c:1,xp:10,
     why:'Traits describe. A sample demonstrates. Together they pin the voice down.',
     hint:'Think about “Closed Monday. Even bread needs a day off.” What does it show that a list cannot?'}
  ]);
})();

/* ---------- Mission 2: Show, Don't Tell ---------- */
(function(){
  var EXS=[
    {s:'Your mat misses you',p:'Beginner series, Tuesdays at 6 p.m.'},
    {s:'Slow down. It’s Tuesday.',p:'Six weeks of beginner yoga. $60.'},
    {s:'Stiff? Perfect. Come anyway.',p:'No experience needed. Starts next Tuesday.'}
  ];
  var SETS=[
    [['Join Our Beginner Yoga Series!','Sign up today for six weeks of beginner yoga at Tidewater.'],
     ['Begin Your Wellness Adventure','Beginner classes for all levels, starting next Tuesday.'],
     ['Don’t Miss Out on Yoga Class','Register now: six Tuesdays at 6 p.m. for $60.']],
    [['Your first class is waiting','Six Tuesdays at 6 p.m. Beginners only. $60.'],
     ['Your knees will be fine','No experience needed. Starts next Tuesday.'],
     ['Your Tuesday just got better','Beginner yoga, six weeks, $60 total.']],
    [['Your hamstrings called. Be nice.','Beginner series, Tuesdays at 6 p.m. $60 for six weeks.'],
     ['Stiff knees welcome','Six Tuesdays of beginner yoga. No experience needed.'],
     ['Tuesday, but slower','Beginner yoga at 6 p.m. Six weeks, $60.']]
  ];
  var EXN=[{n:'No examples',k:0,i:0},{n:'One example',k:1,i:1},{n:'Three examples',k:3,i:2}];
  var FMT=[
    {n:'Free text',line:null},
    {n:'Table',line:'Format: a table with columns #, Subject, Preview.'},
    {n:'Subject + preview pairs',line:'Format: for each option, two labeled lines, Subject: and Preview:.'},
    {n:'Bullets with limits',line:'Format: a bulleted list. Subject 40 characters or fewer, preview 70 or fewer. Show the character count for each.'}
  ];
  var NOTES=[
    'Generic and eager. With no example it writes the average subject line.',
    'Closer to a voice, but all three copy the shape of your one example, starting with “Your.”',
    'Now it sees what stays constant (short, dry, specific) and what varies. The openings differ.'
  ];
  var ex=0,fm=0,seenE={0:true},seenF={0:true};
  var exW=$('#l2m2-ex'),fmW=$('#l2m2-fmt'),pr=$('#l2m2-prompt'),out=$('#l2m2-out'),note=$('#l2m2-note'),trk=$('#l2m2-trk');
  var exB=[],fmB=[];
  function mkChips(wrap,list,arr,fn){
    list.forEach(function(o,i){
      var b=el('button','chip',o.n);b.type='button';b.addEventListener('click',function(){fn(i)});
      wrap.appendChild(b);arr.push(b);
    });
  }
  function render(){
    var set=SETS[EXN[ex].i];
    pr.textContent='';
    pr.appendChild(el('div','ln','Write 3 subject lines with preview text for our beginner yoga series at Tidewater Yoga. Facts: six Tuesdays at 6 p.m., starts next Tuesday, $60 total, no experience needed.'));
    if(EXN[ex].k>0){
      pr.appendChild(el('div','ln new','Past ones I liked:\n'+EXS.slice(0,EXN[ex].k).map(function(e){return 'Subject: '+e.s+'\nPreview: '+e.p}).join('\n\n')));
    }
    if(FMT[fm].line)pr.appendChild(el('div','ln new',FMT[fm].line));
    out.textContent='';
    if(fm===0){
      var ul=el('ul','out'),li=el('li');
      li.appendChild(el('span','t','You could try “'+set[0][0]+'” with a preview like “'+set[0][1]+'”. Or “'+set[1][0]+'”, previewed by “'+set[1][1]+'”. A third option is “'+set[2][0]+'” followed by “'+set[2][1]+'”.'));
      ul.appendChild(li);out.appendChild(ul);
    }else if(fm===1){
      var w=el('div','tblwrap'),t=el('table','tbl'),th=el('tr');
      ['#','Subject','Preview'].forEach(function(h){th.appendChild(el('th',null,h))});
      t.appendChild(th);
      set.forEach(function(r,i){var tr=el('tr');[String(i+1),r[0],r[1]].forEach(function(c){tr.appendChild(el('td',null,c))});t.appendChild(tr)});
      w.appendChild(t);out.appendChild(w);
    }else if(fm===2){
      var ul2=el('ul','out');
      set.forEach(function(r){
        var li2=el('li','block'),p=el('div','pair');
        p.appendChild(el('span','k','Subject'));p.appendChild(el('span',null,r[0]));
        p.appendChild(el('span','k','Preview'));p.appendChild(el('span',null,r[1]));
        li2.appendChild(p);ul2.appendChild(li2);
      });
      out.appendChild(ul2);
    }else{
      var ul3=el('ul','out');
      set.forEach(function(r){
        var li3=el('li','block'),p3=el('div','pair');
        var sOk=r[0].length<=40,pOk=r[1].length<=70;
        p3.appendChild(el('span',null,'• '+r[0]));
        p3.appendChild(el('span','n'+(sOk?' fit':''),'subject '+r[0].length+' of 40'+(sOk?' ✓':' over')));
        p3.appendChild(el('span',null,'• '+r[1]));
        p3.appendChild(el('span','n'+(pOk?' fit':''),'preview '+r[1].length+' of 70'+(pOk?' ✓':' over')));
        li3.appendChild(p3);ul3.appendChild(li3);
      });
      out.appendChild(ul3);
    }
    exB.forEach(function(b,i){b.setAttribute('aria-pressed',i===ex?'true':'false');b.classList.toggle('seen',!!seenE[i])});
    fmB.forEach(function(b,i){b.setAttribute('aria-pressed',i===fm?'true':'false');b.classList.toggle('seen',!!seenF[i])});
    note.textContent=NOTES[EXN[ex].i]+(fm===0?' Free text is hard to paste anywhere.':'');
    var ne=Object.keys(seenE).length,nf=Object.keys(seenF).length;
    trk.textContent='Example levels seen: '+ne+' of 3. Formats seen: '+nf+' of 4.';
    if(ne>=3)award('m2:examples',10);
    if(nf>=4)award('m2:formats',10);
  }
  mkChips(exW,EXN,exB,function(i){ex=i;seenE[i]=true;render()});
  mkChips(fmW,FMT,fmB,function(i){fm=i;seenF[i]=true;render()});
  render();
  C.persist('m2.explore',{
    get:function(){return {ex:ex,fm:fm,seenE:Object.keys(seenE).map(Number),seenF:Object.keys(seenF).map(Number)}},
    set:function(v){
      if(!v||typeof v!=='object')return;
      function idx(x,max){return (typeof x==='number'&&x>=0&&x<max&&x%1===0)?x:0}
      function mapOf(a,max){var o={0:true};if(Array.isArray(a))a.forEach(function(x){if(typeof x==='number'&&x>=0&&x<max&&x%1===0)o[x]=true});return o}
      ex=idx(v.ex,EXN.length);fm=idx(v.fm,FMT.length);
      seenE=mapOf(v.seenE,EXN.length);seenF=mapOf(v.seenF,FMT.length);
      seenE[ex]=true;seenF[fm]=true;
      render();
    }
  });

  /* match the format to the need */
  var NEED=[
    {q:'Your teammate wants to sort and filter the options in a spreadsheet.',a:1,
     why:'A table pastes into rows and columns with no cleanup.',hint:'Which layout already has columns?'},
    {q:'You will paste each subject into one field and each preview into another in your email tool.',a:2,
     why:'Labeled pairs tell you exactly what goes in which box.',hint:'You need to tell subject from preview at a glance, one option at a time.'},
    {q:'You need to see at a glance which lines run past the character limits.',a:3,
     why:'A limit in the prompt plus a count on every line makes overruns obvious.',hint:'Which format asks the AI to show a number for each line?'}
  ];
  var mh=$('#l2m2-match'),rl=$('#l2m2-rl'),mi=0,rWrong=[],rSolved=false;
  function round(st){
    var r=NEED[mi],tries=0;
    rWrong=[];rSolved=false;
    mh.textContent='';
    rl.textContent='Match the format: '+(mi+1)+' of '+NEED.length;
    mh.appendChild(el('p','ask',r.q));
    var list=el('div','sent'),btns=[],msg=el('p','msg');msg.setAttribute('aria-live','polite');
    FMT.forEach(function(f,i){
      var b=el('button','choice',f.n);b.type='button';
      b.addEventListener('click',function(){press(i,false)});
      list.appendChild(b);btns.push(b);
    });
    function press(i,quiet){
      var b=btns[i];
      if(rSolved)return;
      if(i===r.a){
        rSolved=true;
        btns.forEach(function(x,k){x.disabled=true;x.classList.add(k===i?'ok':'dim')});
        msg.textContent='Right. '+r.why;
        if(mi<NEED.length-1){
          var nb=el('button','btn','Next one');nb.type='button';nb.style.justifySelf='start';
          nb.addEventListener('click',function(){mi++;round()});mh.appendChild(nb);
        }else{
          msg.textContent+=' That is all three.';if(!quiet)award('m2:match',10);
        }
      }else{tries++;rWrong.push(i);b.disabled=true;b.classList.add('no');msg.textContent=tries<2?'Not that one. Think about what you will do with the result.':'Hint: '+r.hint}
    }
    mh.appendChild(list);mh.appendChild(msg);
    if(st){
      st.w.forEach(function(i){press(i,true)});
      if(st.s)press(r.a,true);
    }
  }
  round();
  if(C.has('m2:match')){rl.textContent='Match the format: done'}
  C.persist('m2.match',{
    get:function(){return {mi:mi,w:rWrong.slice(),s:rSolved}},
    set:function(v){
      if(!v||typeof v!=='object')return;
      var n=(typeof v.mi==='number'&&v.mi>=0&&v.mi<NEED.length&&v.mi%1===0)?v.mi:0;
      var w=[];
      if(Array.isArray(v.w))v.w.forEach(function(i){if(typeof i==='number'&&i>=0&&i<FMT.length&&i%1===0&&i!==NEED[n].a&&w.indexOf(i)<0)w.push(i)});
      mi=n;round({w:w,s:v.s===true});
      if(C.has('m2:match'))rl.textContent='Match the format: done';
    }
  });

  makeQuiz($('#l2m2-quiz'),'m2',[
    {q:'Why do three varied examples usually beat one?',
     o:['More text always makes the AI try harder','They show what stays the same and what can change, so it copies the pattern','The AI needs exactly three to switch on'],c:1,xp:10,
     why:'One example gets copied nearly line for line. Several let the AI separate the pattern from the particulars.',
     hint:'Remember the “Your…” subject lines from the one-example run.'},
    {q:'All your outputs start the same way, and your single example does too. Best fix?',
     o:['Add two more examples that open differently','Ask it to be more creative','Delete the example and start over'],c:0,xp:10,
     why:'Varied examples tell the AI which part is a habit and which part is a coincidence.',
     hint:'Which option gives the AI new information about what can vary?'}
  ]);
})();

/* ---------- Mission 3: Fix the Miss ---------- */
(function(){
  function words(s){return s.trim().split(/\s+/).length}
  var R=[
    {title:'Round 1: The email that says nothing',
     brief:'Lantern Hill Garden Center (made up). Facts you gave: bulb-planting workshop, Saturday at 10 a.m., free.',
     bad:'Dear Valued Customer, We are excited to share that Lantern Hill Garden Center is hosting a bulb-planting workshop this Saturday at 10 a.m. Whether you are a seasoned gardener or just getting started, this event has something for everyone. Our knowledgeable team will walk you through selecting, preparing, and planting bulbs for a beautiful spring display. The workshop is free, and all are welcome. Thank you for being a part of the Lantern Hill family.',
     ask:'The draft is long and generic. What do you type next?',
     opts:[
      {t:'Make it better.',r:'Dear Valued Customer, We are thrilled to invite you to a truly wonderful bulb-planting workshop this Saturday at 10 a.m. Everyone is welcome, and it is free.',v:'Barely moved, and it got more adjectives. “Better” gives the AI nothing to aim at.',g:'Weak'},
      {t:'Cut it to under 40 words. Keep the day, the time, and that it is free. Open with the workshop, not a greeting.',r:'Bulb-planting workshop, this Saturday at 10 a.m. It’s free. Come learn how to choose, prep, and plant bulbs now so spring shows up on time. See you at Lantern Hill.',v:'This one works. It names a length, what to keep, and how to open.',g:'Strong',ok:true},
      {t:'Start a new chat and try again.',r:'Hello! Join us this Saturday at 10 a.m. for a fun and informative bulb-planting workshop at Lantern Hill. All skill levels welcome. Free!',v:'A fresh draw of the same dice. Everything you had already pinned down is gone.',g:'Reset'}
     ],xp:7},
    {title:'Round 2: Four headlines, two problems',
     brief:'Search ad for Lantern Hill. Rule you gave: headlines 30 characters or fewer. You never gave it any prices.',
     list:['Fall Bulbs, Planted Right','Best Bulb Prices in Town','Free Planting Workshop Saturday','Spring Color Starts Now'],
     ask:'Headline 2 invents a claim and headline 3 is over the limit. Headlines 1 and 4 are fine. What do you type next?',
     opts:[
      {t:'Rewrite all four.',list:['Bulbs for Every Garden','Plant Now, Bloom Later','Garden Center Fall Event','Top-Rated Bulb Selection'],v:'You threw away two good headlines, and a new unsupported claim (“Top-Rated”) crept in.',g:'Weak'},
      {t:'Keep 1 and 4 as they are. Replace 2: I have not given you prices, so no price claims. Shorten 3 to 30 characters or fewer.',list:['Fall Bulbs, Planted Right','Bulbs for Every Garden Bed','Free Bulb Workshop Saturday','Spring Color Starts Now'],v:'Keep, change, don’t touch. Two lines fixed, two left alone.',g:'Strong',ok:true},
      {t:'Why did you write “Best Bulb Prices in Town”?',expl:'I wanted the headline to sound persuasive and competitive, so I added a price claim. I apologize for the confusion.',v:'Interesting, but you still have the same four headlines. An explanation is not an edit.',g:'No fix'}
     ],xp:7},
    {title:'Round 3: Right facts, wrong voice',
     brief:'Instagram caption for the workshop. You want a dry, plain voice. Facts: Saturday, 10 a.m., free.',
     bad:'Don’t miss out! Our incredible bulb workshop is the PERFECT way to get your garden ready for spring. Sign up now and thank us later!',
     ask:'The facts are right but it sounds like a billboard. What do you type next?',
     opts:[
      {t:'Make it sound more like us.',r:'Don’t miss out! Our wonderful bulb workshop is a great way to get your garden ready for spring. Sign up now!',v:'Almost nothing changed. The AI does not know what “us” sounds like.',g:'Weak'},
      {t:'Be less salesy.',r:'Join us Saturday at 10 a.m. for a bulb-planting workshop. It’s free and open to everyone.',v:'Calmer, and a fair second choice. But it only says what to remove, not what to be.',g:'Partial'},
      {t:'Match this voice: dry, short sentences, no exclamation marks, no hype words. Sample: “Tulips don’t plant themselves.”',r:'Tulips do not plant themselves. Saturday, 10 a.m., we show you how. It’s free.',v:'Traits plus a sample line. This is the voice card from Mission 1 doing its job.',g:'Strong',ok:true}
     ],xp:6}
  ];
  var host=$('#l2m3-rounds'),idx=0,clicks=[];
  function render(replay){
    var r=R[idx],won=false,picks=[];
    clicks=[];
    host.textContent='';
    host.appendChild(el('p','roundline',r.title));
    var br=el('div','brief');br.appendChild(el('b',null,'Your brief: '));br.appendChild(document.createTextNode(r.brief));host.appendChild(br);
    host.appendChild(el('p','mini','The AI’s draft'));
    var d=el('ul','out'),dl=el('li','block');
    if(r.list){r.list.forEach(function(h){var row=el('div','pair');row.appendChild(el('span',null,h+'  ('+h.length+' characters)'));dl.appendChild(row)})}
    else dl.appendChild(el('span','t',r.bad+'  ('+words(r.bad)+' words)'));
    d.appendChild(dl);host.appendChild(d);
    host.appendChild(el('p','ask',r.ask+' Tap an option to see what comes back. You can try them all.'));
    var list=el('div','sent'),btns=[];
    var res=el('div','reveal');res.hidden=true;res.setAttribute('aria-live','polite');
    r.opts.forEach(function(o,i){
      var b=el('button','choice','“'+o.t+'”');b.type='button';
      function pick(quiet){
        var at=clicks.indexOf(i);if(at>=0)clicks.splice(at,1);clicks.push(i);
        btns.forEach(function(x,k){x.setAttribute('aria-pressed',k===i?'true':'false')});
        res.textContent='';
        res.appendChild(el('span','tagchip',o.g));
        res.appendChild(el('p','mini','What came back'));
        var u=el('ul','out'),li=el('li','block');
        if(o.list){o.list.forEach(function(h){var row=el('div','pair');row.appendChild(el('span',null,h+'  ('+h.length+' characters)'));li.appendChild(row)})}
        else if(o.expl)li.appendChild(el('span','t',o.expl));
        else li.appendChild(el('span','t',o.r+(o.ok&&o.r.length<300?'  ('+words(o.r)+' words)':'')));
        u.appendChild(li);res.appendChild(u);
        res.appendChild(el('p',null,o.v));
        res.hidden=false;
        if(o.ok){
          b.classList.add('ok');
          if(!won){won=true;if(!quiet)award('m3:r'+idx,r.xp)}
        }else b.classList.add('no');
        if(won){
          if(idx<R.length-1){
            var nb=el('button','btn','Next round');nb.type='button';nb.style.justifySelf='start';
            nb.addEventListener('click',function(){idx++;render()});res.appendChild(nb);
          }else res.appendChild(el('p','note','That is all three rounds. Now the bigger problem.'));
        }
      }
      b.addEventListener('click',function(){pick(false)});
      picks.push(pick);
      list.appendChild(b);btns.push(b);
    });
    host.appendChild(list);host.appendChild(res);
    if(replay)replay.forEach(function(i){picks[i](true)});
  }
  render();
  C.persist('m3.round',{
    get:function(){return {idx:idx,clicks:clicks.slice()}},
    set:function(v){
      if(!v||typeof v!=='object')return;
      var n=(typeof v.idx==='number'&&v.idx>=0&&v.idx<R.length&&v.idx%1===0)?v.idx:0,c=[];
      if(Array.isArray(v.clicks))v.clicks.forEach(function(i){if(typeof i==='number'&&i>=0&&i<R[n].opts.length&&i%1===0&&c.indexOf(i)<0)c.push(i)});
      idx=n;render(c);
    }
  });

  /* chain */
  var CARDS=[
    {id:'d',t:'Ask for all three emails fully written and ready to send, in one go.',hint:'That is the giant prompt you are trying to avoid.'},
    {id:'b',t:'Approve the outline, then ask for email 1 only.',after:'a',hint:'Not yet. You need an outline to approve first.'},
    {id:'a',t:'Ask for an outline: the goal of each of the three emails, one line each.',after:null,hint:'Not yet. What do you need before you can write anything?'},
    {id:'c',t:'Check email 1, then ask for emails 2 and 3 using email 1 as the model.',after:'b',hint:'Not yet. You need email 1 on the table first.'}
  ];
  var ORDER=['a','b','c'];
  var cw=$('#l2m3-cards'),chain=$('#l2m3-chain'),cmsg=$('#l2m3-msg'),step=0,cbtn={};
  function accept(c,quiet){
    var b=cbtn[c.id];
    step++;b.disabled=true;b.classList.add('ok');
    chain.appendChild(el('li',null,c.t));
    if(step>=ORDER.length){
      cbtn.d.disabled=true;cbtn.d.classList.add('dim');
      cmsg.textContent='That is a chain. Each step is small, checked, and feeds the next. The card left over is the one-shot prompt it replaces.';
      if(!quiet)award('m3:chain',10);
    }else cmsg.textContent='Good. Step '+step+' of 3 is in.';
  }
  CARDS.forEach(function(c){
    var b=el('button','choice',c.t);b.type='button';
    b.addEventListener('click',function(){
      if(step>=ORDER.length)return;
      if(c.id===ORDER[step]){
        accept(c,false);
      }else{
        b.classList.add('no');cmsg.textContent=c.hint;
        setTimeout(function(){b.classList.remove('no')},900);
      }
    });
    cw.appendChild(b);cbtn[c.id]=b;
  });
  C.persist('m3.chain',{
    get:function(){return {step:step}},
    set:function(v){
      if(!v||typeof v!=='object'||step>0)return;
      var n=(typeof v.step==='number'&&isFinite(v.step))?Math.max(0,Math.min(ORDER.length,Math.floor(v.step))):0;
      while(step<n){
        var want=ORDER[step];
        accept(CARDS.filter(function(c){return c.id===want})[0],true);
      }
    }
  });

  makeQuiz($('#l2m3-quiz'),'m3',[
    {q:'When is a fresh chat better than another follow-up?',
     o:['Whenever the first answer is not perfect','When the thread is long and tangled, or the direction itself has changed','Never, follow-ups always work better'],c:1,xp:10,
     why:'A fresh chat clears the clutter. Carry over your voice card and facts so you do not lose them.',
     hint:'Round 1 showed what a reset costs. When is that cost worth paying?'},
    {q:'Why put a checkpoint after step 1 of a chain?',
     o:['You catch a wrong direction while it is cheap to fix','It makes the AI work harder on later steps','Chains only work with exactly three steps'],c:0,xp:10,
     why:'Mistakes in step 1 get copied into steps 2 and 3. A quick check early saves a rewrite later.',
     hint:'Think about what happens if the outline is wrong and you only notice at email 3.'}
  ]);
})();

/* ---------- Mission 4: Build Your Kit ---------- */
(function(){
  var VOICE='Voice card: Juniper Row Bakery (example)\nTone: dry, understated, never gushing.\nSentences: short, up to 8 words each.\nPunctuation: no exclamation marks.\nAvoid: hype words like amazing, thrilled, treat yourself.\nSounds like: “Closed Monday. Even bread needs a day off.”';
  var T={
    ad:{n:'Search ad',what:'a search ad (5 headlines and 2 descriptions)',
      role:'senior search ad copywriter for small local businesses',
      aud:'neighbors within ten minutes of the shop who have not visited yet',goal:'get a click to the booking page',
      cons:'Headlines: 30 characters or fewer. Descriptions: 90 characters or fewer. No exclamation marks. No superlatives like “best” or “number one”.',
      ex:'Headline: Fresh bread, baked at 4 a.m.',fmt:'A table with columns: Type, Text, Character count.',audph:true,goalph:false},
    email:{n:'Email',what:'a promotional email (subject, preview text, body)',
      role:'email marketer who writes for small shops',
      aud:'past customers who bought once in the last year',goal:'get a reply or a booking',
      cons:'Subject under 45 characters. Preview text under 80 characters. Body under 120 words. One call to action and one link. No exclamation marks.',
      ex:'Subject: Closed Monday. Even bread needs a day off.',fmt:'Three labeled parts: Subject, Preview, Body.',audph:true,goalph:true},
    page:{n:'Landing page section',what:'the hero section of a landing page',
      role:'conversion copywriter for small business websites',
      aud:'first-time visitors who arrive from a search ad',goal:'get a form sign-up',
      cons:'Headline: 10 words or fewer. Subhead: 25 words or fewer. Three benefit bullets, 12 words or fewer each. Button label: 4 words or fewer.',
      ex:'Headline: Pottery for people who say they can’t.',fmt:'Use these labels: Headline, Subhead, Bullets, Button.',audph:false,goalph:false}
  };
  var KEYS=['ad','email','page'];
  var V={};KEYS.forEach(function(k){var t=T[k];V[k]={role:t.role,aud:t.aud,goal:t.goal,cons:t.cons,ex:t.ex,fmt:t.fmt,audph:t.audph,goalph:t.goalph}});
  var cur='ad',built={};
  var f={role:$('#l2m4-role'),voice:$('#l2m4-voice'),aud:$('#l2m4-aud'),goal:$('#l2m4-goal'),cons:$('#l2m4-cons'),ex:$('#l2m4-ex'),fmt:$('#l2m4-fmt'),audph:$('#l2m4-audph'),goalph:$('#l2m4-goalph')};
  var pre=$('#l2m4-pre'),phn=$('#l2m4-ph'),cn=$('#l2m4-cn'),trk=$('#l2m4-trk'),nextBtn=$('#l2m4-next'),copyBtn=$('#l2m4-copy');
  var seg=$('#l2m4-types'),radios={},spans={};
  f.voice.value=VOICE;

  function val(x,ph){var t=x.value.replace(/[ \t]+/g,' ').trim();return t||ph}
  function store(){
    var v=V[cur];
    v.role=f.role.value;v.aud=f.aud.value;v.goal=f.goal.value;v.cons=f.cons.value;v.ex=f.ex.value;v.fmt=f.fmt.value;v.audph=f.audph.checked;v.goalph=f.goalph.checked;
  }
  function load(){
    var v=V[cur];
    f.role.value=v.role;f.aud.value=v.aud;f.goal.value=v.goal;f.cons.value=v.cons;f.ex.value=v.ex;f.fmt.value=v.fmt;f.audph.checked=v.audph;f.goalph.checked=v.goalph;
    sync();
  }
  function sync(){
    f.aud.disabled=f.audph.checked;f.goal.disabled=f.goalph.checked;
  }
  function build(){
    var t=T[cur];
    var aud=f.audph.checked?'{audience}':val(f.aud,'{audience}');
    var goal=f.goalph.checked?'{goal}':val(f.goal,'{goal}');
    return 'You are a '+val(f.role,'[role]')+'.\n\n'
      +'Write '+t.what+' for {offer}.\n\n'
      +'Audience: '+aud+'\n'
      +'Goal: '+goal+'\n'
      +'Constraints: '+val(f.cons,'[constraints]')+'\n\n'
      +val(f.voice,'[voice card]')+'\n\n'
      +'An example of the style I want:\n'+val(f.ex,'[example]')+'\n\n'
      +'Format: '+val(f.fmt,'[format]')+'\n\n'
      +'Facts you may use:\n{facts}\n\n'
      +'Use only the facts above. Do not invent statistics, quotes, prices, dates, or claims. If you need a fact I did not give you, ask me before writing.';
  }
  function refresh(){
    pre.textContent=build();
    var seen={},list=[];
    (pre.textContent.match(/\{[a-z_]+\}/g)||[]).forEach(function(p){if(!seen[p]){seen[p]=1;list.push(p)}});
    phn.textContent='Fill in each time you use it: '+list.join('  ')+'. Everything else stays fixed.';
  }
  function shelf(){
    var n=Object.keys(built).length;
    KEYS.forEach(function(k){spans[k].classList.toggle('built',!!built[k])});
    trk.textContent=n>=2?'Kit started: '+n+' of 3 types copied.':'Types copied: '+n+' of 2 needed. Pick another type after you copy.';
    var nx=KEYS[(KEYS.indexOf(cur)+1)%KEYS.length];
    nextBtn.textContent='Switch to: '+T[nx].n;
  }
  function select(k){
    if(k===cur)return;
    store();cur=k;radios[k].checked=true;load();refresh();shelf();cn.textContent='';
  }
  KEYS.forEach(function(k){
    var lab=el('label'),inp=document.createElement('input');
    inp.type='radio';inp.name='l2m4-type';inp.value=k;if(k===cur)inp.checked=true;
    var sp=el('span',null,T[k].n);
    inp.addEventListener('change',function(){if(inp.checked)select(k)});
    lab.appendChild(inp);lab.appendChild(sp);seg.appendChild(lab);radios[k]=inp;spans[k]=sp;
  });
  ['role','voice','aud','goal','cons','ex','fmt'].forEach(function(k){f[k].addEventListener('input',refresh);f[k].addEventListener('change',refresh)});
  ['audph','goalph'].forEach(function(k){f[k].addEventListener('change',function(){sync();refresh()})});
  nextBtn.addEventListener('click',function(){select(KEYS[(KEYS.indexOf(cur)+1)%KEYS.length])});
  load();refresh();shelf();
  C.persist('m4.kit',{
    get:function(){
      store();
      var o={cur:cur,built:Object.keys(built),v:{}};
      KEYS.forEach(function(k){var x=V[k];o.v[k]={role:x.role,aud:x.aud,goal:x.goal,cons:x.cons,ex:x.ex,fmt:x.fmt,audph:!!x.audph,goalph:!!x.goalph}});
      return o;
    },
    set:function(d){
      if(!d||typeof d!=='object')return;
      if(d.v&&typeof d.v==='object'){
        KEYS.forEach(function(k){
          var x=d.v[k];if(!x||typeof x!=='object')return;
          ['role','aud','goal','cons','ex','fmt'].forEach(function(p){if(typeof x[p]==='string'&&x[p].length<4000)V[k][p]=x[p]});
          ['audph','goalph'].forEach(function(p){if(typeof x[p]==='boolean')V[k][p]=x[p]});
        });
      }
      built={};
      if(Array.isArray(d.built))d.built.forEach(function(k){if(KEYS.indexOf(k)>=0)built[k]=true});
      if(typeof d.cur==='string'&&KEYS.indexOf(d.cur)>=0)cur=d.cur;
      radios[cur].checked=true;load();refresh();shelf();
    }
  });

  function done(ok){
    built[cur]=true;
    var n=Object.keys(built).length;
    cn.textContent=ok?'Copied. Paste it into your AI tool and replace the {placeholders}.':'Text selected. Press copy on your keyboard, then paste it into your AI tool.';
    award('m4:first',15);
    if(n>=2)award('m4:second',20);
    shelf();
  }
  copyBtn.addEventListener('click',function(){
    store();
    C.copy(build(),pre,done);
  });

  var boxes=$$('#l2m4-checklist input'),ckmsg=$('#l2m4-ckmsg');
  function checkAll(){
    var all=boxes.every(function(b){return b.checked});
    if(all){ckmsg.textContent='All four ticked. Your kit works.';award('m4:check',15)}
    else if(!C.has('m4:check')){ckmsg.textContent=''}
  }
  boxes.forEach(function(b){b.addEventListener('change',checkAll)});
  if(C.has('m4:check')){boxes.forEach(function(b){b.checked=true});ckmsg.textContent='All four ticked. Your kit works.'}
})();
})(window.Course);
