Add-Type -AssemblyName System.Drawing
Add-Type '
using System;
using System.Runtime.InteropServices;
public class NC {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint flags);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, int dx, int dy, uint data, IntPtr extra);
  public struct RECT { public int Left, Top, Right, Bottom; }
}'
$p = Get-Process 'ELDALY STREAM' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $p) { Write-Output 'no window'; exit 1 }
[NC]::SetForegroundWindow($p.MainWindowHandle) | Out-Null
Start-Sleep -Milliseconds 800
$r = New-Object NC+RECT
[NC]::GetWindowRect($p.MainWindowHandle, [ref]$r) | Out-Null
# Song Requests في القايمة
$x = $r.Left + 115
$y = $r.Top + 486
[NC]::SetCursorPos($x, $y) | Out-Null
Start-Sleep -Milliseconds 300
[NC]::mouse_event(0x0002, 0, 0, 0, [IntPtr]::Zero) | Out-Null
[NC]::mouse_event(0x0004, 0, 0, 0, [IntPtr]::Zero) | Out-Null
Start-Sleep -Milliseconds 3000
$bmp = New-Object System.Drawing.Bitmap(1400, 850)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$dc = $g.GetHdc()
[NC]::PrintWindow($p.MainWindowHandle, $dc, 2) | Out-Null
$g.ReleaseHdc($dc); $g.Dispose()
$bmp.Save("$env:TEMP\sr_213_check.png")
Write-Output "navigated + captured"
