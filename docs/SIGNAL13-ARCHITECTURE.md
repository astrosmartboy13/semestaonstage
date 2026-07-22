# SIGNAL13 Architecture

## 1. Filosofi SIGNAL13

SIGNAL13 adalah Production Operating System untuk live production.

Filosofi utamanya sederhana: software harus membantu tim produksi mengambil keputusan lebih cepat, menjaga koordinasi tetap rapi, dan mengurangi risiko operasional saat show berjalan.

SIGNAL13 bukan sekadar dashboard visual. SIGNAL13 adalah lapisan kendali yang menghubungkan informasi, runtime service, launcher lokal, dan workflow produksi ke satu pusat operasi.

Prinsip dasar:

- Reliability lebih penting daripada fitur yang terlihat canggih.
- Status runtime harus berdasarkan deteksi nyata, bukan asumsi.
- Static configuration dan runtime state harus dipisahkan.
- Modul harus bisa berkembang tanpa saling merusak.
- UI harus mengikuti kebutuhan operator, bukan sekadar estetika.

## 2. Tujuan Sistem

Tujuan SIGNAL13:

- menyediakan pusat kendali untuk live event;
- menyatukan akses ke Dashboard, Timer, Backstage, Timeline, Studio, dan Editor;
- menyediakan Runtime API sebagai single source of truth status sistem;
- membantu operator melihat kondisi Gateway, Dashboard, OnTime, Tunnel, Launcher, dan Editor;
- menjaga konfigurasi event tetap mudah dibaca dan diubah;
- menjadi fondasi scalable untuk Admin, Mobile, dan integrasi produksi lain.

## 3. Diagram Arsitektur Modul

```text
                         +----------------------+
                         |      Operator        |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |      Dashboard       |
                         |  Pusat Kendali UI    |
                         +----------+-----------+
                                    |
                  Static config     | Runtime status
                  event.json        v
        +-------------------+   +----------------------+
        | dashboard/assets/ |   |       Gateway        |
        | data/event.json   |   |  Runtime API + Proxy |
        +-------------------+   +----+-----------+-----+
                                      |           |
                         /api/status  |           | Proxy routes
                         /health      |           v
                                      |   +----------------------+
                                      |   |        OnTime        |
                                      |   | Timer/Editor/etc.    |
                                      |   +----------------------+
                                      |
                   +------------------+------------------+
                   |                  |                  |
                   v                  v                  v
              +---------+        +---------+        +---------+
              | Tunnel  |        |Launcher |        | Admin   |
              | future  |        | local   |        | config  |
              +---------+        +---------+        +---------+
```

## 4. Tanggung Jawab Modul

### Gateway

Gateway adalah pusat runtime SIGNAL13.

Tanggung jawab:

- melayani static Dashboard di `/dashboard/`;
- menyediakan `/health`;
- menyediakan `/api/status`;
- menyediakan authenticated Admin dan Editor access;
- menyediakan authenticated `PUT /api/event`;
- menjadi reverse proxy ke OnTime;
- mengumpulkan status runtime service;
- menormalisasi status ke enum resmi;
- menghindari status online palsu;
- menyediakan hook untuk integrasi Tunnel dan Launcher;
- menyediakan Admin Event API untuk membaca dan menulis static configuration secara terkontrol.

Gateway tidak menjadikan konfigurasi event sebagai runtime state. Untuk Sprint 06, Gateway menjadi jalur server-side yang menulis `event.json` melalui Admin Event API.

### Dashboard

Dashboard adalah UI operator.

Tanggung jawab:

- membaca static configuration dari `event.json`;
- menampilkan informasi event;
- menyediakan quick access ke modul produksi;
- membaca Runtime API dari Gateway;
- menampilkan status runtime tanpa menebak sendiri;
- menjaga pengalaman operator tetap ringkas dan stabil.

Dashboard tidak boleh menjadi sumber kebenaran runtime.

