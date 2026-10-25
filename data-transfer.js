(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DaymarkTransfer=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const columns=['daymark_csv_version','id','title','date','time','duration_minutes','location','notes','category','priority','reminder','done','completed_at','reminder_acknowledged','snoozed_until','system_notified_at','reminder_shown_at','sound_reminder_token'];
  function fail(message){throw new Error(message)}
  function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00');return Number.isFinite(d.getTime())&&d.getFullYear()===Number(value.slice(0,4))&&d.getMonth()+1===Number(value.slice(5,7))&&d.getDate()===Number(value.slice(8,10))}
  function bool(value,label){if(value===true||value===1||/^(true|yes|1)$/i.test(String(value)))return true;if(value===false||value===0||value==null||/^(false|no|0|)$/i.test(String(value)))return false;fail(label+' must be true or false.')}
  function stableId(text){let a=2166136261,b=5381;for(const char of text){a=Math.imul(a^char.codePointAt(0),16777619);b=Math.imul(b,33)^char.codePointAt(0)}return 'import-'+(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0')}
  function normalizeTask(raw,index){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('Task '+(index+1)+' is invalid.');
    const title=String(raw.title??'').trim(),date=String(raw.date??''),time=String(raw.time??'');
    if(!title||title.length>160)fail('Task '+(index+1)+': title is required (max 160 characters).');
    if(!validDate(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))fail('Task '+(index+1)+': use date YYYY-MM-DD and time HH:mm.');
    const notes=String(raw.notes??''),location=String(raw.location??'');
    const duration=raw.duration==null||raw.duration===''?0:Number(raw.duration);
    if(!Number.isInteger(duration)||duration<0||duration>1440)fail('Task '+(index+1)+': duration must be 0–1440 whole minutes.');
    const task={id:String(raw.id||stableId([title,date,time,location].join('|'))),title,date,time,duration,location,notes,category:raw.category||'none',priority:raw.priority||'normal',reminder:String(raw.reminder??'none'),done:bool(raw.done,'done'),completedAt:raw.completedAt||null};
    if(!['none','class','meeting','personal','leisure'].includes(task.category))fail('Task '+(index+1)+': unknown category.');
    if(!['normal','high','low'].includes(task.priority))fail('Task '+(index+1)+': unknown priority.');
    if(!['none','0','5','15','30'].includes(task.reminder))fail('Task '+(index+1)+': unknown reminder.');
    for(const key of ['completedAt','snoozedUntil','systemNotifiedAt','reminderShownAt']){const value=raw[key];if(value){if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))fail('Task '+(index+1)+': invalid '+key);task[key]=value}}
    task.reminderAcknowledged=bool(raw.reminderAcknowledged,'reminder_acknowledged');
    if(typeof raw.soundReminderToken==='string')task.soundReminderToken=raw.soundReminderToken;
    // Earlier JSON backups used only endTime. Preserve their duration on import.
    if(!duration&&raw.endTime){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(raw.endTime))fail('Invalid end time.');const minutes=v=>Number(v.slice(0,2))*60+Number(v.slice(3));task.duration=(minutes(raw.endTime)-minutes(time)+1440)%1440||1440}
    return task;
  }
  function parseCSV(text){
    text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false,afterQuote=false;
    function pushRow(){row.push(cell);if(row.some(value=>value!==''))rows.push(row);row=[];cell='';afterQuote=false}
    for(let i=0;i<text.length;i++){
      const char=text[i];
      if(quoted){if(char==='"'){if(text[i+1]==='"'){cell+='"';i++}else{quoted=false;afterQuote=true}}else cell+=char;continue}
      if(char==='"'){if(cell||afterQuote)fail('Malformed CSV quote.');quoted=true;continue}
      if(char===','){row.push(cell);cell='';afterQuote=false;continue}
      if(char==='\r'||char==='\n'){if(char==='\r'&&text[i+1]==='\n')i++;pushRow();continue}
      if(afterQuote)fail('Unexpected text after a CSV quote.');cell+=char;
    }
    if(quoted)fail('CSV contains an unclosed quote.');if(cell||row.length||afterQuote)pushRow();
    if(!rows.length)fail('The CSV file is empty.');
    const headers=rows.shift().map(value=>value.trim().toLowerCase());
    if(new Set(headers).size!==headers.length)fail('CSV headers must be unique.');
    for(const required of ['title','date','time'])if(!headers.includes(required))fail('CSV is missing column: '+required);
    return rows.map((values,index)=>{if(values.length!==headers.length)fail('CSV row '+(index+2)+' has the wrong number of columns.');const row=Object.fromEntries(headers.map((key,i)=>[key,values[i]]));
      if(row.daymark_csv_version==='1')for(const key of ['id','title','location','notes','sound_reminder_token'])if(row[key]?.startsWith("'"))row[key]=row[key].slice(1);
      return {id:row.id,title:row.title,date:row.date,time:row.time,duration:row.duration_minutes??row.duration,location:row.location,notes:row.notes,category:row.category,priority:row.priority,reminder:row.reminder,done:row.done,completedAt:row.completed_at,reminderAcknowledged:row.reminder_acknowledged,snoozedUntil:row.snoozed_until,systemNotifiedAt:row.system_notified_at,reminderShownAt:row.reminder_shown_at,soundReminderToken:row.sound_reminder_token};
    });
  }
  function decode(text,name){
    if(text.length>10000000)fail('File is too large (10 MB maximum).');
    let items;if(/\.csv$/i.test(name))items=parseCSV(text);else{let data;try{data=JSON.parse(text.replace(/^\uFEFF/,''))}catch{fail('Choose a valid Daymark CSV or JSON file.')}items=Array.isArray(data)?data:data.tasks}
    if(!Array.isArray(items)||items.length>10000)fail('The file must contain at most 10,000 tasks.');
    const tasks=items.map(normalizeTask),ids=new Set();for(const task of tasks){if(ids.has(task.id))fail('The file contains duplicate task IDs.');ids.add(task.id)}return tasks;
  }
  function encodeCSV(tasks){
    const safe=value=>{let text=String(value??'');if(/^[=+\-@\t\r']/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"'};
    const rows=tasks.map((raw,index)=>{const t=normalizeTask(raw,index);return ['1',t.id,t.title,t.date,t.time,t.duration||0,t.location,t.notes,t.category||'none',t.priority||'normal',t.reminder??'none',!!t.done,t.completedAt||'',!!t.reminderAcknowledged,t.snoozedUntil||'',t.systemNotifiedAt||'',t.reminderShownAt||'',t.soundReminderToken||''].map(safe).join(',')});
    return '\uFEFF'+columns.join(',')+'\r\n'+rows.join('\r\n')+'\r\n';
  }
  function merge(existing,incoming,policy='keep'){
    const tasks=existing.map(t=>({...t})),positions=new Map(tasks.map((t,i)=>[t.id,i]));let added=0,updated=0,skipped=0;
    for(const task of incoming){if(positions.has(task.id)){if(policy==='update'){tasks[positions.get(task.id)]={...task};updated++}else skipped++}else{positions.set(task.id,tasks.length);tasks.push({...task});added++}}
    return {tasks,added,updated,skipped};
  }
  return {decode,encodeCSV,merge};
});
