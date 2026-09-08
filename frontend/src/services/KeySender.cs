using System;
using System.Runtime.InteropServices;
using System.Threading;

// Sends keys as REAL hardware-like input via SendInput with scan codes.
// Scan codes are required for games that read the keyboard through
// DirectInput/RawInput (Roblox, GTA, most 3D games) — they ignore
// virtual-key-only events (keybd_event with bScan=0).
class Program {
    [StructLayout(LayoutKind.Sequential)]
    struct KEYBDINPUT {
        public ushort wVk;
        public ushort wScan;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct MOUSEINPUT {
        public int dx;
        public int dy;
        public uint mouseData;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Explicit)]
    struct INPUTUNION {
        [FieldOffset(0)] public MOUSEINPUT mi;
        [FieldOffset(0)] public KEYBDINPUT ki;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct INPUT {
        public uint type;
        public INPUTUNION u;
    }

    [DllImport("user32.dll", SetLastError = true)]
    static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    [DllImport("user32.dll")]
    static extern uint MapVirtualKey(uint uCode, uint uMapType);

    const uint INPUT_KEYBOARD = 1;
    const uint KEYEVENTF_KEYUP = 0x0002;
    const uint KEYEVENTF_EXTENDEDKEY = 0x0001;
    const uint KEYEVENTF_SCANCODE = 0x0008;
    const uint MAPVK_VK_TO_VSC = 0;

    // Keys whose scancode needs the E0 extended prefix (arrows, nav cluster,
    // numpad-divide, right modifiers...) — without the flag games read them wrong.
    static bool IsExtendedKey(ushort vk) {
        return vk == 0x03   // Cancel/Break
            || (vk >= 0x21 && vk <= 0x28)  // PGUP PGDN END HOME LEFT UP RIGHT DOWN
            || vk == 0x2C   // PrintScreen
            || vk == 0x2D   // Insert
            || vk == 0x2E   // Delete
            || vk == 0x6F   // Numpad Divide
            || vk == 0x90   // NumLock
            || vk == 0xA3   // Right Ctrl
            || vk == 0xA4;  // Right Alt
    }

    static INPUT MakeInput(ushort vk, bool keyUp) {
        INPUT inp = new INPUT();
        uint scan = MapVirtualKey(vk, MAPVK_VK_TO_VSC);
        if (scan == 0) return inp; // unmapped — caller skips it
        inp.type = INPUT_KEYBOARD;
        inp.u.ki.wVk = 0;                       // scan-code mode: wVk must stay 0
        inp.u.ki.wScan = (ushort)scan;
        uint flags = KEYEVENTF_SCANCODE;
        if (IsExtendedKey(vk)) flags |= KEYEVENTF_EXTENDEDKEY;
        if (keyUp) flags |= KEYEVENTF_KEYUP;
        inp.u.ki.dwFlags = flags;
        inp.u.ki.time = 0;
        inp.u.ki.dwExtraInfo = IntPtr.Zero;
        return inp;
    }

    static void Main(string[] args) {
        if (args.Length < 1) return;
        string[] parts = args[0].Split(',');
        int holdMs = 0;
        if (args.Length > 1) int.TryParse(args[1], out holdMs);

        ushort[] vks = new ushort[parts.Length];
        int n = 0;
        foreach (string p in parts) {
            ushort vk;
            if (ushort.TryParse(p.Trim(), out vk) && vk > 0 && MapVirtualKey(vk, MAPVK_VK_TO_VSC) != 0)
                vks[n++] = vk;
        }
        if (n == 0) return;

        INPUT[] downs = new INPUT[n];
        INPUT[] ups = new INPUT[n];
        for (int i = 0; i < n; i++) {
            downs[i] = MakeInput(vks[i], false);
            ups[i] = MakeInput(vks[n - 1 - i], true); // release in reverse order
        }

        // One atomic SendInput per phase — no interleaving with real input
        SendInput((uint)n, downs, Marshal.SizeOf(typeof(INPUT)));
        Thread.Sleep(holdMs > 0 ? holdMs : 20); // small hold helps DirectX games
        SendInput((uint)n, ups, Marshal.SizeOf(typeof(INPUT)));
    }
}
