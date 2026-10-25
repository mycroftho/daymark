!macro customInstall
  WriteRegStr HKCU "Software\Classes\AppUserModelId\local.still.planner" "DisplayName" "Daymark"
  WriteRegStr HKCU "Software\Classes\AppUserModelId\local.still.planner" "IconUri" "$INSTDIR\resources\daymark-1.3.1.png"
  WriteRegStr HKCU "Software\Classes\AppUserModelId\local.still.planner" "CustomActivator" "{4A3D8FC1-7C62-4DA9-ACF6-11DC51D33725}"
  WriteRegStr HKCU "Software\Classes\CLSID\{4A3D8FC1-7C62-4DA9-ACF6-11DC51D33725}\LocalServer32" "" '$\"$INSTDIR\Daymark.exe$\" --toast-activation'
!macroend
!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\AppUserModelId\local.still.planner"
  DeleteRegKey HKCU "Software\Classes\CLSID\{4A3D8FC1-7C62-4DA9-ACF6-11DC51D33725}"
!macroend
