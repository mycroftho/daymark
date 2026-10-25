const {app,BrowserWindow,ipcMain,Notification,Tray,Menu,nativeImage,shell,powerMonitor,screen} = require('electron');
const fs=require('node:fs');
const path=require('node:path');
const {dueTasks,notificationsEnabled}=require('./scheduler.cjs');
const TASKS='shixu-tasks-v1', SETTINGS='shixu-settings-v1';
const APP_ID='local.still.planner';
function appIcon(extension='png'){return app.isPackaged&&process.platform==='win32'?path.join(process.resourcesPath,`daymark-${app.getVersion()}.${extension}`):path.join(__dirname,'..','build','icon.'+extension);}
app.setName('Daymark');
if(process.platform==='win32')app.setAppUserModelId(APP_ID);
const TOAST_CLSID='{4A3D8FC1-7C62-4DA9-ACF6-11DC51D33725}';
if(process.platform==='win32')app.setToastActivatorCLSID(TOAST_CLSID);
const smoke=process.argv.includes('--still-smoke-test');
if(smoke) app.setPath('userData',path.resolve('.desktop-test'));
else if(app.isPackaged&&process.platform==='win32'){const dataRoot=path.resolve(path.dirname(process.execPath),'..','DaymarkData');fs.mkdirSync(dataRoot,{recursive:true});app.setPath('userData',dataRoot);app.setPath('sessionData',path.join(dataRoot,'chromium'));app.setPath('crashDumps',path.join(dataRoot,'crashes'));}
let win,tray,quitting=false,data={},dataPath,loadError='',notificationError='';
const notices=new Set(),retryAfter=new Map();
const pendingNotifications=new Map();
function logNotification(event,tag,detail=''){try{const logPath=path.join(app.getPath('userData'),'notifications.log');if(fs.existsSync(logPath)&&fs.statSync(logPath).size>500000)fs.renameSync(logPath,logPath+'.previous');fs.appendFileSync(logPath,JSON.stringify({at:new Date().toISOString(),event,tag,detail})+'\n')}catch{}}
function registerShortcuts(){if(process.platform!=='win32'||smoke||!app.isPackaged)return;const options={target:process.execPath,cwd:path.dirname(process.execPath),description:'Daymark · Personal schedule and reminders',icon:appIcon('ico'),iconIndex:0,appUserModelId:APP_ID,toastActivatorClsid:TOAST_CLSID};const links=[path.join(app.getPath('appData'),'Microsoft','Windows','Start Menu','Programs','Daymark.lnk')];for(const link of links){fs.mkdirSync(path.dirname(link),{recursive:true});if(!shell.writeShortcutLink(link,'create',options))throw new Error('Could not register '+link);const saved=shell.readShortcutLink(link);if(saved.appUserModelId!==APP_ID||saved.toastActivatorClsid?.toUpperCase()!==TOAST_CLSID.toUpperCase())throw new Error('Notification shortcut registration did not match');}const desktopLink=path.join(app.getPath('desktop'),'Daymark.lnk');if(fs.existsSync(desktopLink)){try{const existing=shell.readShortcutLink(desktopLink);if(path.resolve(existing.target).toLowerCase()===path.resolve(process.execPath).toLowerCase())shell.writeShortcutLink(desktopLink,'update',options);}catch(error){logNotification('shortcut-update-failed',APP_ID,String(error));}}logNotification('registered',APP_ID);}
const locked=app.requestSingleInstanceLock();
if(!locked){app.quit();process.exit(0);}
function load(){dataPath=path.join(app.getPath('userData'),'still-data.json');try{const value=JSON.parse(fs.readFileSync(dataPath,'utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid data file');data=value;}catch(error){if(error.code!=='ENOENT'){loadError='Your data file could not be read. It has been left untouched. Please restore a backup or check '+dataPath;}}}
function persist(){if(loadError)throw new Error(loadError);fs.mkdirSync(path.dirname(dataPath),{recursive:true});fs.writeFileSync(dataPath+'.tmp',JSON.stringify(data),'utf8');fs.renameSync(dataPath+'.tmp',dataPath);}
function read(key,fallback){try{return JSON.parse(data[key])??fallback}catch{return fallback}}
function broadcast(){if(win&&!win.isDestroyed())win.webContents.send('storage:changed');}
function show(){if(!win||win.isDestroyed())return;if(win.isMinimized())win.restore();win.show();win.focus();}
function notify({title,body,tag},task){
 if(!Notification.isSupported())return false;
 if(retryAfter.get(tag)>Date.now())return false;
 if(pendingNotifications.has(tag))return true;
 const settings=read(SETTINGS,{});if(!notificationsEnabled(settings))return false;
 if(task?.systemNotifiedAt)return true;
 try{
  const notification=new Notification({title:String(title).slice(0,200),body:String(body).slice(0,1200),icon:appIcon(),silent:true,timeoutType:'default'});
  notices.add(notification);
  pendingNotifications.set(tag,notification);
  const timer=setTimeout(()=>{if(pendingNotifications.has(tag)){pendingNotifications.delete(tag);retryAfter.set(tag,Date.now()+60000);notificationError='The system has not confirmed this notification. Check Daymark in system notification settings and Focus / Do Not Disturb.';logNotification('unconfirmed',tag);if(win)win.webContents.send('notification:error',notificationError)}},12000);
  notification.on('show',()=>{clearTimeout(timer);pendingNotifications.delete(tag);notificationError='';logNotification('shown',tag);if(task){const current=read(TASKS,[]);const latest=current.find(t=>t.id===task.id);if(latest&&!latest.done&&!latest.reminderAcknowledged){latest.systemNotifiedAt=new Date().toISOString();data[TASKS]=JSON.stringify(current);persist();broadcast()}}});
  notification.on('click',show);
  notification.on('close',()=>notices.delete(notification));
  notification.on('failed',(_,error)=>{clearTimeout(timer);pendingNotifications.delete(tag);notificationError='The system could not display the notification: '+String(error);logNotification('failed',tag,String(error));retryAfter.set(tag,Date.now()+60000);notices.delete(notification);if(win)win.webContents.send('notification:error',notificationError)});
  logNotification('requested',tag);notification.show();return true;
 }catch(error){notificationError=String(error.message);retryAfter.set(tag,Date.now()+60000);return false;}
}
function scan(){if(loadError)return;const settings=read(SETTINGS,{});if(!notificationsEnabled(settings))return;for(const task of dueTasks(read(TASKS,[])))notify({title:'Daymark · Reminder',body:task.title+' · '+task.date+' '+task.time,tag:task.id},task);}
function openNotificationSettings(){return shell.openExternal(process.platform==='darwin'?'x-apple.systempreferences:com.apple.preference.notifications':'ms-settings:notifications')}
function trusted(event){return win&&event.sender===win.webContents;}
ipcMain.on('storage:get',(event,key)=>{event.returnValue=trusted(event)&&[TASKS,SETTINGS].includes(key)?data[key]??null:null;});
ipcMain.on('storage:set',(event,key,value)=>{try{if(!trusted(event)||![TASKS,SETTINGS].includes(key)||typeof value!=='string'||value.length>10000000)throw new Error('Invalid data');const parsed=JSON.parse(value);if(key===TASKS&&!Array.isArray(parsed))throw new Error('Invalid tasks');data[key]=value;persist();event.returnValue={ok:true};}catch(error){event.returnValue={ok:false,error:error.message};}});
ipcMain.on('notification:status',event=>{event.returnValue=trusted(event)?{supported:Notification.isSupported(),error:loadError||notificationError}: {supported:false};});
ipcMain.on('notification:show',(event,payload)=>{if(!trusted(event)||!payload||typeof payload.title!=='string'||typeof payload.body!=='string'){event.returnValue=false;return}const task=read(TASKS,[]).find(t=>t.id===payload.tag);event.returnValue=notify(payload,task);});
ipcMain.on('notification:settings',event=>{if(trusted(event))openNotificationSettings();});
app.on('second-instance',show);
app.on('activate',show);
app.on('before-quit',()=>{quitting=true;});
app.on('window-all-closed',()=>{if(!tray)app.quit();});
app.whenReady().then(async()=>{
 load();
 if(!loadError&&!smoke&&data.notificationDeliveryVersion!==2){const previous=read(TASKS,[]);for(const task of previous)if(!task.done&&task.reminder!=='none'&&!task.reminderAcknowledged)task.systemNotifiedAt=null;data[TASKS]=JSON.stringify(previous);data.notificationDeliveryVersion=2;persist();}
 try{registerShortcuts()}catch(error){notificationError=error.message;logNotification('registration-failed',APP_ID,error.message)}
 const workArea=screen.getPrimaryDisplay().workAreaSize;
 const availableWidth=Math.max(320,workArea.width-48),availableHeight=Math.max(240,workArea.height-48);
 win=new BrowserWindow({width:Math.min(1180,availableWidth),height:Math.min(850,availableHeight),minWidth:Math.min(650,availableWidth),minHeight:Math.min(560,availableHeight),title:'Daymark',icon:appIcon(),show:!smoke,backgroundColor:'#f4f6f2',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false,autoplayPolicy:'no-user-gesture-required'}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',event=>event.preventDefault());
 win.webContents.session.setPermissionRequestHandler((_,__,callback)=>callback(false));
 win.on('close',event=>{if(!quitting&&!smoke){event.preventDefault();win.hide();}});
 const menu=[{label:'Daymark',submenu:[{label:'Show Daymark',click:show},{label:'System notification settings',click:()=>openNotificationSettings()},{type:'separator'},{label:'Quit Daymark',accelerator:'CmdOrCtrl+Q',click:()=>app.quit()}]},{label:'Edit',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},{label:'View',submenu:[{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'}]}];
 if(process.platform==='darwin'){menu[0].submenu.unshift({role:'about'},{type:'separator'});menu[1].submenu.push({type:'separator'},{role:'pasteAndMatchStyle'});}
 Menu.setApplicationMenu(Menu.buildFromTemplate(menu));
 if(!smoke){const trayImage=nativeImage.createFromPath(path.join(__dirname,'..','build',process.platform==='darwin'?'trayTemplate.png':'tray.png'));if(process.platform==='darwin')trayImage.setTemplateImage(true);tray=new Tray(trayImage);tray.setToolTip('Daymark · reminders are running');tray.setContextMenu(Menu.buildFromTemplate([{label:'Open Daymark',click:show},{label:'Quit Daymark',click:()=>app.quit()}]));tray.on('double-click',show);}
 win.webContents.on('console-message',event=>{if(smoke&&event.level>=2)console.error(event.message)});
 await win.loadFile(path.join(__dirname,'..','index.html'));
 if(smoke){if(!fs.existsSync(appIcon())||(process.platform==='win32'&&!fs.existsSync(appIcon('ico'))))throw new Error('Packaged icon resources are missing');const result=await win.webContents.executeJavaScript(`(()=>{const bridge=window.stillDesktop;const key='shixu-tasks-v1';const before=bridge.storage.getItem(key);bridge.storage.setItem(key,JSON.stringify([{id:'smoke',title:'Persistence check'}]));const persisted=JSON.parse(bridge.storage.getItem(key))[0].id==='smoke';bridge.storage.setItem(key,before||'[]');return JSON.stringify({title:document.title,bridge:!!bridge,status:document.querySelector('#notificationStatus').textContent,nativeSupported:bridge.notificationStatus().supported,form:!!document.querySelector('#taskDuration'),persisted,nodeIsolated:typeof require==='undefined'})})()`);console.log('STILL_SMOKE_RESULT '+result);app.quit();return;}
 powerMonitor.on('resume',scan);setInterval(scan,1000);scan();
});
