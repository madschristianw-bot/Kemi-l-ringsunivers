/* Test 3: underfanerne "Byg selv" / "Atomspillet" og de knapper, der skal åbne byggeren. */
const L = require('./lib.cjs');

(async () => {
  const t = L.test('02 underfaner og navigation');
  const b = await L.browser();

  /* kilderækkefølgen, uden JavaScript */
  const u = await L.aaben(b, {ctx:{javaScriptEnabled:false}});
  const kilde = await u.page.evaluate(() => {
    const k = [...document.getElementById('view-build').children];
    return {tags:k.map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className ? '.' + e.className.split(' ')[0] : '')),
            intro:k[0].textContent};
  });
  t.lig(kilde.tags, ['p.sub', 'div.grid', 'div#atomSpil.asp'], 'børnene i #view-build i HTML');
  t.sand(/Atomspillet/.test(kilde.intro) && !/Klik på et felt/.test(kilde.intro), 'introteksten nævner Atomspillet og ikke tabelklikket');
  await u.ctx.close();

  const {page, fejl} = await L.aaben(b);
  const efter = await page.evaluate(() => {
    showTab('build');
    const k = [...document.getElementById('view-build').children].map(e => e.id || e.tagName.toLowerCase());
    const rk = document.getElementById('ufr-build').textContent;
    return {k, rk, byg:document.getElementById('ufp-build-byg').style.display, spil:document.getElementById('ufp-build-spil').style.display,
      fod:[...document.querySelectorAll('#view-build .uf-fod button')].map(x => x.textContent),
      spilIPanel:document.getElementById('ufp-build-spil').contains(document.getElementById('atomSpil'))};
  });
  t.lig(efter.k, ['p', 'ufr-build', 'ufp-build-byg', 'ufp-build-spil'], 'rækkefølgen efter indlæsning');
  t.sand(/Byg selv/.test(efter.rk) && /Atomspillet/.test(efter.rk), 'rækken har "Byg selv" og "Atomspillet"');
  t.lig([efter.byg, efter.spil], ['', 'none'], 'Byg selv vises som standard');
  t.lig(efter.fod, ['Næste: Atomspillet →', '← Byg selv'], 'knapperne nederst');
  t.sand(efter.spilIPanel, '#atomSpil ligger i #ufp-build-spil');

  /* et spil i gang overlever faneskift, og det, der er skrevet, bliver stående */
  await page.click('#ufk-build-spil');
  await page.click('#aspValg .asp-niv[data-niv="2"]');
  const f0 = await page.evaluate(() => ({seed:ASP.seed, i:ASP.i, felter:ASP_TYPER[ASP.liste[0].t].felter(ASP.liste[0])}));
  const k = f0.felter[0];
  await page.fill('#aspF-' + k, '7');
  await page.click('#ufk-build-spil');
  await page.click('#ufk-build-byg');
  await page.click('#ufk-build-spil');
  await page.click('#tab-mol');
  await page.click('#tab-build');
  const f1 = await page.evaluate(k => ({seed:ASP.seed, i:ASP.i, skaerm:ASP.skaerm, v:document.getElementById('aspF-' + k).value,
                                        synlig:document.getElementById('ufp-build-spil').style.display}), k);
  t.lig([f1.seed, f1.i, f1.skaerm, f1.v, f1.synlig], [f0.seed, 0, 'opg', '7', ''], 'spillet og feltet er der stadig efter faneskift');

  /* det store periodiske system fører til byggeren, også når spillet stod åbent */
  await page.evaluate(() => { showTab('build'); visUnderfane('build', 'spil'); showTab('ptable'); });
  /* et felt i det store system åbner grundstoffets kort, og knappen dér kalder setFromZ */
  await page.click('#ptbig .pcell[data-z="17"]');
  await page.click('#view-ptable button:has-text("Byg Cl-atomet")');
  const pt = await page.evaluate(() => ({byg:document.getElementById('ufp-build-byg').style.display,
    on:document.getElementById('ufk-build-byg').classList.contains('on'),
    tal:['np','nn','ne'].map(id => document.getElementById(id).textContent)}));
  t.lig(pt, {byg:'', on:true, tal:['17','18','17']}, 'klik på Cl i det store system åbner Byg selv med klor-35');

  /* læringslagets veje og quizzens "Gå til Byg et atom" åbner byggeren */
  const veje = {
    'LR.gaaTil': () => LR.gaaTil('atom-tal'),
    'LR.gaaFane': () => LR.gaaFane('atom')
  };
  for(const navn of Object.keys(veje)){
    await page.evaluate(() => { showTab('build'); visUnderfane('build', 'spil'); showTab('elev'); });
    await page.evaluate(veje[navn]);
    const r = await page.evaluate(() => [document.getElementById('view-build').style.display, document.getElementById('ufp-build-byg').style.display]);
    t.lig(r, ['block', ''], navn + ' åbner Byg selv');
  }
  await page.evaluate(() => {
    showTab('build'); visUnderfane('build', 'spil'); showTab('quiz');
    const item = QZ.find(q => q.t === 'atom');
    qz.liste = [item]; qz.i = 0; qz.score = 0; qz.log = [{item, rigtigt:false, valgt:'forkert'}]; qz.bedsteStreak = 0;
    document.getElementById('quizStart').style.display = 'none';
    qzResultat();
  });
  await page.click('#qzFeed button:has-text("Gå til Byg et atom")');
  const qr = await page.evaluate(() => [document.getElementById('view-build').style.display, document.getElementById('ufp-build-byg').style.display]);
  t.lig(qr, ['block', ''], 'quizzens "Gå til Byg et atom →" åbner Byg selv');
  // og et andet emne virker som før
  const andet = await page.evaluate(() => { const item = QZ.find(q => q.t === 'gas');
    qz.liste = [item]; qz.log = [{item, rigtigt:false, valgt:'x'}]; qzResultat();
    return document.querySelector('#qzFeed .qz-ff .btn').getAttribute('onclick'); });
  t.lig(andet, "showTab('gas')", 'et emne uden afsnit har den samme knap som før');

  /* ingen dobbelte id'er, efter alle skærme har været vist */
  await page.evaluate(() => { showTab('build'); visUnderfane('build', 'spil'); ASP.sidste = {}; });
  const ids = [];
  const dubletter = () => page.evaluate(() => { const m = {}; document.querySelectorAll('[id]').forEach(e => m[e.id] = (m[e.id] || 0) + 1);
    return Object.keys(m).filter(k => m[k] > 1); });
  ids.push(...await dubletter());
  for(let niv = 1; niv <= 4; niv++){
    await page.evaluate(n => aspStart(n, 42), niv);
    for(let i = 0; i < 5; i++){
      ids.push(...await dubletter());
      const f = await L.aspFacit(page);
      await L.aspUdfyld(page, f);
      await L.aspTjekKlik(page);
      ids.push(...await dubletter());
      await page.click('#aspNaeste');
    }
    ids.push(...await dubletter());
    await page.click('#aspSlut button[data-asp="tilvalg"]');
  }
  t.lig([...new Set(ids)], [], "ingen dobbelte id'er");

  L.ingenFejl(t, fejl);
  await b.close();
  t.slut();
})().catch(e => { console.error(e); process.exit(1); });
