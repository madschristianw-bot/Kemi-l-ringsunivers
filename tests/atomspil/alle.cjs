/* Kører alle Atomspillets tests efter hinanden og samler resultatet.
   NODE_PATH=/opt/node22/lib/node_modules PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
   /opt/node22/bin/node tests/atomspil/alle.cjs [filter] */
const cp = require('child_process'), fs = require('fs'), path = require('path');
const filer = fs.readdirSync(__dirname).filter(f => /^\d\d-.*\.cjs$/.test(f) && (!process.argv[2] || f.includes(process.argv[2]))).sort();
let fejl = 0;
for(const f of filer){
  const t0 = Date.now();
  const r = cp.spawnSync(process.execPath, [path.join(__dirname, f)], {stdio:'inherit', env:process.env});
  console.log(`   (${f}: ${((Date.now() - t0)/1000).toFixed(1)} s, kode ${r.status})`);
  if(r.status !== 0) fejl++;
}
console.log(fejl ? `\n${fejl} af ${filer.length} testfiler fejlede` : `\nAlle ${filer.length} testfiler bestod`);
process.exit(fejl ? 1 : 0);
