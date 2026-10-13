/* Test 8, 9, 12, 13, 15, 16 og 19: hele spil gennem brugerfladen, 2/1/0 point og tilstandene,
   blokeret lager, tidtagning, kun tastatur, reduceret bevægelse og aspInit, der ikke tegner om. */
const L = require('./lib.cjs');
const NOEGLE = 'kemikoel.atomspil.v1';

async function spilFacit(page, niv, seed){
  await L.aspSpring(page, niv, seed, 0);
  for(let i = 0; i < 5; i++){
    await L.aspUdfyld(page, await L.aspFacit(page));
    await L.aspTjekKlik(page);
    await page.click('#aspNaeste');
  }
}
const aktiv = page => page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.className));

(async () => {
  const t = L.test('04 spillet gennem brugerfladen');
  const b = await L.browser();

  /* 8 — fuldt hus på alle fire niveauer */
  const s8 = await L.aaben(b);
  for(let niv = 1; niv <= 4; niv++){
    await spilFacit(s8.page, niv, 42);
    const r = await s8.page.evaluate(n => ({point:ASP.point, titel:document.getElementById('aspTitel').textContent,
      fuld:/Fuldt hus!/.test(document.getElementById('aspOpmuntring').textContent),
      stj:[...document.querySelectorAll('#aspSlut .asp-stj')].map(s => s.style.getPropertyValue('--f')),
      regn:!!document.querySelector('#aspSlut .asp-regn'), fokus:document.activeElement.id,
      gemt:JSON.parse(localStorage.getItem('kemikoel.atomspil.v1')).niv[n].bedst, live:document.getElementById('aspLive').textContent}), niv);
    t.lig(r, {point:10, titel:'Fremragende!', fuld:true, stj:['100%','100%','100%','100%','100%'], regn:true, fokus:'aspTitel', gemt:10,
              live:'Niveauet er slut: 10 af 10 point.'}, 'niveau ' + niv + ' med fuldt hus');
  }
  await s8.page.reload();
  const r8 = await s8.page.evaluate(() => { showTab('build'); visUnderfane('build', 'spil');
    return {bedst:[...document.querySelectorAll('#aspValg .asp-niv-bedst')].map(x => x.textContent), mrk:document.getElementById('aspMrk').textContent,
      klar:document.querySelector('#aspValg .card').classList.contains('klar')}; });
  t.lig(r8, {bedst:Array(4).fill('Bedste: 10 af 10 point'), mrk:'40 af 40 point ✓', klar:true}, 'efter genindlæsning: bedste scorer og mærkatet');
  L.ingenFejl(t, s8.fejl, 'test 8');
  await s8.ctx.close();

  /* 9 — 2 / 1 / 0 point og tilstandene */
  const {page, fejl} = await L.aaben(b);
  const seed9 = await page.evaluate(() => { for(let s = 1; ; s++){ const g = aspLavSpil(3, s); if(g[0].felter.includes('A') && g[0].felter.length === 2) return s; } });
  await L.aspSpring(page, 3, seed9, 0);
  const f9 = await L.aspFacit(page);
  const fl9 = await page.evaluate(() => ASP_TYPER.udfyld.felter(ASP.liste[0]));
  const anden = fl9.find(k => k !== 'A');
  // tomt felt: Tjek er spærret, og Enter bruger ikke et forsøg
  t.sand(await page.evaluate(() => document.getElementById('aspTjek').disabled), 'Tjek er spærret, mens felterne er tomme');
  await page.focus('#aspF-A'); await page.keyboard.press('Enter');
  await page.fill('#aspF-A', 'x'); await page.keyboard.press('Enter');
  const tom = await page.evaluate(() => ({f:ASP.forsoeg, dis:document.getElementById('aspTjek').disabled, hint:document.getElementById('aspKlarHint').textContent,
    inv:document.getElementById('aspF-A').getAttribute('aria-invalid')}));
  t.lig(tom, {f:0, dis:true, hint:'Skriv et helt tal i feltet Massetal, fx 12.', inv:'true'}, 'ugyldigt tal: Tjek spærret, hint og aria-invalid, Enter gør intet');
  // første forsøg: massetallet forkert, det andet felt rigtigt
  await L.aspUdfyld(page, Object.assign({}, f9, {A:f9.A + 1}));
  await page.keyboard.press('Enter');
  const igen = await page.evaluate(([k]) => ({fase:ASP.fase, point:document.getElementById('aspPoint').textContent, fokus:document.activeElement.id,
    A:document.querySelector('#aspF-A').closest('.stat').className, Amrk:document.querySelector('#aspF-A').closest('.stat').querySelector('.asp-mrk').textContent,
    Ainv:document.getElementById('aspF-A').getAttribute('aria-invalid'), fb:document.getElementById('aspFb').className,
    live:document.getElementById('aspLive').textContent, nav:[location.search, performance.getEntriesByType('navigation').length]}), [anden]);
  t.lig(igen.fase, 'igen', 'første forkerte forsøg → igen');
  t.lig(igen.point, 'Point: 0', 'pointene er uændrede');
  t.lig(igen.fokus, 'aspIgen', 'Prøv igen har fokus');
  t.sand(/asp-forkert/.test(igen.A) && igen.Amrk === '✗' && igen.Ainv === 'true', 'det forkerte felt er rødt med ✗ og aria-invalid');
  t.lig(igen.fb, 'quiz-feedback show trin', 'feedbacken er gul');
  t.lig(igen.live, 'Ikke rigtigt. Du har ét forsøg mere.', 'live-teksten');
  t.lig(igen.nav, ['', 1], 'ingen navigation efter Tjek');
  await page.click('#aspIgen');
  const efterIgen = await page.evaluate(([k]) => {
    const fe = k === 'Z' ? null : document.querySelector('#aspF-' + k).closest('.stat');
    return {fokus:document.activeElement.id, laast:fe ? [fe.className, fe.querySelector('.asp-mrk').textContent, document.getElementById('aspF-' + k).readOnly]
                                                     : [document.querySelector('#aspOpg .symbolbox').className, document.querySelector('#aspOpg .symbolbox .asp-mrk').textContent, document.querySelector('#aspOpg .asp-cell').disabled],
      Aaaben:!document.getElementById('aspF-A').readOnly, fb:document.getElementById('aspFb').className};
  }, [anden]);
  t.lig(efterIgen.fokus, 'aspF-A', 'fokus på det forkerte felt efter Prøv igen');
  t.sand(/asp-laast/.test(efterIgen.laast[0]) || /asp-rigtig/.test(efterIgen.laast[0]), 'det rigtige felt er låst');
  t.lig([efterIgen.laast[1], efterIgen.laast[2]], ['✓', true], 'det rigtige felt har ✓ og kan ikke ændres');
  t.sand(efterIgen.Aaaben && /trin/.test(efterIgen.fb), 'det forkerte felt er åbent, og tipset står der stadig');
  await page.fill('#aspF-A', String(f9.A));
  await L.aspTjekKlik(page);
  const en = await page.evaluate(() => ({point:ASP.point, kort:document.getElementById('aspKort').textContent, fokus:document.activeElement.id,
    live:document.getElementById('aspLive').textContent, fb:document.getElementById('aspFb').className}));
  t.lig(en, {point:1, kort:'+1 point', fokus:'aspNaeste', live:'Rigtigt! 1 point.', fb:'quiz-feedback show good'}, 'rigtigt i andet forsøg giver 1 point');

  // to gange forkert på en dom-opgave → Vis svaret
  const seedK = await page.evaluate(() => { for(let s = 1; ; s++){ const i = aspLavSpil(4, s).findIndex(d => d.t === 'kernedom'); if(i >= 0) return [s, i]; } });
  await L.aspSpring(page, 4, seedK[0], seedK[1]);
  const fk = await L.aspFacit(page);
  const forkerte = ['ok','warn','bad'].filter(v => v !== fk.kerne);
  await L.aspUdfyld(page, {kerne:forkerte[0]}); await L.aspTjekKlik(page);
  await page.click('#aspIgen');
  t.sand(await page.evaluate(v => document.querySelector(`#aspOpg input[value="${v}"]`).disabled, forkerte[0]), 'den forkerte brik kan ikke vælges igen');
  t.sand(await page.evaluate(() => document.activeElement.matches('#aspOpg .asp-chip input[name="aspValg"]:not(:disabled)')), 'fokus på den første brik, der kan vælges');
  await L.aspUdfyld(page, {kerne:forkerte[1]}); await L.aspTjekKlik(page);
  const opbrugt = await page.evaluate(() => ({fase:ASP.fase, fokus:document.activeElement.id, kort:document.getElementById('aspKort').textContent,
    fb:document.getElementById('aspFb').textContent, live:document.getElementById('aspLive').textContent}));
  t.lig(opbrugt, {fase:'opbrugt', fokus:'aspVis', kort:'0 point', fb:'Desværre — heller ikke denne gang. Tryk på Vis svaret.', live:'Ikke rigtigt. Tryk på Vis svaret.'}, 'andet forkerte forsøg');
  await page.click('#aspVis');
  const vist = await page.evaluate(() => { const d = ASP.liste[ASP.i], m = atomInfo(d.s, {stemme:'spil'});
    return {fokus:document.activeElement.id, v:document.querySelector('#aspBoksKort .verdict:not(.kerne)').innerHTML === m.dom.html,
      k:document.querySelector('#aspBoksKort .verdict.kerne').innerHTML === m.kerne.msg, dit:document.querySelector('#aspBoksKort .asp-dit').textContent,
      A:document.querySelectorAll('#aspBoksKort .stat')[1].querySelector('.v').textContent, Afacit:String(d.s.p + d.s.n),
      fb:document.getElementById('aspFb').className, live:document.getElementById('aspLive').textContent}; });
  t.lig(vist.fokus, 'aspNaeste', 'Næste har fokus efter Vis svaret');
  t.sand(vist.v && vist.k, 'boksens to domme er atomInfo i spillets stemme');
  t.sand(/^dit svar: /.test(vist.dit), '"dit svar" står ved det forkerte felt');
  t.lig(vist.A, vist.Afacit, 'massetallet er fyldt ud');
  t.lig([vist.fb, vist.live], ['quiz-feedback show lektion', 'Svaret er vist.'], 'feedback og live-tekst ved Vis svaret');
  // byg: Vis svaret sætter tællerne til facit
  const seedB = await page.evaluate(() => { for(let s = 1; ; s++){ const i = aspLavSpil(3, s).findIndex(d => d.t === 'byg'); if(i >= 0) return [s, i]; } });
  await L.aspSpring(page, 3, seedB[0], seedB[1]);
  const fb = await L.aspFacit(page);
  for(const k of [1, 2]){ await L.aspUdfyld(page, {p:fb.p, n:fb.n + k, e:fb.e}); await L.aspTjekKlik(page); if(k === 1) await page.click('#aspIgen'); }
  await page.click('#aspVis');
  t.lig(await page.evaluate(() => ['p','n','e'].map(k => +document.getElementById('aspN-' + k).value)), [fb.p, fb.n, fb.e], 'byg: tællerne viser facit efter Vis svaret');
  t.lig(await page.evaluate(() => [location.search, performance.getEntriesByType('navigation').length]), ['', 1], 'stadig ingen navigation');
  L.ingenFejl(t, fejl, 'test 9');

  /* 15 — kun tastatur */
  await page.evaluate(() => { showTab('build'); visUnderfane('build', 'spil'); aspTilValg(); ASP.sidste = {}; });
  await page.focus('#ufk-build-spil');
  for(let i = 0; i < 6 && !(await page.evaluate(() => document.activeElement.matches('.asp-niv[data-niv="1"]'))); i++) await page.keyboard.press('Tab');
  t.sand(await page.evaluate(() => document.activeElement.matches('.asp-niv[data-niv="1"]')), 'Tab når frem til Niveau 1');
  await page.keyboard.press('Enter');
  t.lig(await aktiv(page), 'aspQ', 'Enter på Niveau 1 giver fokus til spørgsmålet');
  // piletasterne i tabellen: spring en grundstof-opgave frem
  const seedG = await page.evaluate(() => { for(let s = 1; ; s++){ const i = aspLavSpil(1, s).findIndex(d => d.t === 'grundstof'); if(i >= 0) return [s, i]; } });
  await L.aspSpring(page, 1, seedG[0], seedG[1]);
  await page.focus('#aspOpg .asp-cell[tabindex="0"]');
  const sti = [];
  for(const k of ['ArrowRight','ArrowDown','ArrowRight','ArrowDown','ArrowLeft','ArrowUp','ArrowUp']){
    await page.keyboard.press(k); sti.push(await page.evaluate(() => +document.activeElement.dataset.sz));
  }
  t.lig(sti, [2, 10, 10, 18, 17, 9, 9], 'piletasterne flytter i 8 × 4 og springer tomme felter over');
  t.lig(await page.evaluate(() => document.querySelectorAll('#aspOpg .asp-cell[tabindex="0"]').length), 1, 'ét tabstop i tabellen');
  const fG = await L.aspFacit(page);
  await page.evaluate(z => document.querySelector(`#aspOpg .asp-cell[data-sz="${z}"]`).focus(), fG.Z === 1 ? 2 : 1);
  await page.keyboard.press('Enter');          // vælger det forkerte grundstof
  await page.keyboard.press('Tab');
  const fv = fG.valg;
  await page.focus(`#aspOpg input[name="aspValg"][value="${fv === 'ion' ? 'neutral' : 'ion'}"]`);
  await page.keyboard.press('Space');
  await page.keyboard.press(fv === 'ion' ? 'ArrowRight' : 'ArrowLeft');   // piletasten flytter mellem brikkerne
  t.lig(await page.evaluate(() => ASP.svar.valg), fv, 'piletasten flytter valget mellem brikkerne');
  await page.keyboard.press('Enter');          // Enter i formularen = Tjek
  t.lig(await page.evaluate(() => [ASP.fase, document.activeElement.id, document.getElementById('aspLive').textContent]),
        ['igen', 'aspIgen', 'Ikke rigtigt. Du har ét forsøg mere.'], 'Enter i en brik tjekker, og fokus går til Prøv igen');
  await page.keyboard.press('Enter');
  const forkertZ = fG.Z === 1 ? 2 : 1;
  const tab2 = await page.evaluate(z => ({fokus:+document.activeElement.dataset.sz, spaerret:document.querySelector(`#aspOpg .asp-cell[data-sz="${z}"]`).disabled}), forkertZ);
  t.sand(tab2.spaerret && tab2.fokus !== forkertZ && tab2.fokus > 0, 'efter Prøv igen er det forkerte grundstof spærret, og fokus står i tabellen');
  // pilene springer over det spærrede felt
  await page.evaluate(() => document.querySelector('#aspOpg .asp-cell[data-sz="3"]').focus());
  if(forkertZ === 1){ await page.keyboard.press('ArrowUp'); t.lig(await page.evaluate(() => +document.activeElement.dataset.sz), 3, 'pil op over et spærret H bliver stående'); }
  else { await page.evaluate(() => document.querySelector('#aspOpg .asp-cell[data-sz="1"]').focus()); await page.keyboard.press('ArrowRight');
         t.lig(await page.evaluate(() => +document.activeElement.dataset.sz), 1, 'pil til højre over et spærret He bliver stående'); }
  await page.evaluate(z => document.querySelector(`#aspOpg .asp-cell[data-sz="${z}"]`).focus(), fG.Z);
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  t.lig(await page.evaluate(() => [ASP.fase, document.activeElement.id, document.getElementById('aspLive').textContent]),
        ['rigtig', 'aspNaeste', 'Rigtigt! 1 point.'], 'rigtigt i andet forsøg med tastaturet');
  await page.keyboard.press('Enter');
  t.lig(await aktiv(page), 'aspQ', 'Næste med Enter giver fokus til det næste spørgsmål');
  t.sand(/^Opgave \d af 5: /.test(await page.evaluate(() => document.getElementById('aspLive').textContent)), 'live-teksten nævner opgaven');
  await page.click('#aspOpg button[data-asp="tilvalg"]');
  t.sand(await page.evaluate(() => document.activeElement.matches('.asp-niv[data-niv="1"]')), '"Til niveauerne" giver fokus til det niveau, der blev spillet');

  /* 19 — aspInit tegner ikke resultatet eller opgaven om */
  await spilFacit(page, 2, 7);
  const foer19 = await page.evaluate(() => ({rek:document.getElementById('aspRekord').textContent, regn:document.querySelectorAll('.asp-regn').length}));
  await page.click('#ufk-build-byg'); await page.click('#ufk-build-spil');
  const efter19 = await page.evaluate(() => ({rek:document.getElementById('aspRekord').textContent, regn:document.querySelectorAll('.asp-regn').length,
    fokus:document.activeElement.id, skaerm:ASP.skaerm}));
  t.lig(efter19, {rek:foer19.rek, regn:foer19.regn, fokus:'ufk-build-spil', skaerm:'slut'}, 'resultatet er uændret efter et afsnitsskift, og fokus bliver på afsnitsknappen');
  await L.aspSpring(page, 2, 9, 0);
  const k19 = await page.evaluate(() => ASP_TYPER[ASP.liste[0].t].felter(ASP.liste[0])[0]);
  await page.fill('#aspF-' + k19, '5');
  const tilst = await page.evaluate(() => JSON.stringify([ASP.i, ASP.fase, ASP.svar, ASP.seed]));
  await page.click('#ufk-build-byg'); await page.click('#ufk-build-spil');
  t.lig(await page.evaluate(k => [JSON.stringify([ASP.i, ASP.fase, ASP.svar, ASP.seed]), document.getElementById('aspF-' + k).value], k19), [tilst, '5'],
        'en opgave er uændret efter et afsnitsskift');
  L.ingenFejl(t, fejl, 'test 15 og 19');
  await b.close();

  /* 16 — reduceret bevægelse */
  const b16 = await L.browser();
  const s16 = await L.aaben(b16, {ctx:{reducedMotion:'reduce'}});
  await spilFacit(s16.page, 1, 42);
  const r16 = await s16.page.evaluate(() => ({regn:document.querySelectorAll('.asp-regn').length, point:ASP.point,
    anim:document.getAnimations().filter(a => a instanceof CSSAnimation && document.getElementById('atomSpil').contains(a.effect.target)).length}));
  t.lig(r16, {regn:0, point:10, anim:0}, 'reduceret bevægelse: ingen regn og ingen CSS-animationer i spillet');
  L.ingenFejl(t, s16.fejl, 'test 16');
  await b16.close();

  /* 12 — blokeret lager */
  const b12 = await L.browser();
  const s12 = await L.aaben(b12, {init:() => {
    Storage.prototype.getItem = function(){ throw new Error('blokeret'); };
    Storage.prototype.setItem = function(){ throw new Error('blokeret'); };
  }});
  const v12 = await s12.page.evaluate(() => { showTab('build'); visUnderfane('build', 'spil');
    return [...document.querySelectorAll('#aspValg .asp-niv-bedst')].map(x => x.textContent); });
  t.lig(v12, Array(4).fill('Ikke spillet endnu'), 'blokeret lager: niveauskærmen siger "Ikke spillet endnu"');
  await spilFacit(s12.page, 3, 42);
  t.lig(await s12.page.evaluate(() => ASP.point), 10, 'blokeret lager: spillet kan spilles til ende');
  await s12.page.reload();
  t.lig(await s12.page.evaluate(() => { showTab('build'); visUnderfane('build', 'spil');
    return document.querySelector('#aspValg .asp-niv[data-niv="3"] .asp-niv-bedst').textContent; }), 'Ikke spillet endnu', 'blokeret lager: intet huskes efter genindlæsning');
  L.ingenFejl(t, s12.fejl, 'test 12');
  await b12.close();

  /* 13 — tidtagning med et falsk ur */
  const b13 = await L.browser();
  const ctx = await b13.newContext({viewport:{width:1280, height:900}});
  const p13 = await ctx.newPage(), f13 = [];
  p13.on('pageerror', e => f13.push(e.message)); p13.on('console', m => { if(m.type() === 'error') f13.push(m.text()); });
  await p13.clock.install({time:new Date('2026-10-13T08:00:00')});
  await p13.goto(L.SIDE);
  await p13.clock.pauseAt(new Date('2026-10-13T09:00:00'));     // tiden går kun, når testen siger det
  await p13.evaluate(() => { showTab('build'); visUnderfane('build', 'spil'); ASP.sidste = {}; });
  await p13.click('#aspUrKnap');
  t.lig(await p13.evaluate(() => [document.getElementById('aspUrKnap').textContent, document.getElementById('aspUrKnap').getAttribute('aria-pressed')]),
        ['Tidtagning: til', 'true'], 'tidtagningen slås til');
  await p13.evaluate(() => aspStart(2, 42));
  t.lig(await p13.textContent('#aspUr'), 'Tid 0:00', 'uret starter på 0:00');
  await p13.clock.runFor(65000);
  t.lig(await p13.textContent('#aspUr'), 'Tid 1:05', 'efter 65 s');
  await p13.click('#ufk-build-byg');
  await p13.clock.runFor(30000);
  await p13.click('#ufk-build-spil');
  t.lig(await p13.textContent('#aspUr'), 'Tid 1:05', 'uret står stille i Byg selv');
  // spil færdigt: første spil giver bedste score 10 og en tid
  async function spilMedUr(sek){
    for(let i = 0; i < 5; i++){
      await L.aspUdfyld(p13, await L.aspFacit(p13));
      if(i === 4) await p13.clock.runFor(sek * 1000);
      await L.aspTjekKlik(p13); await p13.click('#aspNaeste');
    }
  }
  await spilMedUr(0);
  const g1 = await p13.evaluate(() => ({gemt:ASP.gemt.niv['2'], rek:document.getElementById('aspRekord').textContent, ur:ASP.urId}));
  t.lig([g1.gemt.bedst, g1.gemt.tid, g1.rek, g1.ur], [10, 65, 'Ny bedste score! · Tid 1:05', null], 'første spil: ny bedste score med tid');
  const tid0 = await p13.evaluate(() => ASP.tid);
  await p13.clock.runFor(10000);
  t.lig(await p13.evaluate(() => ASP.tid), tid0, 'intet interval kører efter niveauet');
  await p13.evaluate(() => aspStart(2, 43)); await p13.clock.runFor(20000);
  await spilMedUr(0);
  const g2 = await p13.evaluate(() => ({gemt:ASP.gemt.niv['2'], rek:document.getElementById('aspRekord').textContent}));
  t.lig([g2.gemt.tid, g2.rek], [20, 'Tid 0:20 — ny rekord for 10 point!'], 'samme score på kortere tid: ny rekord');
  await p13.evaluate(() => aspStart(2, 44)); await p13.clock.runFor(5000);
  // en lavere score: første svar forkert, så rigtigt
  for(let i = 0; i < 5; i++){
    const f = await L.aspFacit(p13);
    if(i === 0){ const k = await p13.evaluate(() => ASP_TYPER[ASP.liste[0].t].felter(ASP.liste[0])[0]);
      await L.aspUdfyld(p13, Object.assign({}, f, {[k]:f[k] + 1})); await L.aspTjekKlik(p13); await p13.click('#aspIgen'); }
    await L.aspUdfyld(p13, f); await L.aspTjekKlik(p13); await p13.click('#aspNaeste');
  }
  const g3 = await p13.evaluate(() => ({gemt:ASP.gemt.niv['2'], rek:document.getElementById('aspRekord').textContent, point:ASP.point}));
  t.lig([g3.point, g3.gemt.bedst, g3.gemt.tid, g3.rek], [9, 10, 20, 'Tid 0:05 (din bedste: 0:20)'], 'lavere score: intet ændres');
  await p13.reload();
  t.lig(await p13.evaluate(() => { showTab('build'); visUnderfane('build', 'spil'); return document.getElementById('aspUrKnap').textContent; }),
        'Tidtagning: til', 'indstillingen huskes efter genindlæsning');
  t.lig(f13, [], 'ingen fejl i test 13');
  await b13.close();
  t.slut();
})().catch(e => { console.error(e); process.exit(1); });
