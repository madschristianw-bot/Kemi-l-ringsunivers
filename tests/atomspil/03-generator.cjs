/* Test 4–7 og 18: atom-billedet, generatoren, facit = infoboksen, reglerne og kemien i tipsene. */
const L = require('./lib.cjs');
const zlib = require('zlib');

/* en lille PNG-læser (8 bit RGB/RGBA, ingen interlace) — nok til Playwrights skærmbilleder */
function laesPng(buf){
  let o = 8, w, h, bpp, idat = [];
  while(o < buf.length){
    const n = buf.readUInt32BE(o), type = buf.toString('ascii', o + 4, o + 8), d = buf.slice(o + 8, o + 8 + n);
    if(type === 'IHDR'){ w = d.readUInt32BE(0); h = d.readUInt32BE(4); bpp = d[9] === 6 ? 4 : 3; }
    if(type === 'IDAT') idat.push(d);
    o += 12 + n;
  }
  const raa = zlib.inflateSync(Buffer.concat(idat)), linje = w * bpp, ud = Buffer.alloc(h * linje);
  for(let y = 0; y < h; y++){
    const f = raa[y * (linje + 1)], src = raa.slice(y * (linje + 1) + 1, (y + 1) * (linje + 1));
    for(let x = 0; x < linje; x++){
      const a = x >= bpp ? ud[y*linje + x - bpp] : 0, b = y ? ud[(y-1)*linje + x] : 0, c = x >= bpp && y ? ud[(y-1)*linje + x - bpp] : 0;
      let v = src[x];
      if(f === 1) v += a; else if(f === 2) v += b; else if(f === 3) v += (a + b) >> 1;
      else if(f === 4){ const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      ud[y*linje + x] = v & 255;
    }
  }
  return {w, h, px:(x, y) => { /* pixlen, punktet ligger i */ const i = Math.floor(y) * linje + Math.floor(x) * bpp; return [ud[i], ud[i+1], ud[i+2]]; }};
}

(async () => {
  const t = L.test('03 generator, facit og billede');
  const b = await L.browser();
  const {page, fejl} = await L.aaben(b);

  /* 4 — gradienter og billede, med Byg selv skjult */
  let seedB = await page.evaluate(() => { for(let s = 1; ; s++){ const g = aspLavSpil(2, s); const i = g.findIndex(d => d.vis === 'billede' && d.s.n > 2 && d.s.p > 2); if(i >= 0) return [s, i]; } });
  await L.aspSpring(page, 2, seedB[0], seedB[1]);
  const g4 = await page.evaluate(() => {
    const svg = document.getElementById('aspStage'), d = ASP.liste[ASP.i];
    const kugler = [...svg.querySelectorAll('g.kerne > circle')];
    return {s:d.s, alle:kugler.every(c => /^url\(#asp[PN]\)$/.test(c.getAttribute('fill'))),
      P:kugler.filter(c => c.getAttribute('fill') === 'url(#aspP)').length, N:kugler.filter(c => c.getAttribute('fill') === 'url(#aspN)').length,
      defs:!!svg.querySelector('defs #aspP') && !!svg.querySelector('defs #aspN'), e:svg.querySelectorAll('circle[r="6"]').length,
      bygSkjult:document.getElementById('ufp-build-byg').style.display === 'none'};
  });
  t.sand(g4.bygSkjult, 'Byg selv er skjult under testen');
  t.sand(g4.alle, 'alle kugler i kernen bruger url(#aspP) eller url(#aspN)');
  t.lig([g4.P, g4.N, g4.e], [g4.s.p, g4.s.n, g4.s.e], 'antal protoner, neutroner og elektroner i billedet');
  t.sand(g4.defs, '#aspP og #aspN findes i billedets defs');
  // pixeltjek: protonerne er røde og neutronerne grå på skærmen
  await page.evaluate(() => document.getElementById('aspStage').scrollIntoView({block:'center', behavior:'instant'}));
  await page.waitForTimeout(300);
  const kugler = await page.evaluate(() => {
    const svg = document.getElementById('aspStage');
    const r = c => { const b = c.getBoundingClientRect(); return {x:b.x + b.width/2, y:b.y + b.height/2, r:b.width/2}; };
    return {p:r(svg.querySelector('g.kerne > circle[fill="url(#aspP)"]')), n:r(svg.querySelector('g.kerne > circle[fill="url(#aspN)"]'))};
  });
  const png = laesPng(await page.screenshot());
  /* 0,4·r skråt ud fra midten: midten selv er protonens hvide "+", og ved 0,55·r (som i specifikationen)
     ligger punktet ved 0,9 i skala under en pixel fra den mørke kant og bliver halvt kantfarvet */
  const pp = png.px(kugler.p.x + .4*kugler.p.r, kugler.p.y + .4*kugler.p.r), np = png.px(kugler.n.x + .4*kugler.n.r, kugler.n.y + .4*kugler.n.r);
  t.sand(pp[0] > 200 && pp[1] < 140, 'en proton er rød på skærmen (' + pp + ')');
  t.sand(Math.abs(np[0] - np[1]) < 30 && np[0] > 140, 'en neutron er grå på skærmen (' + np + ')');
  // det tællelige mønster holder sig inde i billedet og kuglerne fra hinanden
  const lay = await page.evaluate(() => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    let ud = 0, taet = 99, ring = 0;
    for(let p = 0; p <= 20; p++) for(let n = 0; n <= 40; n++) for(let e = 0; e <= 20; e += (p + n > 0 ? 1 : 20)){
      drawAtom(svg, {p, n, e}, {gid:'asp', tael:true, etiket:true, uro:true});
      const c = [...svg.querySelectorAll('circle')].map(x => [+x.getAttribute('cx'), +x.getAttribute('cy'), +x.getAttribute('r')]);
      c.forEach(([x, y, r]) => { if(x - r < 0 || y - r < 0 || x + r > 400 || y + r > 400) ud++; });
      const k = [...svg.querySelectorAll('g.kerne > circle')].map(x => [+x.getAttribute('cx'), +x.getAttribute('cy')]);
      for(let i = 0; i < k.length; i++) for(let j = i + 1; j < k.length; j++) taet = Math.min(taet, Math.hypot(k[i][0]-k[j][0], k[i][1]-k[j][1]));
      if(svg.querySelector('g.kerne > circle') && svg.querySelectorAll('g.kerne > circle').length !== p + n) ring++;
    }
    return {ud, taet, ring};
  });
  t.lig(lay.ud, 0, 'cirkler uden for 0–400 i det tællelige mønster');
  t.sand(lay.taet >= 19.9, 'mindste afstand mellem to kerne-kugler ≥ 19,9 (fik ' + lay.taet.toFixed(2) + ')');
  t.lig(lay.ring, 0, 'antal kugler = p + n');

  /* 5 — generatorens invarianter, seeds 1–5000 */
  const r5 = await page.evaluate(() => {
    const fejl = [], kat = {}, PLAN = [['grundstof',3,'skal',2], ['masse',null,'ladning',null], ['udfyld',3,'byg',2], ['iondom',2,'kernedom',2,'ion',1]];
    let gentag0 = 0, gentag1 = 0, n4 = {iondom:0, kernedom:0};
    const s2 = s => s.p + '-' + s.n + '-' + s.e;
    for(let niv = 1; niv <= 4; niv++) for(let seed = 1; seed <= 5000; seed++){
      const g = aspLavSpil(niv, seed), typer = g.map(d => d.t);
      if(g.length !== 5) fejl.push(['længde', niv, seed]);
      const ant = {}; typer.forEach(x => ant[x] = (ant[x] || 0) + 1);
      const pl = PLAN[niv-1];
      if(niv === 2){ if(!((ant.masse === 2 && ant.ladning === 3) || (ant.masse === 3 && ant.ladning === 2))) fejl.push(['plan', niv, seed, typer]); }
      else for(let k = 0; k < pl.length; k += 2) if(ant[pl[k]] !== pl[k+1]) fejl.push(['plan', niv, seed, typer]);
      for(let i = 1; i < 5; i++) if(typer[i] === typer[i-1]) fejl.push(['naboer', niv, seed]);
      if(new Set(g.map(d => d.s.p)).size !== 5) fejl.push(['Z', niv, seed]);
      if(niv === 2){
        const v = g.map(d => d.t + d.vis);
        if(!v.includes('massebillede') || !v.includes('massetal') || !v.includes('ladningbillede') || !v.includes('ladningtal')) fejl.push(['L2-vis', seed, v]);
      }
      if(niv === 3){
        const u = g.filter(d => d.t === 'udfyld');
        if(typer.map(x => x[0]).join('') !== 'ububu' || u[2].felter.length !== 4 || u[0].felter.length !== 2 || u[0].felter.join() === u[1].felter.join()) fejl.push(['L3', seed]);
      }
      g.forEach(d => {
        const s = d.s, Q = s.p - s.e;
        if(s.p < 1 || s.p > 20 || s.e < 0 || s.e > 20 || (s.p === 1 && s.e === 2)) fejl.push(['område', s]);
        if(niv < 4 && Q !== 0 && Q !== expectedIon(s.p)) fejl.push(['ladning', niv, s]);
        if(d.t === 'ion' && s.p === 1) fejl.push(['ion-H']);
        if(d.t === 'iondom' && d.kat === 'warn' && s.p === 5 && Q < 0) fejl.push(['B3-']);
        if(d.vis === 'billede' && !ASP_BILLEDE(s)) fejl.push(['billede', s]);
        if(d.felter && d.felter.includes('skal') && d.vis !== 'tal') fejl.push(['skal-tal']);
        if(d.kat){ kat[d.t + ':' + d.kat] = (kat[d.t + ':' + d.kat] || 0) + 1; n4[d.t]++; }
      });
      if(JSON.stringify(g) !== JSON.stringify(aspLavSpil(niv, seed))) fejl.push(['determinisme', niv, seed]);
      // genspil: undgaa = forrige spil på niveauet
      if(seed <= 1000){
        const h = aspLavSpil(niv, seed + 7777), h2 = aspLavSpil(niv, seed + 7777, g.map(d => d.s));
        const gs = new Set(g.map(d => s2(d.s)));
        gentag0 += h.filter(d => gs.has(s2(d.s))).length; gentag1 += h2.filter(d => gs.has(s2(d.s))).length;
      }
    }
    const frek = {}; Object.keys(kat).forEach(k => frek[k] = kat[k] / n4[k.split(':')[0]]);
    const snap = {}; [1,2,3,4].forEach(n => [1,2,42].forEach(s => snap[n + ':' + s] = aspLavSpil(n, s)));
    return {fejl:fejl.slice(0, 10), nfejl:fejl.length, frek, gentag0, gentag1, snap};
  });
  t.lig(r5.nfejl, 0, 'generatorens invarianter (form, naboer, fem Z, L3, områder, ladninger, billede, determinisme) ' + JSON.stringify(r5.fejl));
  const W = {'iondom:ok':.45, 'iondom:bad':.35, 'iondom:warn':.2, 'kernedom:ok':.35, 'kernedom:warn':.35, 'kernedom:bad':.3};
  Object.keys(W).forEach(k => t.sand(Math.abs((r5.frek[k] || 0) - W[k]) <= .05, `hyppigheden af ${k} er ${(100*(r5.frek[k]||0)).toFixed(1)} % (vægt ${W[k]*100} %)`));
  t.sand(r5.gentag1 * 10 <= r5.gentag0 && r5.gentag0 > 0, `undgaa virker: ${r5.gentag1} gentagelser med, ${r5.gentag0} uden`);
  L.snapshot(t, 'snapshot.json', r5.snap, 'generatorens øjebliksbillede');

  /* 6 — facit er præcis det, infoboksen i Byg selv viser */
  const r6 = await page.evaluate(() => {
    const fejl = [], cache = {}, CI = {ok:'Fornuftig ion ✓', warn:'Ualmindelig ion', bad:'Usandsynlig ion ✗'},
          CK = {ok:'Mest almindelige isotop ✓', warn:'Anden isotop', bad:'Ustabil kerne ✗'};
    const boks = s => { const k = s.p + '-' + s.n + '-' + s.e; if(cache[k]) return cache[k];
      state = {p:s.p, n:s.n, e:s.e}; render(); const $ = id => document.getElementById(id);
      return cache[k] = {Z:+$('vZ').textContent, A:+$('vA').textContent, Q:+$('vQ').textContent.replace('+', ''),
        skal:parseInt($('vShell').textContent), sym:$('symEl').firstChild.textContent,
        vcls:$('verdict').className, vtag:($('verdict').querySelector('.tag') || {}).textContent,
        kcls:$('isoDom').className, ktag:($('isoDom').querySelector('.tag') || {}).textContent}; };
    let n = 0;
    for(let niv = 1; niv <= 4; niv++) for(let seed = 1; seed <= 1500; seed++) aspLavSpil(niv, seed).forEach(d => {
      n++;
      const f = aspFacit(d), x = boks(d.s);
      if(x.Z !== f.Z || x.A !== f.A || x.Q !== f.Q || x.skal !== f.skal || x.sym !== f.sym) fejl.push(['felter', d.s, f, x]);
      if(d.t === 'iondom' && (x.vcls !== 'verdict ion ' + f.dom || x.vtag !== CI[f.dom] || f.dom !== d.kat)) fejl.push(['iondom', d.s]);
      if(d.t === 'kernedom' && (x.kcls !== 'verdict kerne ' + f.kerne || x.ktag !== CK[f.kerne] || f.kerne !== d.kat)) fejl.push(['kernedom', d.s]);
      if(d.t === 'ion'){
        if(x.vcls !== 'verdict ion ok') fejl.push(['ion-mål', d.s]);
        for(let e = 0; e <= 20; e++) if(e !== d.s.e && boks({p:d.s.p, n:d.s.n, e}).vcls === 'verdict ion ok') fejl.push(['ion-entydig', d.s, e]);
      }
    });
    return {n, fejl:fejl.slice(0, 5), nfejl:fejl.length};
  });
  t.sand(r6.n >= 30000, 'mindst 30.000 opgaver i test 6 (fik ' + r6.n + ')');
  t.lig(r6.nfejl, 0, 'facit = infoboksen ' + JSON.stringify(r6.fejl));

  /* 7 — reglerne: facit består, alt andet dumper */
  const r7 = await page.evaluate(() => {
    const fejl = [], typer = {};
    for(let niv = 1; niv <= 4; niv++) for(let seed = 1; seed <= 300; seed++) aspLavSpil(niv, seed).forEach(d => {
      typer[d.t] = (typer[d.t] || 0) + 1;
      const f = aspFacit(d), fl = ASP_TYPER[d.t].felter(d);
      if(!aspRet(d, f).ok) fejl.push(['facit', d.t, d.s]);
      fl.forEach(k => {
        const proev = (v, hvad) => { const r = aspRet(d, Object.assign({}, f, {[k]:v}));
          if(r.ok || r.forkert.join() !== k) fejl.push([hvad, d.t, k, v, d.s]); };
        if(['A','Q','skal','p','n','e'].includes(k)){ proev(f[k] + 1, '+1'); proev(f[k] - 1, '−1');
          if(k === 'Q' && f.Q !== 0) proev(-f.Q, 'fortegn'); }
        if(k === 'Z') for(let z = 1; z <= 20; z++) if(z !== f.Z) proev(z, 'Z');
        if(k === 'valg') proev(f.valg === 'ion' ? 'neutral' : 'ion', 'valg');
        if(k === 'dom' || k === 'kerne') ['ok','warn','bad'].filter(v => v !== f[k]).forEach(v => proev(v, k));
      });
    });
    const tal = {};
    ['+2','2+','−2','–2','-2','2-','0','+','-','2,5','++','x',''].forEach(x => tal[x] = aspLaesTal(x, true));
    return {fejl:fejl.slice(0, 5), nfejl:fejl.length, typer, tal, ikkeFortegn:[aspLaesTal('12', false), aspLaesTal('-1', false), aspLaesTal('', false)]};
  });
  t.lig(Object.keys(r7.typer).sort(), ['byg','grundstof','ion','iondom','kernedom','ladning','masse','skal','udfyld'], 'alle ni typer er prøvet');
  t.lig(r7.nfejl, 0, 'facit består, og ±1, fortegn, andre brikker og andre grundstoffer dumper ' + JSON.stringify(r7.fejl));
  const T = r7.tal;
  t.lig([T['+2'], T['2+'], T['−2'], T['–2'], T['-2'], T['2-'], T['0'], T['+'], T['-']], [2, 2, -2, -2, -2, -2, 0, 1, -1], 'aspLaesTal godtager ladningerne');
  t.sand([T['2,5'], T['++'], T['x']].every(v => v !== null && Number.isNaN(v)), 'aspLaesTal afviser 2,5, ++ og x');
  t.lig(T[''], null, 'tomt felt er null');
  t.sand(r7.ikkeFortegn[0] === 12 && Number.isNaN(r7.ikkeFortegn[1]) && r7.ikkeFortegn[2] === null, 'felter uden fortegn');

  /* 18 — kemien i tipsene */
  const r18 = await page.evaluate(() => {
    const fejl = [];
    for(let niv = 1; niv <= 4; niv++) for(let seed = 1; seed <= 2000; seed++) aspLavSpil(niv, seed).forEach(d => {
      const s = d.s, en = shellFill(s.e, s.p).length <= 1;
      if(!((d.t === 'skal' || (d.t === 'udfyld' && d.felter.includes('skal'))) && en)) return;
      const f = aspFacit(d);
      for(let v = 0; v <= 20; v++){ if(v === f.skal) continue;
        const h = aspHintSkal(d, v) + ' ' + aspHint(d, Object.assign({}, f, {skal:v}));
        if(/mangler [678]\b|0 er det antal/.test(h)) fejl.push([s, v, h]); }
    });
    // iondom: hvert par (facit, valg) har sin egen tekst
    const par = new Set();
    for(let seed = 1; seed <= 3000; seed++) aspLavSpil(4, seed).forEach(d => {
      if(d.t !== 'iondom') return;
      const f = aspFacit(d).dom, z = d.s.p;
      const gruppe = f === 'ok' ? (z === 1 ? 'H+' : 'andet') : f === 'warn' ? (z === 5 ? 'B' : 'CSi') : (mainGroup(z) === 8 ? 'aedel' : 'zion');
      ['ok','warn','bad'].filter(c => c !== f).forEach(c => {
        if(aspHint(d, Object.assign({}, aspFacit(d), {dom:c})).length > 40) par.add(f + ':' + gruppe + ':' + c);
      });
    });
    // ion: tællerne stopper ved 20 elektroner
    let seed = 1; while(!aspLavSpil(4, seed).some(d => d.t === 'ion')) seed++;
    return {fejl:fejl.slice(0, 3), nfejl:fejl.length, par:[...par].sort(), seed};
  });
  t.lig(r18.nfejl, 0, 'skal-tips for H, He, Li⁺, Be²⁺ og H⁺ nævner aldrig "mangler 6–8" eller "0 er det antal" ' + JSON.stringify(r18.fejl));
  t.lig(r18.par, ['bad:aedel:ok','bad:aedel:warn','bad:zion:ok','bad:zion:warn','ok:H+:bad','ok:H+:warn','ok:andet:bad','ok:andet:warn',
                  'warn:B:bad','warn:B:ok','warn:CSi:bad','warn:CSi:ok'], 'alle (facit, valg)-par i iondom forekommer');
  const forskellige = await page.evaluate(() => {
    const mk = (s, c) => { const d = {t:'iondom', vis:'tal', kat:null, s}; return aspHint(d, Object.assign({}, aspFacit(d), {dom:c})); };
    const h = [mk({p:1,n:0,e:0},'warn'), mk({p:11,n:12,e:10},'bad'), mk({p:6,n:6,e:2},'ok'), mk({p:6,n:6,e:2},'bad'),
               mk({p:5,n:6,e:2},'ok'), mk({p:5,n:6,e:2},'bad'), mk({p:11,n:12,e:12},'warn'), mk({p:10,n:10,e:9},'ok')];
    return new Set(h).size;
  });
  t.lig(forskellige, 8, 'otte forskellige iondom-tips for de otte slags par');
  await L.aspSpring(page, 4, r18.seed, 0);
  await page.evaluate(() => { const i = ASP.liste.findIndex(d => d.t === 'ion'); ASP.i = i; aspNyOpgave(); aspTegnOpg(); return i; });
  for(let k = 0; k < 25; k++) await page.click('#aspOpg button[data-asp="trin"][data-type="e"][data-d="1"]');
  const g18 = await page.evaluate(() => ({e:ASP.byg.e, felt:document.getElementById('aspN-e').value, vist:!document.getElementById('aspGraense').hidden,
    p:document.getElementById('aspN-p').readOnly, knap:document.querySelector('#aspOpg button[data-type="p"]').disabled}));
  t.lig(g18, {e:20, felt:'20', vist:true, p:true, knap:true}, 'ion: elektronerne stopper ved 20, grænsen vises, og protonerne er låst');

  L.ingenFejl(t, fejl);
  await b.close();
  t.slut();
})().catch(e => { console.error(e); process.exit(1); });
