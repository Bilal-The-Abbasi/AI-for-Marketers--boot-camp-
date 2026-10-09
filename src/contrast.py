import re
css=open('theme.css',encoding='utf-8').read()
def block(sel_start):
    i=css.index(sel_start); j=css.index('}',i); return css[i:j]
def toks(b): return dict(re.findall(r'--([a-z0-9-]+):(#[0-9A-Fa-f]{6})',b))
dark=toks(block(':root{\n  /* surfaces */'))
light=toks(block(':root[data-theme="light"]{'))
def lum(h):
    h=h.lstrip('#'); r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    f=lambda c: c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def cr(a,b):
    la,lb=lum(a),lum(b); hi,lo=max(la,lb),min(la,lb); return (hi+0.05)/(lo+0.05)
# (fg, bg, kind, need)
pairs=[('ink','bg','text',4.5),('ink','surface','text',4.5),('ink','raised','text',4.5),('ink','raised-2','text',4.5),
 ('muted','bg','text',4.5),('muted','surface','text',4.5),('muted','raised','text',4.5),('muted','raised-2','text',4.5),
 ('on-accent','accent','button text',4.5),('on-accent','accent-hover','button text',4.5),
 ('accent','bg','accent text',4.5),('accent','surface','accent text',4.5),('ink','accent-tint','selected text',4.5),
 ('ok','surface','success text',4.5),('ok','ok-tint','success text',4.5),('on-ok','ok','check on success',4.5),
 ('warn','surface','attention text',4.5),('warn','warn-tint','attention text',4.5),('ink','warn-tint','text on attention tint',4.5),('ink','ok-tint','text on success tint',4.5),
 ('line-strong','bg','control border',3.0),('line-strong','surface','control border',3.0),('line-strong','raised','control border',3.0),
 ('accent','bg','selected border/focus',3.0),('focus','bg','focus ring',3.0),('focus','surface','focus ring',3.0)]
fail=0
for name,t in (('dark',dark),('light',light)):
    print('\n'+name.upper())
    for fg,bg,kind,need in pairs:
        if fg not in t or bg not in t: continue
        r=cr(t[fg],t[bg]); flag='ok ' if r>=need else 'LOW'
        if r<need: fail+=1
        print(f'  {flag} {r:5.2f}:1 (need {need})  {fg} {t[fg]} on {bg} {t[bg]}  [{kind}]')
print('\nlow pairs:',fail)
