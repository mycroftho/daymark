const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const directory=process.argv[2]||'artifacts';
const files=fs.readdirSync(directory).filter(name=>/\.(exe|dmg|zip)$/.test(name)).sort();
if(!files.some(name=>name.endsWith('.exe'))||!files.some(name=>name.endsWith('.dmg')))throw new Error('Windows and macOS installers must both exist before publication.');
fs.writeFileSync(path.join(directory,'SHA256SUMS.txt'),files.map(name=>crypto.createHash('sha256').update(fs.readFileSync(path.join(directory,name))).digest('hex')+'  '+name).join('\n')+'\n');
console.log('Checksummed '+files.length+' release assets.');
