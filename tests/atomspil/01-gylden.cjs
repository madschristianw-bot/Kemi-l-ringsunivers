/* Test 1, 1b, 1c og 2: Byg selv opfører sig nøjagtig som før Atomspillet.
   1  — ca. 1.700 tilstande gennem render() i den gamle og den nye side: samme DOM, byte for byte.
   1b — atomInfo afhænger ikke af byggerens state.
   1c — spillets stemme siger aldrig "du har" og skriver ladninger med rigtigt minus.
   2  — byg-opgaverne og deres måling påvirkes ikke af spillet. */
const L = require('./lib.cjs');

/* samme tilstande og samme rækkefølge i begge filer */
function samlGylden(){
  const P = []; for(let p = 0; p <= 36; p++) P.push(p); P.push(50, 53, 82, 83, 92, 118);
  const tilst = [];
  P.forEach(p => {
    const Nt = p ? A_typ(p) - p : 0;
    const N = [...new Set([0, Nt-1, Nt, Nt+1, Nt+3].filter(n => n >= 0))];
    const E = [...new Set([0, p-3, p-2, p-1, p, p+1, p+2, p+3].filter(e => e >= 0))];
    N.forEach(n => E.forEach(e => tilst.push({p, n, e})));
  });
  const $ = id => document.getElementById(id);
  const foto = () => ({np:$('np').textContent, nn:$('nn').textContent, ne:$('ne').textContent,
    vZ:$('vZ').innerHTML, vA:$('vA').innerHTML, vQ:$('vQ').innerHTML, vShell:$('vShell').innerHTML,
    sym:$('symEl').innerHTML, lad:$('symCharge').textContent, ladStil:$('symCharge').getAttribute('style'),
    navn:$('elName').textContent, linje:$('elLine').textContent,
    vcls:$('verdict').className, vhtml:$('verdict').innerHTML,
    icls:$('isoDom').className, iskjult:$('isoDom').hidden, ihtml:$('isoDom').innerHTML,
    stage:$('stage').innerHTML});
  const ud = tilst.map(s => { state = {p:s.p, n:s.n, e:s.e}; render(); return foto(); });
  // opgaveboksen med fire af byg-opgaverne
  const opg = [];
  ['a5','a10','a13','a14'].forEach(id => {
    atTask = id;
    tilst.filter(s => s.p <= 20).forEach(s => { state = {p:s.p, n:s.n, e:s.e}; render();
      opg.push($('atTaskBox').className + '|' + $('atTaskBox').innerHTML); });
  });
  atTask = null;
  reset(); setFromZ(17); step('e', 1);
  const raekke = foto();
  return {n:tilst.length, ud, opg, raekke};
}

