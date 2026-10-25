const fs=require('node:fs');
const assert=require('node:assert/strict');
const output=fs.readFileSync(process.argv[2],'utf8');
const match=output.match(/STILL_SMOKE_RESULT (\{[^\r\n]+\})/);
assert.ok(match,'Desktop smoke-test result is missing');
const result=JSON.parse(match[1]);
assert.equal(result.title,'Daymark · Tasks & Calendar');
for(const key of ['bridge','form','persisted','nodeIsolated'])assert.equal(result[key],true,key+' did not pass');
console.log('Packaged application passed:',JSON.stringify(result));
