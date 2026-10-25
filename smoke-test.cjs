const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
class Element {
 constructor(){this.children=[];this.value='';this.style={setProperty(){}};this.dataset={};this.classList={toggle(){}}}
 append(...items){this.children.push(...items)}
 replaceChildren(...items){this.children=items}
 setAttribute(name,value){this[name]=value}
 setCustomValidity(value){this.validationMessage=value}
 reportValidity(){return !this.validationMessage}
 showModal(){}
 close(){}
}
const elements = new Map();
const document = {querySelector(s){if(!elements.has(s))elements.set(s,new Element());return elements.get(s)},querySelectorAll(){return []},createElement(){return new Element()},createTextNode(text){return {textContent:text}},documentElement:new Element()};
const persisted = new Map();
const notices=[];
class Notification {static permission='granted';constructor(title,options){notices.push({title,...options})}}
const ctx = vm.createContext({document,localStorage:{getItem:k=>persisted.get(k)||null,setItem:(k,v)=>persisted.set(k,v)},window:{Notification,isSecureContext:true,addEventListener(){},focus(){}},Notification,setTimeout(){},clearTimeout(){},setInterval(){},console,Date,Blob,URL});
vm.runInContext(fs.readFileSync('app.js','utf8'),ctx);
elements.get('#categoryFilter').value='all';
vm.runInContext(`tasks=[{id:'sample',title:'Morning task',notes:'',date:today(),time:'09:00',priority:'normal',reminder:'0',done:false},{id:'afternoon',title:'Afternoon task',notes:'',date:today(),time:'14:00',priority:'normal',reminder:'none',done:false}];page='calendar';view='day';render();`,ctx);
assert.equal(elements.get('#content').children[0].children.length,3,'Day has three time sections');
vm.runInContext(`view='week';render();`,ctx);
assert.equal(elements.get('#content').children[0].children[0].children.length,32,'Week has headers and three rows for all seven days');
vm.runInContext(`view='month';render();`,ctx);
assert.equal(elements.get('#content').children[0].children.length,49,'Month includes headers and 42 date cells');
vm.runInContext(`settings.theme='pink';applySettings();sendSystemNotification('Test','Example','test');`,ctx);
assert.equal(document.documentElement.dataset.theme,'pink');
assert.equal(notices.length,1);
vm.runInContext(`settings.desktopNotifications=false;sendSystemNotification('Test','Example','test');`,ctx);
assert.equal(notices.length,1,'Notification toggle prevents system delivery');
Notification.permission='denied';
vm.runInContext('updateNotificationUI()',ctx);
assert.equal(elements.get('#testNotification').disabled,true);
console.log('Passed: day/week/month rendering, theme switching, notification delivery and permission states.');
vm.runInContext(`tasks[0].category='class';tasks[0].location='Room 203';tasks[0].endTime='12:30';`,ctx);
assert.equal(vm.runInContext(`periodTasks(tasks,today(),periods[1]).length`,ctx),2,'Class crossing noon remains visible in afternoon');
elements.get('#categoryFilter').value='class';
assert.equal(vm.runInContext('matching().length',ctx),1,'Category filter');
elements.get('#search').value='203';
assert.equal(vm.runInContext('matching()[0].id',ctx),'sample','Search includes location');
elements.get('#search').value='';
elements.get('#categoryFilter').value='none';
assert.equal(vm.runInContext('matching()[0].id',ctx),'afternoon','Older uncategorised tasks remain visible');
elements.get('#categoryFilter').value='all';
vm.runInContext(`setCompleted('sample',true)`,ctx);
assert.equal(vm.runInContext('tasks[0].done',ctx),true);
assert.equal(JSON.parse(persisted.get('shixu-tasks-v1'))[0].done,true,'Completion persists');
elements.get('#toast').children[1].onclick();
assert.equal(vm.runInContext('tasks[0].done',ctx),false,'Undo restores previous state');
assert.equal(JSON.parse(persisted.get('shixu-tasks-v1'))[0].done,false,'Undo persists');
vm.runInContext('openTask(tasks[0])',ctx);
assert.equal(elements.get('#taskDuration').value,210);
assert.equal(elements.get('#taskLocation').value,'Room 203');
elements.get('#taskDuration').value='-5';
vm.runInContext('updateDuration()',ctx);
assert.equal(elements.get('#taskDuration').reportValidity(),false,'Reject negative duration');
elements.get('#taskDuration').value='90';
vm.runInContext('updateDuration()',ctx);
assert.equal(elements.get('#durationHint').textContent,'Ends 10:30 · 1h 30m');
vm.runInContext(`$('#taskForm').onsubmit({preventDefault(){}})`,ctx);
assert.equal(vm.runInContext('tasks[0].endTime',ctx),'10:30','Edited duration saves');
assert.equal(vm.runInContext('tasks[0].category',ctx),'class');
vm.runInContext(`$('#dialogComplete').onclick()`,ctx);
assert.equal(vm.runInContext('tasks[0].done',ctx),true,'Edit dialog completion');
console.log('Passed: categories, location search, duration validation, save, completion and Undo.');
assert.equal(vm.runInContext(`durationData('2026-10-25','23:30','90').endTime`,ctx),'01:00');
assert.equal(vm.runInContext(`durationData('2026-10-25','23:30','90').endDate`,ctx),'2026-10-26');
assert.equal(vm.runInContext(`durationData('2026-10-25','09:00','1.5')`,ctx),null,'Whole minutes only');
elements.get('#categoryFilter').value='leisure';
elements.get('#search').value='unrelated';
vm.runInContext(`switchPage('history')`,ctx);
assert.equal(elements.get('#categoryFilter').value,'all','History has independent category');
assert.equal(elements.get('#search').value,'','History has independent query');
assert.equal(vm.runInContext('historyItems().length',ctx),1,'Completed task is discoverable');
elements.get('#historyFrom').value='2099-01-01';
assert.equal(vm.runInContext('historyItems().length',ctx),0,'History uses completion date range');
elements.get('#clearHistory').onclick();
assert.equal(vm.runInContext('historyItems().length',ctx),1,'Clear filters restores history');
elements.get('#search').value='203';
assert.equal(vm.runInContext('historyItems().length',ctx),1,'History searches location');
elements.get('#search').value='';
vm.runInContext(`switchPage('calendar')`,ctx);
assert.equal(elements.get('#categoryFilter').value,'leisure','Original page retains its own filter');
vm.runInContext(`switchPage('tasks');tasks=[{id:'due',title:'Missed reminder',date:'2000-01-01',time:'09:00',reminder:'0',done:false,notified:true,notes:'',priority:'normal'}];settings.desktopNotifications=true;reminders();`,ctx);
assert.equal(elements.get('#reminderPanel').hidden,false,'Previously missed reminder remains visible without permission');
let delivered=notices.length;
Notification.permission='granted';
vm.runInContext('reminders();reminders()',ctx);
assert.equal(notices.length,delivered+1,'After permission, unread reminder delivers once');
vm.runInContext(`tasks[0].snoozedUntil=new Date(Date.now()+300000).toISOString();tasks[0].systemNotifiedAt=null;reminders();`,ctx);
assert.equal(elements.get('#reminderPanel').hidden,true,'Snooze hides until due');
vm.runInContext(`tasks[0].snoozedUntil='2000-01-01T10:00:00';reminders();`,ctx);
assert.equal(notices.length,delivered+2,'Snoozed reminder delivers again');
vm.runInContext(`tasks[0].reminderAcknowledged=true;reminders()`,ctx);
assert.equal(elements.get('#reminderPanel').hidden,true,'Dismissed reminder stays dismissed');
console.log('Passed: overnight duration, independent history filters and missed reminder recovery / snooze / dismissal.');
vm.runInContext(`tasks[0].reminderAcknowledged=false;switchPage('history')`,ctx);
assert.equal(elements.get('#reminderPanel').hidden,true,'Reminder banner does not displace history results');
assert.equal(elements.get('.overview').hidden,true,'History focuses on completed results');
assert.equal(elements.get('#historyResultsHeader').hidden,false);
elements.get('#search').value='example';
vm.runInContext('render()',ctx);
assert.equal(elements.get('#historyResultsTitle').textContent,'Search results');
const tones=[];
class TestAudioContext {
 state='running';currentTime=0;destination={};
 createOscillator(){return {frequency:{setValueAtTime(){}},connect(){},disconnect(){},start(){tones.push('beep')},stop(){}}}
 createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}
}
ctx.window.AudioContext=TestAudioContext;
vm.runInContext(`soundContext=new window.AudioContext();settings.reminderSound=true;settings.soundVolume=35;settings.desktopNotifications=false;tasks=[{id:'audio1',title:'One',date:'2000-01-01',time:'09:00',reminder:'0'},{id:'audio2',title:'Two',date:'2000-01-01',time:'09:00',reminder:'0'}];reminders();reminders()`,ctx);
assert.equal(tones.length,1,'Simultaneous due tasks play one beep and do not repeat');
assert.ok(JSON.parse(persisted.get('shixu-tasks-v1')).every(t=>t.soundReminderToken),'Sound deduplication persists');
vm.runInContext(`tasks[0].snoozedUntil='2000-01-01T10:00:00';reminders()`,ctx);
assert.equal(tones.length,2,'Snoozed reminder can beep again');
vm.runInContext(`settings.reminderSound=false;tasks[0].snoozedUntil='2000-01-01T11:00:00';reminders()`,ctx);
assert.equal(tones.length,2,'Sound switch mutes reminders');
vm.runInContext(`settings.reminderSound=true;settings.soundVolume=0;reminders()`,ctx);
assert.equal(tones.length,2,'Zero volume is silent');
vm.runInContext(`tasks=[{id:'detail',title:'Lecture',date:today(),time:'09:00',duration:90,location:'Room 203',notes:'Bring notebook.\\nRead chapter 2.',reminder:'5',category:'class',priority:'high'}];openEvent(tasks[0])`,ctx);
const textOf=el=>[el.textContent||'',...el.children.map(textOf)].join(' ');
assert.ok(textOf(elements.get('#eventDetails')).includes('1h 30m'));
assert.ok(textOf(elements.get('#eventDetails')).includes('Room 203'));
assert.ok(textOf(elements.get('#eventDetails')).includes('Read chapter 2.'));
vm.runInContext(`$('#eventComplete').onclick()`,ctx);
assert.equal(vm.runInContext('tasks[0].done',ctx),true,'Calendar details can complete a task');
console.log('Passed: history result placement, reminder sound batching/mute/snooze, calendar duration/location/notes details.');
