/* Test 14: telefonbredde (390 × 844) — ingen vandret rulning, svarfelterne flyder ikke over, tabellen
   står i sit kort, knaplinjen er altid fremme og dækker ikke feedbacken, og trykflader er mindst 32 px.
   Ved 1280 × 900 er både feedbacken og knappen med fokus fremme efter Tjek og Vis svaret. Ved 360, 375
   og 901–980 px står tællerne og svarfelterne i deres kort.
   Tager samtidig skærmbilleder af alle skærme i begge bredder (ASP_SKAERM) til gennemsyn. */
const L = require('./lib.cjs');

/* én opgave af hver slags (og hver visning) */
async function find(page){
  return page.evaluate(() => {
    const set = {}, ud = [];
    for(let niv = 1; niv <= 4; niv++) for(let seed = 1; seed < 600; seed++) aspLavSpil(niv, seed).forEach((d, i) => {
      const k = d.t + '-' + d.vis + (d.felter && d.felter.includes('sym') ? '-sym' : '') + (d.t === 'iondom' || d.t === 'kernedom' ? '-' + d.kat : '');
      if(!set[k]){ set[k] = 1; ud.push({k, niv, seed, i}); }
    });
    return ud;
  });
}
/* hver byg-, ion- og udfyld-opgave med sin egen kombination af svarfelter */
async function findFelter(page){
  return page.evaluate(() => {
    const set = {}, ud = [];
    for(let niv = 1; niv <= 4; niv++) for(let seed = 1; seed < 600; seed++) aspLavSpil(niv, seed).forEach((d, i) => {
      if(!['byg', 'ion', 'udfyld'].includes(d.t)) return;
      const k = d.t + (d.felter ? '-' + d.felter.join('') : '');
      if(!set[k]){ set[k] = 1; ud.push({k, niv, seed, i}); }
    });
    return ud;
  });
}
/* to forskellige forkerte svar (som i 05) */
const forkerte = page => page.evaluate(() => {
  const d = ASP.liste[ASP.i], f = aspFacit(d), k = ASP_TYPER[d.t].felter(d)[0];
  const kand = k === 'Z' ? Array.from({length:20}, (_, i) => i + 1) : typeof f[k] === 'number' ? [f[k] + 1, f[k] - 1, f[k] + 2, f[k] - 2] : ['ok','warn','bad'];
  const l = kand.filter(v => v !== f[k] && (typeof v !== 'number' || (v >= 0 && v <= ({n:40, A:99}[k] || 20)) || k === 'Q') && !(d.t === 'ion' && v === d.s.p));
  return [k, l[0], l[1], f];
});