### Launcher

Launcher adalah automation layer lokal untuk menjalankan SIGNAL13.

Tanggung jawab:

- menjalankan OnTime;
- menjalankan Gateway;
- menjalankan Tunnel bila diperlukan;
- menyediakan flow start/stop lokal;
- mencegah duplicate Gateway/Tunnel yang dimiliki launcher;
- menulis log operasional lokal;
- mencatat process ownership runtime di `Launcher_v2/state/state.json`.

Launcher tidak boleh menyimpan logika UI Dashboard.
Launcher bukan source of truth runtime; Gateway tetap menjadi pusat Runtime API.

### Admin

Admin adalah modul konfigurasi untuk operator atau engineer.

Tanggung jawab:

- mengelola konfigurasi event;
- mengirim perubahan static configuration melalui Gateway;
- memberi operator atau engineer kontrol administratif yang tidak perlu berada di Dashboard utama;
- di masa depan, mengelola integrasi dan melihat runtime diagnostics.

Admin harus menggunakan Runtime API, bukan membaca proses secara langsung jika Gateway sudah menyediakan data.

### Runtime API

Runtime API adalah kontrak resmi status runtime.

Tanggung jawab:

- menjadi single source of truth runtime;
- menyediakan status `overall`, `dashboard`, `gateway`, `ontime`, `tunnel`, `launcher`, dan `editor`;
- memakai enum `online`, `offline`, `unknown`;
- menyediakan response backward compatible;
- memisahkan runtime state dari static configuration.

Detail kontrak Runtime API terdokumentasi di `docs/runtime-api-v1.md`.

## 5. Data Flow

### Static Configuration

Static configuration adalah data event yang relatif stabil selama show.

Sumber utama:

```text
dashboard/assets/data/event.json
```

Contoh data:

- `project`
- `venue`
- `eventDate`
- `duration`
- `showDirector`
- `stageManager`
- `showStatus`
- `rundownUrl`
- version/build metadata

Alur:

```text
Admin -> Gateway /api/event -> event.json -> dashboard.js -> Dashboard DOM
```

Static configuration tidak boleh digunakan untuk menyatakan status service runtime.

### Runtime

Runtime adalah kondisi sistem saat aplikasi berjalan.

Sumber utama:

```text
Gateway -> /api/status
Gateway -> /health
```

Contoh data runtime:

- `overall`
- `dashboard`
- `gateway`
- `ontime`
- `tunnel`
- `launcher`
- `editor`
- `time`
- `version`

Alur:

```text
Gateway collectors -> status normalizer -> response builder -> /api/status
                                                          |
                                                          v
                                                     Dashboard
```

Runtime data tidak boleh disimpan permanen di `event.json`.

## 6. Aturan Komunikasi Antar Modul

Aturan umum:

- Dashboard membaca runtime hanya dari Gateway.
- Gateway membaca service runtime melalui collector/hook.
- Launcher boleh menjalankan service, tetapi status resminya harus mengalir melalui Gateway.
- Admin dan Mobile future harus menjadi consumer Runtime API.
- OnTime diakses melalui Gateway proxy untuk route operator.
- Static configuration tidak boleh dipakai sebagai pengganti runtime detection.

Aturan endpoint:

- `/dashboard/` melayani Dashboard.
- `/admin/` melayani Admin Foundation.
- `/health` hanya health Gateway.
- `/api/status` adalah pusat runtime.
- `/api/event` membaca dan menulis static configuration event.
- `/timer/`, `/backstage/`, `/timeline/`, `/studio/`, dan `/editor/` diproxy ke OnTime.

Aturan status:

- Status resmi hanya `online`, `offline`, `unknown`.
- Jika service belum bisa dideteksi, status harus `unknown`.
- Jangan mengembalikan `online` hanya karena route atau proxy ada.

## 7. Coding Rules

Aturan engineering:

