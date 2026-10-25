const assert=require('node:assert/strict');
const {dueTasks}=require('./scheduler.cjs');
const base={id:'1',title:'Class',date:'2026-10-25',time:'09:00',reminder:'5'};
const now=new Date('2026-10-25T08:55:00').getTime();
assert.equal(dueTasks([base],now-1).length,0);
assert.equal(dueTasks([base],now).length,1);
for(const state of [{done:true},{reminderAcknowledged:true},{reminder:'none'},{systemNotifiedAt:'sent'},{snoozedUntil:'2026-10-25T10:00:00'}])assert.equal(dueTasks([{...base,...state}],now).length,0);
assert.equal(dueTasks([{...base,snoozedUntil:'2026-10-25T08:54:00'}],now).length,1);
console.log('Passed: native scheduler timing, completed/dismissed tasks, snooze and duplicate suppression.');
