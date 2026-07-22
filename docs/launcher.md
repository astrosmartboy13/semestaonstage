# SIGNAL13 Launcher

## Source of Truth

Launcher operasional resmi SIGNAL13 adalah:

```text
Launcher_v2/
```

Owner entry points:

```text
Launcher_v2/#1_START_SIGNAL13.bat
Launcher_v2/#2_STOP_SIGNAL13.bat
Launcher_v2/#3_RESTART_SIGNAL13.bat
Launcher_v2/#4_STATUS_SIGNAL13.bat
```

Root shortcuts hanya menjadi shortcut tipis ke entry point di `Launcher_v2/`.

## Runtime Order

`#1_START_SIGNAL13.bat` mempertahankan urutan startup yang sudah terbukti bekerja:

1. Start OnTime.
2. Tunggu `http://localhost:4001/`.
3. Start Gateway.
4. Tunggu `http://localhost:8080/health`.
5. Start Cloudflare Tunnel.
6. Buka browser local dan online URLs.
7. Tampilkan `SIGNAL13 READY`.

## Configuration

Konfigurasi terpusat ada di:

```text
Launcher_v2/config.json
Launcher_v2/config.example.json
```

Konfigurasi lokal machine-specific boleh dibuat di:

```text
Launcher_v2/config.local.json
```

File lokal ini di-ignore oleh Git. Jangan menyimpan token, password, cookie, auth hash, session secret, atau Cloudflare credential di repository.

## State and Logs

Runtime state:

```text
Launcher_v2/state/state.json
```

Log:

```text
Launcher_v2/logs/launcher-YYYY-MM-DD.log
```

Kedua folder runtime ini di-ignore oleh Git.

## Browser Targets

Local:

```text
http://localhost:4001/editor/
http://localhost:4001/timer/
http://localhost:4001/backstage/
```

Online:

```text
https://dashboard.semestaonstage.com
https://timer.semestaonstage.com
https://admin.semestaonstage.com
```

Launcher tidak membuka `http://127.0.0.1:8080/dashboard/` sebagai default.

## Safe Stop

`#2_STOP_SIGNAL13.bat` memakai PID ownership dari `Launcher_v2/state/state.json`.

Default stop tidak boleh memakai broad kill seperti:

```text
taskkill /IM node.exe /F
taskkill /IM cloudflared.exe /F
taskkill /IM ontime.exe /F
```

Jika ownership tidak dapat dibuktikan, launcher melewati proses tersebut dan melaporkannya.

## Legacy Launcher

Lowercase launcher lama sudah bukan source of truth release. Semua root shortcut release memakai `Launcher_v2/`.

Jika folder duplicate lokal muncul kembali, folder tersebut harus dianggap artifact legacy dan tidak boleh menjadi workflow operasional.
