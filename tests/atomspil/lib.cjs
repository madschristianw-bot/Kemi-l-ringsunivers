/* Fælles hjælpere til Atomspillets tests (Playwright, ingen package.json).
   Kør fx:  NODE_PATH=/opt/node22/lib/node_modules PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
            /opt/node22/bin/node tests/atomspil/alle.cjs
   Hvert script fejler på enhver pageerror og console-fejl. Skærmbilleder lægges i
   ASP_SKAERM (standard: operativsystemets midlertidige mappe). */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process');

const ROD = path.resolve(__dirname, '..', '..');
const SIDE = 'file://' + path.join(ROD, 'index.html');
const TMP = process.env.ASP_TMP || os.tmpdir();
const SKAERM = process.env.ASP_SKAERM || path.join(TMP, 'atomspil-skaerm');
const BASIS = '71bfea7';                 // commit'en før Atomspillet — byggerens facit

/* ---------- en lille testramme ---------- */
function test(navn){
  const t = {navn, ok:0, fejl:[]};
  t.sand = (b, msg) => { if(b) t.ok++; else t.fejl.push(msg); return !!b; };
  t.lig = (a, b, msg) => {
    const A = typeof a === 'string' ? a : JSON.stringify(a), B = typeof b === 'string' ? b : JSON.stringify(b);
    return t.sand(A === B, `${msg}: fik ${String(A).slice(0, 300)} — ventede ${String(B).slice(0, 300)}`);
  };
  t.slut = () => {
    console.log(`${t.fejl.length ? 'FEJL' : 'OK  '} ${navn}: ${t.ok} tjek bestået, ${t.fejl.length} fejlet`);
    t.fejl.slice(0, 25).forEach(f => console.log('   ✗ ' + f));
    if(t.fejl.length > 25) console.log(`   … og ${t.fejl.length - 25} mere`);
    if(t.fejl.length) process.exitCode = 1;
    return t;
  };
  return t;
}

/* ---------- browser og side ---------- */
async function browser(){ return chromium.launch(); }
/* åbner appen og samler fejl: alle pageerrors og console-fejl, og advarsler fra Atomspillet */
async function aaben(b, opt){
  opt = opt || {};
  const ctx = await b.newContext(Object.assign({viewport:{width:1280, height:900}}, opt.ctx || {}));
  if(opt.init) await ctx.addInitScript(opt.init);
  const page = await ctx.newPage();
  const fejl = [];
  page.on('pageerror', e => fejl.push('pageerror: ' + e.message));
  page.on('console', m => {
    if(m.type() === 'error') fejl.push('console.error: ' + m.text());
    if(m.type() === 'warning' && /Atomspillet:/.test(m.text())) fejl.push('console.warn: ' + m.text());
  });
  page.on('dialog', d => { if(!opt.dialog) d.dismiss(); });
  await page.goto(opt.url || SIDE);
  return {ctx, page, fejl};
}
/* ingen fejl i konsollen — kaldes til sidst i hvert script */
function ingenFejl(t, fejl, hvor){ t.lig(fejl, [], 'ingen side- eller konsolfejl' + (hvor ? ' (' + hvor + ')' : '')); }

/* byggerens side fra før Atomspillet, til de gyldne tests */
function basisSide(){
  const ud = path.join(TMP, 'atomspil-basis-' + BASIS + '.html');
  if(!fs.existsSync(ud)) fs.writeFileSync(ud, cp.execFileSync('git', ['-C', ROD, 'show', BASIS + ':index.html'], {maxBuffer:1 << 27}));
  return 'file://' + ud;
}

/* ---------- øjebliksbilleder (snapshot.json, tekster.json) ----------
   Første grønne kørsel skriver filen; bagefter sammenlignes der med den. */
function snapshot(t, fil, data, navn){
  const f = path.join(__dirname, fil);
  const ny = JSON.stringify(data, null, 1);
  if(!fs.existsSync(f) || process.env.ASP_NYE_SNAPSHOTS){ fs.writeFileSync(f, ny + '\n'); console.log('   (skrev ' + fil + ')'); t.sand(true, ''); return; }
  const gl = fs.readFileSync(f, 'utf8').trim();
  if(gl === ny) { t.sand(true, ''); return; }
  const a = JSON.parse(gl), b = JSON.parse(ny), forskel = [];
  const noegler = new Set([...Object.keys(a), ...Object.keys(b)]);
  noegler.forEach(k => { if(JSON.stringify(a[k]) !== JSON.stringify(b[k])) forskel.push(k); });
  t.sand(false, `${navn || fil} afviger fra øjebliksbilledet i ${forskel.length} nøgler, fx ${forskel.slice(0, 5).join(', ')}`);
}

function skaermbillede(navn){ fs.mkdirSync(SKAERM, {recursive:true}); return path.join(SKAERM, navn + '.png'); }

/* ---------- spillet set udefra ----------
   aspSpring springer til opgave i i et nyt spil (kun til tests og skærmbilleder). */
async function aspSpring(page, niv, seed, i){
  await page.evaluate(([niv, seed, i]) => {
    showTab('build'); visUnderfane('build', 'spil');
    ASP.sidste = {};                       // samme spil hver gang for samme seed
    aspStart(niv, seed);
    if(i){ ASP.i = i; aspNyOpgave(); aspTegnOpg(); }
  }, [niv, seed, i || 0]);
}
/* udfyld den viste opgave med et svar {Z, valg, A, Q, skal, dom, kerne, p, n, e} med rigtige klik og tastetryk */
async function aspUdfyld(page, svar){
  const d = await page.evaluate(() => ({t:ASP.liste[ASP.i].t, felter:ASP_TYPER[ASP.liste[ASP.i].t].felter(ASP.liste[ASP.i]),
                                       laast:ASP.laast}));
  for(const k of d.felter){
    if(d.laast.includes(k)) continue;
    const v = svar[k];
    if(v === undefined || v === null) continue;
    if(k === 'Z') await page.click(`#aspOpg .asp-cell[data-sz="${v}"]`);
    else if(k === 'valg' || k === 'dom' || k === 'kerne') await page.click(`#aspOpg label.asp-chip:has(input[data-felt="${k}"][value="${v}"])`);
    else if(k === 'A' || k === 'Q' || k === 'skal') await page.fill('#aspF-' + k, String(k === 'Q' && v > 0 ? '+' + v : v));
    else await page.fill('#aspN-' + k, String(v));
  }
}
async function aspFacit(page){ return page.evaluate(() => aspFacit()); }
async function aspTjekKlik(page){ await page.click('#aspTjek'); }

module.exports = {ROD, SIDE, TMP, SKAERM, test, browser, aaben, ingenFejl, basisSide, snapshot, skaermbillede,
                  aspSpring, aspUdfyld, aspFacit, aspTjekKlik};
