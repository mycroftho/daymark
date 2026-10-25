# 手动迁移格式

本机仍使用 JSON 保存，跨设备可以导出 CSV 或 JSON。无需账号或云服务。

## CSV

- UTF-8 编码，导出带 BOM，兼容 Excel 的中文显示。
- 第一行为列名；逗号、双引号、多行 Notes 会正确加引号。
- 必填列：`title,date,time`，日期为 `YYYY-MM-DD`，时间为 24 小时制 `HH:mm`。
- `duration_minutes`：0–1440 的整数，0 表示未指定；结束时间自动计算。
- `id` 是稳定的任务 ID。迁移时保留此列，重复导入就不会反复新增。
- 没有 ID 的外部 CSV 会根据标题、日期、时间、地点生成稳定 ID；完全相同的重复行需要提供独立 ID。
- 可选列包括 `location,notes,category,priority,reminder,done,completed_at`。
- category：`none,class,meeting,personal,leisure`；priority：`normal,high,low`。
- reminder：`none,0,5,15,30`；done：`true,false`，也接受 `1,0`。
- 导出还保留提醒确认、延后和声音去重字段，适合未来手机版按同样格式实现。

导出的 `daymark_csv_version=1` 用于标识 Daymark CSV 转义规则。为避免电子表格执行文本公式，以 `= + - @` 等开头的文本会加保护前缀；Daymark 导入自己的文件时会无损移除前缀。外部 CSV 不应手动添加该版本列。

## JSON

导出包含 `format: "daymark"`、`version: 1`、导出时间、任务和偏好设置。任务导入支持此结构，也兼容早期的 `{tasks: [...]}` 和直接任务数组。当前导入合并任务，不覆盖本机外观、权限或声音偏好。

## 合并行为

默认 **Keep this device’s task**：相同 ID 保留本机任务，新增不存在的任务。

选择 **Update from imported file**：相同 ID 用导入版本更新，不同 ID 新增。不会删除文件中没有列出的本机任务。它是手动合并，不是双向同步；冲突由用户在导入前选择。

文件上限 10 MB、10,000 个任务。整份文件先验证后合并，格式错误不会部分写入或破坏现有任务。