(async () => {
  const t = L.test('01 gylden: Byg selv er uændret');
  const b = await L.browser();
  const gl = await L.aaben(b, {url:L.basisSide()});
  const ny = await L.aaben(b);
  const A = await gl.page.evaluate(samlGylden), B = await ny.page.evaluate(samlGylden);
  t.sand(A.n >= 1600, 'mindst 1.600 tilstande (fik ' + A.n + ')');
  let forskel = 0;
  A.ud.forEach((a, i) => { const x = JSON.stringify(a), y = JSON.stringify(B.ud[i]);
    if(x !== y && forskel++ < 3){
      const k = Object.keys(a).find(k => a[k] !== B.ud[i][k]);
      t.sand(false, `tilstand ${i}: feltet ${k} afviger: ${String(a[k]).slice(0,160)} ≠ ${String(B.ud[i][k]).slice(0,160)}`);
    } });
  t.lig(forskel, 0, 'antal tilstande, hvor DOM afviger fra før');
  t.lig(B.opg.length, A.opg.length, 'antal opgavebokse');
  t.sand(JSON.stringify(A.opg) === JSON.stringify(B.opg), 'opgaveboksen (a5, a10, a13, a14) er uændret');
  t.lig(B.raekke, A.raekke, 'reset → setFromZ(17) → step(e,1)');

  // drawAtom() = drawAtom(stage, state, {})
  const ens = await ny.page.evaluate(() => {
    const ok = [];
    for(const s of [{p:0,n:0,e:0},{p:6,n:6,e:6},{p:17,n:19,e:18},{p:92,n:146,e:92},{p:1,n:2,e:0}]){
      state = s; render(); const a = document.getElementById('stage').innerHTML;
      drawAtom(document.getElementById('stage'), state, {}); ok.push(a === document.getElementById('stage').innerHTML);
    }
    return ok;
  });
  t.lig(ens, [true,true,true,true,true], 'drawAtom() giver det samme som drawAtom(stage, state, {})');

  /* 1b — atomInfo læser kun s */
  const r1b = await ny.page.evaluate(() => {
    let rng = 7, fejl = 0;
    const tal = m => (rng = (rng * 1103515245 + 12345) % 2147483648) % m;
    for(let i = 0; i < 300; i++){
      const p = 1 + tal(20), s = {p, n:tal(2*p + 4), e:tal(21)};
      for(const o of [undefined, {stemme:'spil'}]){
        state = {p:17, n:20, e:17};
        const A = JSON.stringify(atomInfo(s, o));
        state = {p:s.p, n:s.n, e:s.e}; render();
        const B = JSON.stringify(atomInfo(state, o));
        if(A !== B) fejl++;
      }
    }
    state = {p:0, n:0, e:0};
    /* N er nu et argument: carbon med 6 neutroner er carbon-12, uanset byggerens state.n = 0
       (specifikationen skrev 8 neutroner, men det er carbon-14, som er radioaktiv) */
    return {fejl, c6:isotopDom(6, byZ(6), 6).cls, c14:isotopDom(6, byZ(6), 8).cls};
  });
  t.lig(r1b.fejl, 0, 'atomInfo(s) er uafhængig af state (300 atomer × 2 stemmer)');
  t.lig([r1b.c6, r1b.c14], ['ok', 'bad'], 'isotopDom(6, byZ(6), N) bruger N, ikke state.n');

  /* 1c — spillets stemme */
  const r1c = await ny.page.evaluate(() => {
    const fejl = [], set = new Set();
    for(let niv = 1; niv <= 4; niv++) for(let seed = 1; seed <= 500; seed++) aspLavSpil(niv, seed).forEach(d => {
      if(d.t === 'byg' || d.t === 'ion') return;
      const k = d.s.p + '-' + d.s.n + '-' + d.s.e; if(set.has(k)) return; set.add(k);
      const m = atomInfo(d.s, {stemme:'spil'}), h = m.dom.html + ' ' + m.kerne.msg + ' ' + m.linje + ' ' + m.vQ;
      if(/\b[Dd]u har\b/.test(h)) fejl.push('du har: ' + k);
      if(/men [A-ZÆØÅ][a-zæøå]+ står i/.test(h)) fejl.push('stort navn: ' + k);
      if(/[ (>]-\d/.test(h) || /^-\d/.test(m.vQ)) fejl.push('bindestreg-minus: ' + k);
      if(/\b[01] (protoner|neutroner|elektroner)\b/.test(m.linje)) fejl.push('linje: ' + m.linje);
      state = {p:d.s.p, n:d.s.n, e:d.s.e}; render();
      const s0 = atomInfo(d.s);
      if(document.getElementById('verdict').innerHTML !== s0.dom.html) fejl.push('verdict ≠ standardstemmen: ' + k);
      if(document.getElementById('isoDom').innerHTML !== s0.kerne.msg) fejl.push('isoDom ≠ standardstemmen: ' + k);
    });
    return {fejl, n:set.size};
  });
  t.sand(r1c.n > 100, 'mindst 100 forskellige atomer i 1c (fik ' + r1c.n + ')');
  t.lig(r1c.fejl.slice(0, 5), [], 'spillets stemme');

  /* 2 — byg-opgaven a9 (Na⁺) med rigtige klik, i den gamle og den nye side */
  async function byg9(page){
    return page.evaluate(async () => {
      showTab('build');
      const foer = LR._S.h.length;
      document.querySelector('#view-build button[onclick="reset()"]').click();
      atPickTask('a9');
      const knap = (k, d) => document.querySelector(`#ufp-build-byg .bin button[onclick="step('${k}',${d})"], #view-build .bin button[onclick="step('${k}',${d})"]`);
      for(let i = 0; i < 11; i++) knap('p', 1).click();
      for(let i = 0; i < 12; i++) knap('n', 1).click();
      for(let i = 0; i < 10; i++) knap('e', 1).click();
      const nye = LR._S.h.slice(foer).filter(e => e.a.startsWith('atom:'));
      return {klaret:atDone.has('a9'), nye:nye.map(e => e.a + ' f' + e.f)};
    });
  }
  const g9 = await byg9(gl.page), n9 = await byg9(ny.page);
  t.sand(n9.klaret, 'a9 er løst i den nye side');
  t.lig(n9.nye, g9.nye, 'a9 logger det samme som før (atom:a9 og f)');
  t.lig(n9.nye.length, 1, 'præcis én atom:a9-hændelse');

  // så et niveau 4-spil med natrium i "Byg den fornuftige ion" — byggeren må ikke mærke noget
  const r2 = await ny.page.evaluate(() => {
    const billede = () => JSON.stringify({state, atTask, done:[...atDone], stage:document.getElementById('stage').innerHTML,
      verdict:document.getElementById('verdict').innerHTML,
      aktiv:[...document.querySelectorAll('#pt .cell.active')].map(c => c.dataset.z)});
    const foer = billede(), h0 = LR._S.h.length;
    let seed = 1; while(!aspLavSpil(4, seed).some(d => d.t === 'ion' && d.s.p === 11)) seed++;
    visUnderfane('build', 'spil'); ASP.sidste = {};
    aspStart(4, seed);
    return {foer, h0, seed, i:ASP.liste.findIndex(d => d.t === 'ion')};
  });
  // spil de fire andre opgaver med facit og byg Na⁺ med tællerne
  for(let i = 0; i < 5; i++){
    const f = await L.aspFacit(ny.page);
    const t2 = await ny.page.evaluate(() => ASP.liste[ASP.i].t);
    if(t2 === 'ion') await ny.page.click('#aspOpg button[data-asp="trin"][data-type="e"][data-d="-1"]');   // Na → Na⁺
    else await L.aspUdfyld(ny.page, f);
    await L.aspTjekKlik(ny.page);
    await ny.page.click('#aspNaeste');
  }
  const efter = await ny.page.evaluate(([h0]) => ({billede:JSON.stringify({state, atTask, done:[...atDone], stage:document.getElementById('stage').innerHTML,
      verdict:document.getElementById('verdict').innerHTML,
      aktiv:[...document.querySelectorAll('#pt .cell.active')].map(c => c.dataset.z)}),
    atom:LR._S.h.slice(h0).filter(e => e.a.startsWith('atom:')).length, point:ASP.point}), [r2.h0]);
  t.lig(efter.point, 10, 'niveau 4-spillet med Na⁺ gik igennem med 10 point');
  t.sand(efter.billede === r2.foer, 'state, atTask, atDone, #stage, #verdict og .cell.active er uændrede');
  t.lig(efter.atom, 0, 'ingen nye atom:-hændelser fra spillet');

  L.ingenFejl(t, gl.fejl, 'gammel side'); L.ingenFejl(t, ny.fejl, 'ny side');
  await b.close();
  t.slut();
})().catch(e => { console.error(e); process.exit(1); });
