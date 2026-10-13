/* Test 17: sproget. Alle spillets tekster — spørgsmål, feedback, tips, knapper, resumélinjer og
   infoboksen i spillets stemme — for tre seeds pr. type gemmes i tekster.json, og ingen må indeholde
   engelske ord, "1 protoner", "1 af 3 felter er rigtige" eller bindestreg som minus foran et tal.
   Feltværdier, der er kopieret fra byggeren (symbolets "2–"), er ikke med. */
const L = require('./lib.cjs');

(async () => {
  const t = L.test('07 sprog');
  const b = await L.browser();
  const {page, fejl} = await L.aaben(b);

  const tekster = await page.evaluate(() => {
    const ud = {}, set = {};
    const put = (k, s) => { (ud[k] = ud[k] || []); if(s && !ud[k].includes(s)) ud[k].push(s); };
    // tre opgaver pr. type (og visning), fundet i fast rækkefølge
    const fundet = {};
    for(let niv = 1; niv <= 4; niv++) for(let seed = 1; seed <= 400; seed++) aspLavSpil(niv, seed).forEach(d => {
      const k = d.t + (d.t === 'iondom' || d.t === 'kernedom' ? '-' + d.kat : '') + (d.t === 'udfyld' ? '-' + d.felter.length : '');
      const n = (set[k] = set[k] || 0);
      if(n < 3){ set[k]++; (fundet[d.t] = fundet[d.t] || []).push(d); }
    });
    // og de atomer, hvor sproget er sværest: én skal, ingen elektroner, ingen neutroner
    const ekstra = [{t:'skal', vis:'tal', s:{p:3, n:4, e:2}}, {t:'udfyld', vis:'tal', felter:['sym','A','Q','skal'], s:{p:1, n:0, e:0}},
                    {t:'udfyld', vis:'tal', felter:['A','skal'], s:{p:2, n:2, e:2}}, {t:'masse', vis:'billede', s:{p:1, n:0, e:0}},
                    {t:'ladning', vis:'tal', s:{p:1, n:0, e:0}}, {t:'grundstof', vis:'billede', s:{p:1, n:0, e:0}},
                    {t:'grundstof', vis:'billede', s:{p:9, n:10, e:10}}, {t:'grundstof', vis:'tal', s:{p:17, n:18, e:18}},
                    {t:'byg', vis:'byg', s:{p:4, n:5, e:2}}, {t:'ion', vis:'byg', s:{p:3, n:4, e:2}}, {t:'ion', vis:'byg', s:{p:17, n:18, e:18}}];
    ekstra.forEach(d => fundet[d.t].push(Object.assign({nr:1, kat:null}, d)));
    Object.keys(fundet).sort().forEach(type => fundet[type].forEach(d => {
      const T = ASP_TYPER[d.t], f = aspFacit(d), fl = T.felter(d), m = atomInfo(d.s, {stemme:'spil'});
      put(type, T.navn); put(type, T.prompt(d)); put(type, T.rigtig(d)); put(type, T.vis(d)); put(type, T.drillede);
      put(type, 'boks: ' + m.navn + ' · ' + m.linje + ' · ' + m.dom.html + ' · ' + m.kerne.msg);
      put(type, `resumé: 1. ${T.navn} — <b>${atNavn(d.s)}</b>`);
      // forkerte svar: hvert felt for sig og alle på én gang
      const forkerte = k => k === 'Z' ? [1, 2, d.s.e, d.s.n, d.s.p + d.s.n, 20].filter(z => z >= 1 && z <= 20 && z !== f.Z)
        : k === 'valg' ? [f.valg === 'ion' ? 'neutral' : 'ion']
        : k === 'dom' || k === 'kerne' ? ['ok','warn','bad'].filter(v => v !== f[k])
        : [f[k] + 1, f[k] - 1, f[k] + 2, 0, -f[k], d.s.p, d.s.n, d.s.e, d.s.p + d.s.n, d.s.p + d.s.n + d.s.e, 9, 12]
            .filter(v => v !== f[k] && (k === 'Q' || v >= 0) && !(d.t === 'ion' && v === d.s.p));
      fl.forEach(k => forkerte(k).forEach(v => {
        const svar = Object.assign({}, f, {[k]:v});
        put(type, aspHint(d, svar));
        if(T.opbrugt) put(type, T.opbrugt(d, svar));
      }));
      if(fl.length > 1){
        const alle = Object.assign({}, f); fl.forEach(k => alle[k] = forkerte(k)[0]);
        put(type, aspHint(d, alle)); if(T.opbrugt) put(type, T.opbrugt(d, alle));
      }
      if(d.t === 'kernedom'){ ASP.liste = [d]; ASP.i = 0; aspNyOpgave(); ASP.fase = 'svar';
        const tmp = document.createElement('div'); tmp.innerHTML = aspBoks(d); put(type, tmp.querySelector('.asp-isotoper').innerHTML); }
      put(type, aspBilledTekst(d.s));
    }));
    // de faste tekster: niveauer, titler, knapper, hints og live-tekster
    ASP_NIV.forEach(n => { put('niveauer', n.navn); put('niveauer', n.kort); });
    [0, 4, 5, 7, 8, 9, 10].forEach(p => { const x = aspTitel(p); put('titler', x.titel); put('titler', x.opmuntring); });
    Object.values(ASP_INSTR).forEach(x => put('instruktioner', x));
    put('fast', 'Desværre — heller ikke denne gang. Tryk på <b>Vis svaret</b>.');
    return ud;
  });

  // knapper og hints fra den rigtige side
  const knapper = await page.evaluate(() => {
    showTab('build'); visUnderfane('build', 'spil'); ASP.sidste = {};
    const ud = new Set(), tag = () => document.querySelectorAll('#atomSpil button, #atomSpil .hint, #atomSpil .sub, #atomSpil legend, #atomSpil .asp-instr')
      .forEach(e => { const x = e.textContent.trim().replace(/\s+/g, ' '); if(x) ud.add(x); });
    tag();
    for(let niv = 1; niv <= 4; niv++){ aspStart(niv, 3); for(let i = 0; i < 5; i++){ ASP.i = i; aspNyOpgave(); aspTegnOpg(); tag(); } }
    ud.add(document.getElementById('aspLive').textContent);
    return [...ud].filter(x => !/^\d+$/.test(x) && !/^[A-Z][a-z]?$/.test(x)).sort();
  });
  tekster.knapper = knapper.filter(x => !/atom-nummer \d+$/.test(x));
  tekster.live = ['Opgave 3 af 5: Hvad er massetallet?', 'Rigtigt! 2 point.', 'Rigtigt! 1 point.', 'Ikke rigtigt. Du har ét forsøg mere.',
                  'Ikke rigtigt. Tryk på Vis svaret.', 'Svaret er vist.', 'Niveauet er slut: 8 af 10 point.'];

  const ENG = /\b(the|and|score|level|check|next|try|again|answer|correct|wrong|chlor)\b/i;
  const fund = [];
  let n = 0;
  Object.keys(tekster).forEach(k => tekster[k].forEach(s => {
    n++;
    const ren = s.replace(/<[^>]+>/g, '');
    if(ENG.test(ren)) fund.push('engelsk: ' + ren.slice(0, 120));
    if(/\b[01] (protoner|neutroner|elektroner)\b/.test(ren)) fund.push('ental/flertal: ' + ren.slice(0, 120));
    if(/1 af \d+ felter er rigtige/.test(ren)) fund.push('"1 af … rigtige": ' + ren.slice(0, 120));
    if(/[ (>]-\d/.test(s) || /^-\d/.test(ren)) fund.push('bindestreg-minus: ' + ren.slice(0, 120));
    // grundstofnavne inde i spillets egne sætninger står med lille (boksens egen tekst er byggerens)
    if(!s.startsWith('boks: ') && /[a-zæøå,] (Brint|Helium|Lithium|Beryllium|Bor|Carbon|Nitrogen|Oxygen|Fluor|Neon|Natrium|Magnesium|Aluminium|Silicium|Fosfor|Svovl|Klor|Argon|Kalium|Calcium)\b(?! \()/
         .test(s.replace(/<span class="tag[^>]*>[^<]*<\/span>/g, '¤').replace(/<[^>]+>/g, ''))) fund.push('stort navn inde i en sætning: ' + ren.slice(0, 120));
  }));
  t.sand(n > 500, 'mindst 500 tekster (fik ' + n + ')');
  t.lig(fund.slice(0, 10), [], 'sprogtjek');
  L.snapshot(t, 'tekster.json', tekster, 'teksternes øjebliksbillede');

  L.ingenFejl(t, fejl);
  await b.close();
  t.slut();
})().catch(e => { console.error(e); process.exit(1); });