- Jangan mencampur static configuration dan runtime state.
- Jangan hardcode domain production di Dashboard runtime logic.
- Gunakan endpoint relatif untuk consumer browser.
- Pisahkan collector, normalizer, dan response builder di Gateway.
- Tambahkan hook untuk service masa depan tanpa memecah kontrak lama.
- Pertahankan backward compatibility untuk API.
- Jangan melakukan redesign UI ketika mengerjakan fungsi runtime.
- Hindari refactor besar tanpa kebutuhan arsitektural yang jelas.
- Semua perubahan runtime harus punya validasi endpoint.

Aturan frontend:

- Dashboard tidak boleh menebak status service.
- Dashboard boleh menampilkan placeholder sederhana jika API belum memberi data.
- UI polish dilakukan setelah fungsi selesai.
- Visual lock tidak boleh berubah saat sprint integrasi fungsi.

Aturan Gateway:

- Gateway tidak boleh mengembalikan online palsu.
- Timeout dan error harus menghasilkan `offline` atau `unknown` sesuai konteks.
- Field baru harus additive dan backward compatible.

## 8. Struktur Folder

Struktur utama:

```text
SIGNAL13-DEV/
  gateway.js
  package.json
  dashboard/
    index.html
    README.md
    assets/
      css/
      data/
        event.json
      icons/
      images/
      js/
  Launcher_v2/
  server/
  docs/
    runtime-api-v1.md
    SIGNAL13-ARCHITECTURE.md
```

Peran folder:

| Folder/File | Peran |
|---|---|
| `gateway.js` | Gateway runtime, API, dan proxy utama. |
| `dashboard/` | UI Pusat Kendali Semesta. |
| `dashboard/assets/data/event.json` | Static event configuration. |
| `dashboard/assets/js/` | Client-side data binding, runtime polling, clock, config. |
| `Launcher_v2/` | Launcher operasional resmi untuk start, stop, restart, dan status. |
| `server/` | Server legacy/alternatif. |
| `docs/` | Dokumentasi arsitektur dan kontrak resmi. |

## 9. Roadmap

### Sprint Runtime

- Menjadikan Gateway single source of truth runtime.
- Menstabilkan `/api/status`.
- Menghubungkan Dashboard ke runtime Gateway.
- Menambah detector OnTime yang lebih kuat.
- Menambah hook Tunnel dan Launcher.

### Sprint Integration

- Integrasi Launcher status.
- Integrasi Tunnel status.
- Integrasi Admin.
- Validasi route proxy OnTime.
- Standarisasi konfigurasi runtime non-UI.

### Sprint UI Polish

- Typography refinement.
- Spacing refinement.
- Icon sizing.
- Color tuning.
- Hero refinement.
- Visual alignment.
- Responsive fine tuning.
- Pixel review terhadap mockup lock.

### Sprint Production Readiness

- Hardening error handling.
- Logging runtime.
- Deployment checklist.
- Domain and tunnel verification.
- Operator runbook.

## 10. Prinsip Pengembangan Agar Scalable

Prinsip utama:

- Build incrementally.
- Keep contracts stable.
- Prefer clear data ownership.
- Make runtime observable.
- Avoid hidden coupling.
- Separate UI, runtime, launcher, and configuration concerns.
- Add hooks before adding hacks.
- Document decisions when architecture changes.

Checklist setiap fitur baru:

- Apakah ini static configuration atau runtime state?
- Siapa producer datanya?
- Siapa consumer datanya?
- Apakah kontrak API tetap backward compatible?
- Apakah status memakai enum resmi?
- Apakah perubahan ini mengubah visual lock?
- Apakah fallback saat service mati jelas?
- Apakah dokumentasi perlu diperbarui?

SIGNAL13 harus tetap mudah dipahami oleh engineer berikutnya, aman untuk operator, dan cukup fleksibel untuk berkembang menjadi Production OS yang utuh.
