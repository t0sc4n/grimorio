import re,sys,unicodedata
aff,dic,dst=sys.argv[1:4]
rules={}  # flag -> (kind, cross, [(strip,add,addflags,cond_re)])
lines=open(aff,encoding='utf-8').read().split('\n')
i=0
while i<len(lines):
    p=lines[i].split()
    if len(p)>=4 and p[0] in('SFX','PFX') and p[2] in('Y','N') and p[3].isdigit():
        kind,flag,cross,n=p[0],p[1],p[2]=='Y',int(p[3]); ents=[]
        for j in range(1,n+1):
            q=lines[i+j].split()
            strip='' if q[2]=='0' else q[2]
            add,_,af=q[3].partition('/'); add='' if add=='0' else add
            cond=q[4] if len(q)>4 else '.'
            rx=re.compile(('^'+cond) if kind=='PFX' else (cond+'$'))
            ents.append((strip,add,af,rx))
        rules[flag]=(kind,cross,ents); i+=n+1; continue
    i+=1
def apply(word,flags,depth=0):
    out=set()
    sfx=[]
    for f in flags:
        if f not in rules: continue
        kind,cross,ents=rules[f]
        for strip,add,af,rx in ents:
            if not rx.search(word): continue
            if kind=='SFX':
                if strip and not word.endswith(strip): continue
                w=word[:len(word)-len(strip)]+add
                out.add(w); 
                if cross: sfx.append(w)
                if af and depth<1: out|=apply(w,af,depth+1)
            else:
                if strip and not word.startswith(strip): continue
                w=add+word[len(strip):]; out.add(w)
                if cross:
                    for g in flags:
                        if g in rules and rules[g][0]=='SFX' and rules[g][1]:
                            out|=apply(w,g,depth+1)
                if af and depth<1: out|=apply(w,af,depth+1)
    return out
ok=set("ABCDEFGHILMNOPQRSTUVZ")
res=set(); raw=0
for ln in open(dic,encoding='utf-8').read().split('\n')[1:]:
    ln=ln.strip()
    if not ln or ln.startswith('/'): continue
    w,_,fl=ln.partition('/')
    if not w[:1].islower(): continue   # niente nomi propri e sigle
    forms={w}|apply(w,fl)
    for f in forms:
        raw+=1
        if "'" in f or '-' in f: continue
        y=unicodedata.normalize('NFD',f).encode('ascii','ignore').decode().upper()
        if 2<=len(y)<=11 and set(y)<=ok: res.add(y)
res=sorted(res)
open(dst,'w',encoding='ascii',newline='\n').write('\n'.join(res))
print('forme',raw,'parole',len(res))
