import json,sys,statistics as st
for f in sys.argv[1:]:
    M=[json.loads(l) for l in open(f) if l.startswith('{"ally"')]
    bots=[b for m in M for b in m['bots']]
    print(f, 'matches',len(M))
    print('  stuck median %.1f mean %.1f max %.1f >20s %d'%(st.median([b['stuck'] for b in bots]),st.mean([b['stuck'] for b in bots]),max(b['stuck'] for b in bots),sum(b['stuck']>20 for b in bots)))
    print('  park %d/%d  G417 %d G411 %d botCards %d  meG408 %d'%(sum(b['lz'] for b in bots),len(bots),sum(m['g417'] for m in M),sum(m['g411'] for m in M),sum(m['botCards'] for m in M),sum(m['meG408auto'] for m in M)))
    print('  acc %.3f shots/bot %.1f parkedWithBalls %d'%(sum(b['hit'] for b in bots)/sum(b['sh'] for b in bots),st.mean([b['sh'] for b in bots]),sum((b['clipAtPark'] or 0)>0 for b in bots)))
    print('  partner-alliance %.1f opp-alliance %.1f firstStep max %.0f median %.0f'%(st.mean([m['final'][m['ally']] for m in M]),st.mean([m['final']['blue' if m['ally']=='red' else 'red'] for m in M]),max(m['firstStepMs'] for m in M),st.median([m['firstStepMs'] for m in M])))
    by={}
    for m in M: by.setdefault(m['bid'],[]).append(m)
    print('  by build:', {k:{'stuckMean':round(st.mean([b['stuck'] for m in v for b in m['bots']]),1),'park':sum(b['lz'] for m in v for b in m['bots'])} for k,v in by.items()})
    bs={}
    for m in M: bs.setdefault(m['skill'],[]).append(m)
    print('  by skill (own/opp):',{k:(round(st.mean([m['final'][m['ally']] for m in v]),1),round(st.mean([m['final']['blue' if m['ally']=='red' else 'red'] for m in v]),1)) for k,v in sorted(bs.items())})
