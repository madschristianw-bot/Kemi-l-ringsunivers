/* Test 10 og 11: læringshændelserne (én pr. kompetence pr. spil), Mine fejl og mærkerne. */
const L = require('./lib.cjs');
const RE = /^atomspil:[1-4]:atom-(tal|ion|opbygning)$/;

/* spil ét niveau: svar(i, d, facit) giver 'rigtig', 'igen' (forkert, så rigtigt) eller 'forkert' (to gange forkert) */
async function spil(page, niv, seed, svar, hvert){
  await L.aspSpring(page, niv, seed, 0);
  for(let i = 0; i < 5; i++){
    const f = await L.aspFacit(page);
    const d = await page.evaluate(() => ({t:ASP.liste[ASP.i].t, fl:ASP_TYPER[ASP.liste[ASP.i].t].felter(ASP.liste[ASP.i])}));
    const maade = svar(i, d, f);
    /* to forskellige forkerte svar i det første felt — inden for tællernes grænser, så de ikke rettes til facit */
    const [k, v1, v2] = await page.evaluate(() => {
      const d = ASP.liste[ASP.i], f = aspFacit(d), k = ASP_TYPER[d.t].felter(d)[0];
      const kand = k === 'Z' ? Array.from({length:20}, (_, i) => i + 1) : typeof f[k] === 'number' ? [f[k] + 1, f[k] - 1, f[k] + 2, f[k] - 2]
                 : ['ok','warn','bad'];
      const lov = v => v !== f[k] && (typeof v !== 'number' || (v >= 0 && v <= ({n:40, A:99}[k] || 20)) || k === 'Q') && !(d.t === 'ion' && v === d.s.p);
      const l = kand.filter(lov);
      return [k, l[0], l[1]];
    });
    if(maade === 'rigtig'){ await L.aspUdfyld(page, f); await L.aspTjekKlik(page); }
    else {
      await L.aspUdfyld(page, Object.assign({}, f, {[k]:v1})); await L.aspTjekKlik(page); await page.click('#aspIgen');
      if(maade === 'igen'){ await L.aspUdfyld(page, f); await L.aspTjekKlik(page); }
      else { await L.aspUdfyld(page, Object.assign({}, f, {[k]:v2})); await L.aspTjekKlik(page); await page.click('#aspVis'); }
    }
    if(hvert) await hvert(i, d);
    await page.click('#aspNaeste');
  }
}
const nyeAtomspil = (page, fra) => page.evaluate(fra => LR._S.h.slice(fra).filter(e => e.a.startsWith('atomspil:')), fra);

