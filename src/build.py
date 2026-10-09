#!/usr/bin/env python3
"""Assemble one level into a single self-contained HTML page.

usage: python3 build.py LEVEL   (levels link to each other as level1.html ... level5.html, one shared origin)
reads : theme.css, engine.js, shell.html, course.json, levels/levelN/{meta.json,mission1-4.html,level.js,level.css?}
writes: out/levelN.html

Each missionN.html is the BODY only and must contain exactly four <div class="label">Title</div> markers
(Try it, Why it works, Check, Go deeper). The build turns each marker into a step section with an h3 heading.
"""
import html, json, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
def rd(p):
    with open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()

def esc(s):
    return html.escape(s, quote=False)

def attr(s):
    return html.escape(s, quote=True)

LABEL = re.compile(r'<div class="label">(.*?)</div>', re.S)

def sections(n_mission, body, errs):
    parts = LABEL.split(body)
    pre, rest = parts[0], parts[1:]
    titles, contents = rest[0::2], rest[1::2]
    if pre.strip():
        errs.append('mission %d: content before the first label marker' % n_mission)
    if len(titles) != 4:
        errs.append('mission %d: expected 4 label markers, found %d' % (n_mission, len(titles)))
        return body
    out = []
    for k in range(4):
        sid = 'm%ds%d' % (n_mission, k)
        out.append('<section class="mstep" id="%s" data-step="%d" aria-labelledby="%sh">\n<h3 class="label" id="%sh" tabindex="-1">%s</h3>\n%s\n</section>'
                   % (sid, k, sid, sid, titles[k].strip(), contents[k].strip()))
    return '\n\n'.join(out)

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    n = int(sys.argv[1])
    course = json.loads(rd('course.json'))
    ld = 'levels/level%d/' % n
    meta = json.loads(rd(ld + 'meta.json'))
    errs = []
    if meta.get('level') != n: errs.append('meta.level must be %d' % n)
    ms = meta.get('missions', [])
    if len(ms) != 4: errs.append('meta.missions must have exactly 4 entries')
    for i, m in enumerate(ms, 1):
        for k in ('name', 'min', 'hook', 'objective'):
            if k not in m: errs.append('mission %d missing %s' % (i, k))
    for k in ('pageTitle', 'name', 'lede', 'description', 'recap', 'next'):
        if k not in meta: errs.append('meta missing ' + k)
    if errs:
        sys.exit('BUILD ERRORS:\n- ' + '\n- '.join(errs))

    nodes, arts = [], []
    for i, m in enumerate(ms, 1):
        nm = esc(m['name'])
        nodes.append('    <button type="button" class="node" data-m="%d"><span class="ni" aria-hidden="true">%d</span><span class="nt"><span class="sr">Mission %d: </span>%s</span><span class="ns">Not started</span><span class="nshort" aria-hidden="true">0/50</span></button>' % (i, i, i, nm))
        body = sections(i, rd(ld + 'mission%d.html' % i).strip(), errs)
        card = ''
        if i == 4:
            recap = ''.join('<li>%s</li>' % esc(r) for r in meta['recap'])
            nxt = esc(meta['next'])
            link = ''
            if n < 5:
                link = '<a class="btn nextlevel" href="level%d.html" style="justify-self:start">Open Level %d</a>' % (n + 1, n + 1)
            card = ('<div class="level" id="levelcard" hidden>\n<div class="stamp" id="stamp">Level complete</div>\n'
                    '<p id="levelsub" style="font-weight:600"></p>\n<ul class="recap">%s</ul>\n<p class="next">%s</p>\n%s\n</div>' % (recap, nxt, link))
        arts.append(
            '<article class="mission" data-m="%d" id="mission%d"%s>\n'
            '<header class="mhead">\n'
            '<p class="mmeta"><span class="mnum">Mission %d of 4</span><span>About %s min</span><span class="mstate">Not started</span></p>\n'
            '<h2 tabindex="-1">%s</h2>\n<p class="hook">%s</p>\n'
            '<p class="objective"><span>Objective</span><b>%s</b></p>\n'
            '<div class="mprog"><div class="bar-track" role="progressbar" aria-label="Mission %d progress" aria-valuemin="0" aria-valuemax="50" aria-valuenow="0"><i></i></div><span class="mprogtxt">0 / 50 XP</span></div>\n'
            '</header>\n<div class="mdone" hidden><p>Mission complete. 50 of 50 XP.</p></div>\n'
            '<nav class="mtabs" aria-label="Steps in this mission"></nav>\n%s\n%s\n<div class="pager"></div>\n</article>'
            % (i, i, '' if i == 1 else ' hidden', i, m['min'], nm, esc(m['hook']), esc(m['objective']), i, body, card))
    if errs:
        sys.exit('BUILD ERRORS:\n- ' + '\n- '.join(errs))

    lv = []
    for c in course['levels']:
        prog = '<span class="lvp" data-n="%d"></span>' % c['n']
        if c['n'] == n:
            lv.append('<span class="lv cur" aria-current="page"><b>%d</b> %s%s</span>' % (c['n'], esc(c['name']), prog))
        else:
            lv.append('<a class="lv" href="level%d.html"><b>%d</b> %s%s</a>' % (c['n'], c['n'], esc(c['name']), prog))

    css = rd('theme.css')
    if os.path.exists(os.path.join(ROOT, ld + 'level.css')):
        css += '\n/* level %d */\n' % n + rd(ld + 'level.css')
    cfg = {'level': n, 'name': meta['name'], 'missions': [{'name': m['name'], 'min': m['min']} for m in ms]}
    cfg_json = json.dumps(cfg, ensure_ascii=False).replace('</', '<\\/')
    out = rd('shell.html')
    reps = {
        '{{PAGE_TITLE}}': esc(meta['pageTitle']), '{{CSS}}': css, '{{LEVEL}}': str(n), '{{H1}}': esc(meta['name']),
        '{{LEDE}}': esc(meta['lede']), '{{LEVELNAV}}': ''.join(lv), '{{NODES}}': '\n'.join(nodes),
        '{{ARTICLES}}': '\n\n'.join(arts), '{{LEVEL_JSON}}': cfg_json, '{{ENGINE_JS}}': rd('engine.js'),
        '{{LEVEL_JS}}': rd(ld + 'level.js'),
    }
    for k, v in reps.items():
        out = out.replace(k, v)
    left = re.findall(r'\{\{[A-Z_]+\}\}', out)
    if left:
        sys.exit('unreplaced placeholders: %s' % left)
    for bad, nm in (('—', 'em dash'), ('–', 'en dash')):
        if bad in out:
            errs.append('%s found in output (house rule: none)' % nm)
    for i in range(1, 5):
        if 'id="mission%d"' % i not in out: errs.append('mission %d missing' % i)
    ids = re.findall(r'\sid="([^"]+)"', out)
    dups = sorted({x for x in ids if ids.count(x) > 1})
    if dups:
        errs.append('duplicate ids: %s' % ', '.join(dups))
    if errs:
        sys.exit('BUILD ERRORS:\n- ' + '\n- '.join(errs))
    os.makedirs(os.path.join(ROOT, 'out'), exist_ok=True)
    dest = os.path.join(ROOT, 'out', 'level%d.html' % n)
    with open(dest, 'w', encoding='utf-8') as f:
        f.write(out)
    # full document for supporting-file pages (no skeleton is added to those, so they need their own doctype, charset and viewport)
    os.makedirs(os.path.join(ROOT, 'out', 'full'), exist_ok=True)
    full = ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
            + out + '\n</html>\n')
    with open(os.path.join(ROOT, 'out', 'full', 'level%d.html' % n), 'w', encoding='utf-8') as f:
        f.write(full)
    print('built', dest, '(%d KB)' % (len(out.encode('utf-8')) // 1024))

main()
