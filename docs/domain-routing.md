# SIGNAL13 Domain Routing

## Final Domain Map

| Hostname | Access | Target |
|---|---|---|
| `semestaonstage.com` | Public | Redirect atau serve Dashboard publik |
| `dashboard.semestaonstage.com` | Public | SIGNAL13 Dashboard |
| `timer.semestaonstage.com` | Public | OnTime `/timer/` |
| `backstage.semestaonstage.com` | Public | OnTime `/backstage/` |
| `timeline.semestaonstage.com` | Public | OnTime `/timeline/` |
| `studio.semestaonstage.com` | Public | OnTime `/studio/` |
| `editor.semestaonstage.com` | Protected | OnTime `/editor/` melalui Gateway auth |
| `admin.semestaonstage.com` | Protected | Semesta Control Center Admin |

Root domain `semestaonstage.com` tidak boleh membuka Editor dan tidak boleh meminta login.

## Public / Protected Matrix

Public:

- `semestaonstage.com`
- `dashboard.semestaonstage.com`
- `timer.semestaonstage.com`
- `backstage.semestaonstage.com`
- `timeline.semestaonstage.com`
- `studio.semestaonstage.com`
- Instagram
- `GET /api/event`
- `GET /api/status`

Protected:

- `admin.semestaonstage.com`
- `editor.semestaonstage.com`
- `PUT /api/event`
- `/login`
- `/logout`
- `/api/session`

Rundown access follows Google Sheets permissions.

## Dashboard Button Map

| Button | URL | Access |
|---|---|---|
| Dashboard | `https://dashboard.semestaonstage.com` | Public |
| Timer | `https://timer.semestaonstage.com` | Public |
| Backstage | `https://backstage.semestaonstage.com` | Public |
| Timeline | `https://timeline.semestaonstage.com` | Public |
| Studio | `https://studio.semestaonstage.com` | Public |
| Editor | `https://editor.semestaonstage.com` | Protected |
| Rundown | `event.json.rundownUrl` | Google permissions |
| Kendali Semesta | `https://admin.semestaonstage.com` | Protected |
| Instagram | `https://www.instagram.com/semesta.show` | Public |

Dashboard hamburger/three-stripe control opens `https://admin.semestaonstage.com` in a new tab with `rel="noopener noreferrer"`.

## Local OnTime Route Map

Validated route candidates:

- `/editor/`
- `/cuesheet/`
- `/operator/`
- `/timer/`
- `/backstage/`
- `/timeline/`
- `/studio/`
- `/countdown/`
- `/coundown/`

Both `/countdown/` and `/coundown/` must be audited against the running OnTime version before production operation because OnTime may serve a fallback document for unknown paths.

## Gateway Route Map

Gateway uses a combination of path-based routing and host-based routing:

- `/health`: Gateway health.
- `/api/status`: Runtime API v1.
- `GET /api/event`: public static event configuration.
- `PUT /api/event`: authenticated static event configuration write.
- `/dashboard/`: local Dashboard static route.
- `/admin/`: authenticated Admin static route.
- `/editor/`: authenticated proxy to OnTime `/editor/`.
- Other OnTime routes: reverse proxy to OnTime.

Host-based production routing:

- `semestaonstage.com`: redirect to `https://dashboard.semestaonstage.com`.
- `dashboard.semestaonstage.com`: Dashboard static route.
- `timer.semestaonstage.com`: OnTime `/timer/`.
- `backstage.semestaonstage.com`: OnTime `/backstage/`.
- `timeline.semestaonstage.com`: OnTime `/timeline/`.
- `studio.semestaonstage.com`: OnTime `/studio/`.
- `editor.semestaonstage.com`: authenticated OnTime `/editor/`.
- `admin.semestaonstage.com`: authenticated Admin.

## Cloudflare Ingress Map

Expected Cloudflare Tunnel ingress:

```yaml
ingress:
  - hostname: semestaonstage.com
    service: http://localhost:8080
  - hostname: dashboard.semestaonstage.com
    service: http://localhost:8080
  - hostname: timer.semestaonstage.com
    service: http://localhost:8080
  - hostname: backstage.semestaonstage.com
    service: http://localhost:8080
  - hostname: timeline.semestaonstage.com
    service: http://localhost:8080
  - hostname: studio.semestaonstage.com
    service: http://localhost:8080
  - hostname: editor.semestaonstage.com
    service: http://localhost:8080
  - hostname: admin.semestaonstage.com
    service: http://localhost:8080
  - service: http_status:404
```

Cloudflare Access may still be used as an additional protection layer for `admin.semestaonstage.com` and `editor.semestaonstage.com`, but Gateway authentication is implemented server-side in the repository.

## Launcher Auto-Open URLs

Launcher opens:

- `http://localhost:4001/editor/`
- `http://localhost:4001/timer/`
- `http://localhost:4001/backstage/`
- `https://dashboard.semestaonstage.com`
- `https://timer.semestaonstage.com`
- `https://admin.semestaonstage.com`

Launcher no longer opens `http://127.0.0.1:8080/dashboard/` by default.

## Authentication Flow

Protected resources redirect unauthenticated users to `/login`.

Login creates a server-side session and sends an HttpOnly cookie:

- `HttpOnly`
- `SameSite=Lax`
- `Secure` when the request is HTTPS or `X-Forwarded-Proto: https`
- session expiry: 8 hours

Logout invalidates the server-side session and clears the cookie.

## Credential Initialization

Tracked repository files do not contain the production password.

Create a local ignored config:

```powershell
node auth/generate-password-hash.js > auth/config.local.json
```

When prompted, enter the owner password.

The generated file contains:

- `username`
- secure `passwordHash`
- random `sessionSecret`

For the owner-requested initial account, use:

```text
username: adminsemesta
```

The password must be entered locally during hash generation and must not be committed.

Environment variable alternative:

```powershell
$env:SIGNAL13_ADMIN_USERNAME = "adminsemesta"
$env:SIGNAL13_ADMIN_PASSWORD_HASH = "scrypt:..."
$env:SIGNAL13_SESSION_SECRET = "random-secret"
```

## Online Verification Procedure

Run local stack, then verify:

```powershell
Invoke-WebRequest https://semestaonstage.com -MaximumRedirection 0
Invoke-WebRequest https://dashboard.semestaonstage.com
Invoke-WebRequest https://timer.semestaonstage.com
Invoke-WebRequest https://backstage.semestaonstage.com
Invoke-WebRequest https://timeline.semestaonstage.com
Invoke-WebRequest https://studio.semestaonstage.com
Invoke-WebRequest https://admin.semestaonstage.com
Invoke-WebRequest https://editor.semestaonstage.com
```

Expected unauthenticated result for protected domains: redirect/login or login page.

## Troubleshooting

If a public hostname fails:

1. Verify local target: `http://localhost:8080`.
2. Verify tunnel process is running.
3. Verify Cloudflare ingress hostname exists.
4. Verify DNS CNAME/route points to the tunnel.
5. Verify public HTTP status and redirect chain.

If protected hostnames are public:

1. Confirm traffic reaches Gateway, not direct OnTime.
2. Confirm `admin.semestaonstage.com` and `editor.semestaonstage.com` ingress targets are `http://localhost:8080`.
3. Confirm Gateway auth config is active.
4. Optionally enable Cloudflare Access as an outer protection layer.