(async () => {
  const t = L.test('05 læringshændelser, Mine fejl og mærker');
  const b = await L.browser();
  const {page, fejl} = await L.aaben(b, {dialog:true, init:() => {
    if(!localStorage.getItem('kemikoel.elev.v1'))
      localStorage.setItem('kemikoel.elev.v1', JSON.stringify({elev:{navn:'Test', hold:'T', oprettet:1}, h:[]}));
  }});

  /* 10 — et helt spil giver to hændelser, logget ved kompetencens sidste opgave */
  const h0 = await page.evaluate(() => LR._S.h.length);
  const m0 = await page.evaluate(() => ({tal:LR.mastery('atom-tal').n, ion:LR.mastery('atom-ion').n}));
  const tidspunkt = [];
  await spil(page, 2, 42, i => i === 1 ? 'igen' : 'rigtig', async (i) => {
    tidspunkt.push(await page.evaluate(fra => LR._S.h.slice(fra).filter(e => e.a.startsWith('atomspil:')).map(e => e.a).join(','), h0));
  });
  const ev = await nyeAtomspil(page, h0);
  t.lig(ev.length, 2, 'to nye hændelser efter et helt spil');
  t.sand(ev.every(e => RE.test(e.a) && (e.f === 1 || e.f === 2)), 'id og f: ' + JSON.stringify(ev.map(e => [e.a, e.f, e.ok])));
  const liste = await page.evaluate(() => ASP.liste.map(d => ASP_TYPER[d.t].komp));
  const res = await page.evaluate(() => ASP.slut.res.map(r => r.point));
  ['atom-tal', 'atom-ion'].forEach(k => {
    const e = ev.find(x => x.k === k), p = res.filter((_, i) => liste[i] === k);
    t.sand(e && e.ok === (p.every(x => x >= 1) ? 1 : 0) && e.f === (p.every(x => x === 2) ? 1 : 2), `ok og f for ${k} passer med pointene ${p}`);
    const sidst = liste.lastIndexOf(k);
    t.sand(!tidspunkt.slice(0, sidst).some(x => x.includes(k)) && tidspunkt[sidst].includes('atomspil:2:' + k), `${k} logges ved sin sidste opgave (nr. ${sidst + 1}), før Næste`);
  });
  const m1 = await page.evaluate(() => ({tal:LR.mastery('atom-tal').n, ion:LR.mastery('atom-ion').n}));
  t.sand(m1.tal - m0.tal <= 1 && m1.ion - m0.ion <= 1, 'beherskelsen får højst én hændelse mere pr. kompetence');

  // at afbryde: før et forsøg logges intet; efter et forkert første forsøg på opgave 2 logges kompetencen med ok 0
  let h1 = await page.evaluate(() => LR._S.h.length);
  await L.aspSpring(page, 2, 5, 0);
  await page.click('#aspOpg button[data-asp="tilvalg"]');
  t.lig((await nyeAtomspil(page, h1)).length, 0, '"Til niveauerne" før et forsøg logger intet');
  h1 = await page.evaluate(() => LR._S.h.length);
  await L.aspSpring(page, 2, 5, 0);
  const f1 = await L.aspFacit(page);
  await L.aspUdfyld(page, f1); await L.aspTjekKlik(page); await page.click('#aspNaeste');
  const d2 = await page.evaluate(() => ({k:ASP_TYPER[ASP.liste[1].t].komp, k1:ASP_TYPER[ASP.liste[0].t].komp, fl:ASP_TYPER[ASP.liste[1].t].felter(ASP.liste[1])}));
  const f2 = await L.aspFacit(page);
  await L.aspUdfyld(page, Object.assign({}, f2, {[d2.fl[0]]:f2[d2.fl[0]] + 1})); await L.aspTjekKlik(page);
  await page.click('#aspOpg button[data-asp="tilvalg"]');
  const af = await nyeAtomspil(page, h1);
  const e2 = af.find(e => e.k === d2.k);
  t.sand(e2 && e2.ok === 0 && e2.a === 'atomspil:2:' + d2.k, 'afbrudt efter et forkert forsøg: ' + d2.k + ' logges med ok 0 ' + JSON.stringify(af.map(e => [e.a, e.ok])));
  t.lig(af.length, d2.k === d2.k1 ? 1 : 2, 'og kun de kompetencer, der er forsøgt');

  /* 11 — Mine fejl, "Øv mine fejl" og mærkerne (Fejlfinder, Atombygger, Vedholdende) */
  const tael = () => page.evaluate(() => { showTab('elev');
    const n = navn => { const e = [...document.querySelectorAll('.lr-mrk')].find(x => x.querySelector('.lr-mrk-navn').textContent === navn);
      const tal = e && e.querySelector('.lr-mrk-n'); return tal ? parseInt(tal.textContent) : (e && e.querySelector('.lr-mrk-ok') ? 99 : null); };
    return {fejlfinder:n('Fejlfinder'), bygger:n('Atombygger'), sej:n('Vedholdende'),
      fejl:[...document.querySelectorAll('.lr-fejl')].map(x => x.querySelector('.lr-fejl-emne').textContent + '|' + x.querySelector('.lr-fejl-q').textContent)}; });
  // ryd hændelserne fra test 10, så kun det følgende tæller
  await page.evaluate(() => { LR._S.h.length = 0; });
  const m0b = await tael();
  // et L2-spil, hvor ladnings-opgaverne går galt (atom-ion), og massetallene sidder
  await spil(page, 2, 42, (i, d) => d.t === 'ladning' ? 'forkert' : 'rigtig');
  const m1b = await tael();
  const tekst = 'Atomspillet, niveau 2 »Massetal og ladning« — spil niveauet igen under Byg et atom → Atomspillet';
  t.sand(m1b.fejl.includes('Ion-dannelse|' + tekst), 'Mine fejl viser atomspil:2:atom-ion med teksten ' + JSON.stringify(m1b.fejl));
  t.lig(m1b.fejl.length, 1, 'kun den kompetence, der gik galt');
  let besked = null;
  page.once('dialog', d => { besked = d.message(); d.dismiss(); });
  await page.evaluate(() => LR.oevFejl());
  t.lig(besked, 'Dine fejl er ikke quizspørgsmål — de ligger i byggefanerne. Gå derind og prøv opgaven igen.', '"Øv mine fejl" med kun spillets fejl');
  t.lig(await page.evaluate(() => document.getElementById('view-elev').style.display), 'block', '"Øv mine fejl" starter ingen quiz');
  // et nyt, vellykket L2-spil fjerner fejlen og giver Fejlfinder ét point
  await spil(page, 2, 77, () => 'rigtig');
  const m2b = await tael();
  t.lig(m2b.fejl, [], 'fejlen er væk efter et vellykket spil');
  t.lig(m2b.fejlfinder - m1b.fejlfinder, 1, 'Fejlfinder går 1 op');
  // ingen opsamling: mange spil rører hverken Atombygger eller Vedholdende
  for(let n = 0; n < 3; n++) await spil(page, (n % 4) + 1, 100 + n, i => i % 2 ? 'igen' : 'rigtig');
  const m3b = await tael();
  t.lig([m3b.bygger, m3b.sej], [m0b.bygger, m0b.sej], 'Atombygger og Vedholdende er uændrede');
  t.sand(await page.evaluate(() => LR._S.h.every(e => !/^(mb|salt|atom):/.test(e.a))), 'spillet logger aldrig atom:/mb:/salt:-hændelser');

  L.ingenFejl(t, fejl);
  await b.close();
  t.slut();
})().catch(e => { console.error(e); process.exit(1); });