(async () => {
  const t = L.test('06 mobil 390 px og skærmbilleder');
  const b = await L.browser();
  for(const W of [390, 1280]){
    const mobil = W === 390;
    const {page, fejl} = await L.aaben(b, {ctx:{viewport:{width:W, height:mobil ? 844 : 900}}});
    const maal = async (hvor) => {
      const r = await page.evaluate(() => {
        const vis = e => e && e.offsetParent !== null;
        const svar = [...document.querySelectorAll('#atomSpil .stat.asp-svar')].filter(vis).filter(e => e.scrollWidth > e.clientWidth).length;
        const kort = document.querySelector('#aspOpg .asp-pt') && document.querySelector('#aspOpg .asp-pt').closest('.card').getBoundingClientRect();
        const celler = kort ? [...document.querySelectorAll('#aspOpg .asp-pt .cell')].filter(c => { const r = c.getBoundingClientRect(); return r.left < kort.left || r.right > kort.right; }).length : 0;
        const smaa = [...document.querySelectorAll('#atomSpil button, #atomSpil label.asp-chip')].filter(vis)
          .filter(e => getComputedStyle(e).visibility !== 'hidden')
          .map(e => { const r = e.getBoundingClientRect(); return [e.id || e.textContent.trim().slice(0, 14), Math.round(r.width), Math.round(r.height)]; })
          .filter(([, w, h]) => w < 32 || h < 32);
        return {bred:document.documentElement.scrollWidth, svar, celler, smaa};
      });
      if(mobil){
        t.lig(r.bred, 390, 'ingen vandret rulning: ' + hvor);
        t.lig(r.svar, 0, 'svarfelterne flyder ikke over: ' + hvor);
        t.lig(r.celler, 0, 'tabellens celler står i kortet: ' + hvor);
        t.lig(r.smaa, [], 'trykflader på mindst 32 px: ' + hvor);
      } else t.lig(r.bred, 1280, 'ingen vandret rulning ved 1280: ' + hvor);
    };
    /* feedbacken ligger over knaplinjen, når den er rullet frem — på bred skærm er knappen med fokus også fremme */
    const fbFri = async (hvor) => {
      // vent, til den bløde rulning er færdig: scrollY står stille i to målinger i træk
      for(let i = 0, y = -1; i < 30; i++){ await page.waitForTimeout(100); const ny = await page.evaluate(() => scrollY); if(ny === y) break; y = ny; }
      const r = await page.evaluate(() => { const fb = document.getElementById('aspFb').getBoundingClientRect(), a = document.activeElement;
        return {top:fb.top, fb:fb.bottom, bar:document.getElementById('aspHandling').getBoundingClientRect().top, h:innerHeight,
                fokus:a.id || a.tagName, fokusBund:a.getBoundingClientRect().bottom}; });
      if(mobil) t.sand(r.fb <= r.bar + 0.5, `feedbacken dækkes ikke af knaplinjen (${hvor}): ${Math.round(r.fb)} ≤ ${Math.round(r.bar)}`);
      else {
        t.sand(r.top >= 0 && r.fb <= r.h + 0.5, `feedbacken er fremme ved 1280 (${hvor}): ${Math.round(r.top)}–${Math.round(r.fb)} af ${r.h}`);
        t.sand(r.fokusBund <= r.h + 0.5, `knappen med fokus (${r.fokus}) er fremme ved 1280 (${hvor}): ${Math.round(r.fokusBund)} ≤ ${r.h}`);
      }
    };
    const billede = async navn => {
      await page.locator('#atomSpil').screenshot({path:L.skaermbillede(`${navn}_${W}`)});
    };

    await page.evaluate(() => { showTab('build'); visUnderfane('build', 'spil'); });
    await maal('niveauskærmen');
    await billede('valg');

    for(const o of await find(page)){
      await L.aspSpring(page, o.niv, o.seed, o.i);
      await maal(o.k + ' svar');
      await billede('opg_' + o.k);
      if(mobil && o.k.startsWith('grundstof')){
        // knaplinjen er fremme, når der er rullet ned til tabellen
        await page.evaluate(() => document.querySelector('#aspOpg .asp-pt').scrollIntoView({block:'center', behavior:'instant'}));
        const r = await page.evaluate(() => { const b = document.getElementById('aspHandling').getBoundingClientRect(); return [b.top >= 0, b.bottom <= innerHeight + .5]; });
        t.lig(r, [true, true], 'knaplinjen er inde i billedet ved tabellen');
      }
      const [k, v1, v2, f] = await forkerte(page);
      await L.aspUdfyld(page, Object.assign({}, f, {[k]:v1}));
      await L.aspTjekKlik(page);
      await fbFri(o.k + ' igen'); await maal(o.k + ' igen');
      if(o.k === 'udfyld-tal-sym' || o.k === 'byg-byg' || o.k === 'iondom-billede-bad') await billede('opg_' + o.k + '_igen');
      await page.click('#aspIgen');
      await maal(o.k + ' efter Prøv igen');
      await L.aspUdfyld(page, Object.assign({}, f, {[k]:v2})); await L.aspTjekKlik(page);
      await fbFri(o.k + ' opbrugt'); await maal(o.k + ' opbrugt');
      await page.click('#aspVis');
      await fbFri(o.k + ' vist'); await maal(o.k + ' vist');
      if(o.k === 'udfyld-tal-sym' || o.k === 'kernedom-tal-warn' || o.k === 'ion-byg') await billede('opg_' + o.k + '_vist');
      await L.aspSpring(page, o.niv, o.seed, o.i);
      await L.aspUdfyld(page, f); await L.aspTjekKlik(page);
      await fbFri(o.k + ' rigtig'); await maal(o.k + ' rigtig');
      if(['grundstof-billede', 'masse-billede', 'kernedom-billede-bad', 'ion-byg', 'skal-tal'].includes(o.k)) await billede('opg_' + o.k + '_rigtig');
    }
    // resultatet: et fuldt hus og et spil med point tabt
    for(const [navn, fejlI] of [['slut_fuldt', -1], ['slut_tabt', 1]]){
      await L.aspSpring(page, 2, 42, 0);
      for(let i = 0; i < 5; i++){
        const [k, v1, v2, f] = await forkerte(page);
        if(i === fejlI || (fejlI > 0 && i === 3)){ await L.aspUdfyld(page, Object.assign({}, f, {[k]:v1})); await L.aspTjekKlik(page); await page.click('#aspIgen');
          await L.aspUdfyld(page, Object.assign({}, f, {[k]:v2})); await L.aspTjekKlik(page); await page.click('#aspVis'); }
        else { await L.aspUdfyld(page, f); await L.aspTjekKlik(page); }
        await page.click('#aspNaeste');
      }
      await maal('resultatet ' + navn);
      await page.waitForTimeout(navn === 'slut_fuldt' ? 900 : 0);
      await billede(navn);
    }
    L.ingenFejl(t, fejl, W + ' px');
    await page.context().close();
  }
  /* smalle telefoner og smalle vinduer med to kolonner: tællerne står på én linje med mærkaten (kun under 560 px,
     hvor de lægges ned), svarfelterne står inde i kortet, intet kort flyder over, og et tocifret tal kan stå i tælleren */
  for(const [W, H] of [[360, 740], [375, 667], [901, 1000], [920, 1000], [980, 1000]]){
    const {page, fejl} = await L.aaben(b, {ctx:{viewport:{width:W, height:H}}});
    const smal = async (hvor) => {
      const r = await page.evaluate(() => {
        const vis = e => e && e.offsetParent !== null, ud = [], liggende = innerWidth <= 560;
        document.querySelectorAll('#atomSpil .bin').forEach(b => {
          const c = b.querySelector('.counter'), l = b.querySelector('.lbl'), lk = b.querySelector('.asp-laast');
          if(!vis(b) || !c || !liggende) return;
          const rc = c.getBoundingClientRect(), rl = l.getBoundingClientRect(), navn = l.querySelector('b').textContent;
          if(!(rc.top < rl.bottom && rc.bottom > rl.top)) ud.push('tælleren er rykket under mærkaten: ' + navn);
          if(lk && lk.getBoundingClientRect().top >= rc.bottom - 1) ud.push('»låst« står under tælleren: ' + navn);
        });
        document.querySelectorAll('#atomSpil .read > .stat').forEach(s => {
          if(!vis(s)) return;
          const k = s.closest('.card'), rk = k.getBoundingClientRect(), cs = getComputedStyle(k), rs = s.getBoundingClientRect();
          const v = rk.left + parseFloat(cs.paddingLeft), h = rk.right - parseFloat(cs.paddingRight);
          if(rs.left < v - 0.5 || rs.right > h + 0.5) ud.push(`svarfeltet ${s.querySelector('.k').textContent.trim()} står uden for kortet: ${Math.round(rs.left)}–${Math.round(rs.right)} i ${Math.round(v)}–${Math.round(h)}`);
        });
        document.querySelectorAll('#atomSpil .card').forEach(k => {
          if(vis(k) && k.scrollWidth > k.clientWidth) ud.push(`kortet ${k.querySelector('h2') ? k.querySelector('h2').textContent : ''} flyder over: ${k.scrollWidth} > ${k.clientWidth}`);
        });
        document.querySelectorAll('#atomSpil .counter input.num').forEach(i => {
          if(!vis(i)) return;
          const gl = i.value; i.value = '40';
          if(i.scrollWidth > i.clientWidth) ud.push(`40 kan ikke stå i ${i.id}: ${i.scrollWidth} > ${i.clientWidth}`);
          i.value = gl;
        });
        if(document.documentElement.scrollWidth > innerWidth) ud.push('vandret rulning: ' + document.documentElement.scrollWidth);
        return ud;
      });
      t.lig(r, [], `${W} px, ${hvor}`);
    };
    for(const o of await findFelter(page)){
      await L.aspSpring(page, o.niv, o.seed, o.i);
      await smal(o.k + ' svar');
      const [k, v1, , f] = await forkerte(page);
      await L.aspUdfyld(page, Object.assign({}, f, {[k]:v1})); await L.aspTjekKlik(page);
      await smal(o.k + ' igen');                         // med ✓ og ✗ på mærkaterne
    }
    L.ingenFejl(t, fejl, W + ' px');
    await page.context().close();
  }
  console.log('   skærmbilleder i ' + L.SKAERM);
  await b.close();
  t.slut();
})().catch(e => { console.error(e); process.exit(1); });
