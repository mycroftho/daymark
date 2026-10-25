function dueTasks(tasks, now = Date.now()) {
  return tasks.filter(task => {
    if (task.done || task.reminder === 'none' || task.reminderAcknowledged) return false;
    const due = task.snoozedUntil ? Date.parse(task.snoozedUntil) : Date.parse(task.date + 'T' + task.time) - Number(task.reminder) * 60000;
    return Number.isFinite(due) && now >= due && !task.systemNotifiedAt;
  });
}
function notificationsEnabled(settings={}) {
  return settings.desktopNotifications !== false;
}
module.exports = {dueTasks,notificationsEnabled};
