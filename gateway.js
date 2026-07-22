const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const fs = require("fs");
const crypto = require("crypto");
const http = require("http");
const https = require("https");
const path = require("path");

const app = express();

const GATEWAY_VERSION = "3.0";
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const ONTIME_BASE_URL = "http://127.0.0.1:4001";
const STATUS_TIMEOUT_MS = 1200;
const EVENT_CONFIG_PATH = path.join(__dirname, "dashboard", "assets", "data", "event.json");
const AUTH_CONFIG_PATH = path.join(__dirname, "auth", "config.local.json");
const EVENT_BODY_LIMIT = "32kb";
const SESSION_COOKIE = "signal13_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const LOGIN_WINDOW_MS = 1000 * 60 * 5;
const LOGIN_MAX_ATTEMPTS = 5;
const STATUS = {
    ONLINE: "online",
    OFFLINE: "offline",
    UNKNOWN: "unknown"
};
const SHOW_STATUS_VALUES = ["PRE-SHOW", "READY", "LIVE", "BREAK", "FINISHED"];
const EVENT_EDITABLE_FIELDS = [
    "project",
    "venue",
    "eventDate",
    "duration",
    "showDirector",
    "stageManager",
    "showStatus",
    "rundownUrl",
    "productionDocsUrl",
    "instagramUrl",
    "dashboardUrl",
    "timerUrl",
    "backstageUrl",
    "timelineUrl",
    "studioUrl",
    "editorUrl",
    "adminUrl"
];
const FORBIDDEN_EVENT_FIELDS = [
    "status",
    "systemStatus",
    "gateway",
    "dashboard",
    "ontime",
    "tunnel",
    "launcher",
    "editor",
    "overall",
    "lastChecked"
];
const POLLUTION_KEYS = ["__proto__", "prototype", "constructor"];
const ONTIME_VIEW_TITLES = {
    "/timer": "Pusat Kendali Semesta | Timer",
    "/backstage": "Pusat Kendali Semesta | Backstage",
    "/timeline": "Pusat Kendali Semesta | Timeline",
    "/studio": "Pusat Kendali Semesta | Studio",
    "/editor": "Pusat Kendali Semesta | Editor",
    "/operator": "Pusat Kendali Semesta | Operator",
    "/cuesheet": "Pusat Kendali Semesta | Cue Sheet",
    "/countdown": "Pusat Kendali Semesta | Countdown"
};
let eventWriteLock = Promise.resolve();
const sessions = new Map();
const loginAttempts = new Map();

app.use(express.json({ limit: EVENT_BODY_LIMIT }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

// ======================================================
// Runtime Status Normalizer
// ======================================================

function normalizeStatus(value) {
    const normalized = String(value || STATUS.UNKNOWN).trim().toLowerCase();

    if (normalized === STATUS.ONLINE || normalized === "true" || normalized === "ok" || normalized === "ready") {
        return STATUS.ONLINE;
    }

    if (normalized === STATUS.OFFLINE || normalized === "false" || normalized === "down" || normalized === "error") {
        return STATUS.OFFLINE;
    }

    return STATUS.UNKNOWN;
}

function normalizeServiceStatus(result) {
    if (!result || typeof result !== "object") {
        return STATUS.UNKNOWN;
    }

    return normalizeStatus(result.status);
}

// ======================================================
// Runtime Collector
// ======================================================

function requestUrl(targetUrl, timeoutMs = STATUS_TIMEOUT_MS) {
    return new Promise((resolve) => {
        const client = targetUrl.startsWith("https:") ? https : http;
        const request = client.request(targetUrl, { method: "GET", timeout: timeoutMs }, (response) => {
            response.resume();
            response.on("end", () => {
                resolve({
                    ok: response.statusCode >= 200 && response.statusCode < 500,
                    statusCode: response.statusCode
                });
            });
        });

        request.on("timeout", () => {
            request.destroy();
            resolve({ ok: false, error: "timeout" });
        });

        request.on("error", (error) => {
            resolve({ ok: false, error: error.code || error.message });
        });

        request.end();
    });
}

async function collectGatewayStatus() {
    return {
        status: STATUS.ONLINE
    };
}

async function collectDashboardStatus() {
    const indexPath = path.join(__dirname, "dashboard", "index.html");

    try {
        await fs.promises.access(indexPath, fs.constants.R_OK);
        return { status: STATUS.ONLINE };
    } catch (error) {
        return { status: STATUS.OFFLINE, error: "dashboard index not readable" };
    }
}

async function collectOnTimeStatus() {
    const result = await requestUrl(ONTIME_BASE_URL + "/");

    if (result.ok) {
        return { status: STATUS.ONLINE, statusCode: result.statusCode };
    }

    return { status: STATUS.OFFLINE, error: result.error || "unreachable" };
}

async function collectEditorStatus(ontimeStatus) {
    if (normalizeServiceStatus(ontimeStatus) === STATUS.OFFLINE) {
        return { status: STATUS.OFFLINE, dependency: "ontime" };
    }

    if (normalizeServiceStatus(ontimeStatus) === STATUS.UNKNOWN) {
        return { status: STATUS.UNKNOWN, dependency: "ontime" };
    }

    const result = await requestUrl(ONTIME_BASE_URL + "/editor/");

    if (result.ok) {
        return { status: STATUS.ONLINE, statusCode: result.statusCode };
    }

    return { status: STATUS.OFFLINE, error: result.error || "unreachable" };
}

async function collectTunnelStatus() {
    return {
        status: STATUS.UNKNOWN,
        reason: "tunnel status hook not implemented"
    };
}

async function collectLauncherStatus() {
    return {
        status: STATUS.UNKNOWN,
        reason: "launcher status hook not implemented"
    };
}

async function collectRuntimeStatus() {
    const [dashboard, gateway, ontime, tunnel, launcher] = await Promise.all([
        collectDashboardStatus(),
        collectGatewayStatus(),
        collectOnTimeStatus(),
        collectTunnelStatus(),
        collectLauncherStatus()
    ]);
    const editor = await collectEditorStatus(ontime);

    return {
        dashboard,
        gateway,
        ontime,
        tunnel,
        launcher,
        editor
    };
}

// ======================================================
// Response Builder
// ======================================================

function calculateOverallStatus(services) {
    const gateway = normalizeServiceStatus(services.gateway);
    const dashboard = normalizeServiceStatus(services.dashboard);
    const ontime = normalizeServiceStatus(services.ontime);

    if (gateway === STATUS.OFFLINE || dashboard === STATUS.OFFLINE || ontime === STATUS.OFFLINE) {
        return STATUS.OFFLINE;
    }

    if (gateway === STATUS.ONLINE && dashboard === STATUS.ONLINE && ontime === STATUS.ONLINE) {
        return STATUS.ONLINE;
    }

    return STATUS.UNKNOWN;
}

function buildStatusResponse(services) {
    const normalizedServices = {
        dashboard: normalizeServiceStatus(services.dashboard),
        gateway: normalizeServiceStatus(services.gateway),
        ontime: normalizeServiceStatus(services.ontime),
        tunnel: normalizeServiceStatus(services.tunnel),
        launcher: normalizeServiceStatus(services.launcher),
        editor: normalizeServiceStatus(services.editor)
    };

    return {
        overall: calculateOverallStatus(services),
        dashboard: normalizedServices.dashboard,
        gateway: normalizedServices.gateway,
        ontime: normalizedServices.ontime,
        tunnel: normalizedServices.tunnel,
        launcher: normalizedServices.launcher,
        editor: normalizedServices.editor,
        time: new Date().toISOString(),
        version: GATEWAY_VERSION
    };
}

// ======================================================
// Authentication
// ======================================================

function readAuthConfig() {
    const config = {
        username: process.env.SIGNAL13_ADMIN_USERNAME || "",
        passwordHash: process.env.SIGNAL13_ADMIN_PASSWORD_HASH || "",
        sessionSecret: process.env.SIGNAL13_SESSION_SECRET || ""
    };

    if (fs.existsSync(AUTH_CONFIG_PATH)) {
        try {
            const localConfig = JSON.parse(fs.readFileSync(AUTH_CONFIG_PATH, "utf8"));
            config.username = localConfig.username || config.username;
            config.passwordHash = localConfig.passwordHash || config.passwordHash;
            config.sessionSecret = localConfig.sessionSecret || config.sessionSecret;
        } catch (error) {
            return {
                enabled: false,
                error: "Auth config is invalid"
            };
        }
    }

    return {
        enabled: Boolean(config.username && config.passwordHash && config.sessionSecret),
        username: config.username,
        passwordHash: config.passwordHash,
        sessionSecret: config.sessionSecret,
        error: ""
    };
}

function parseCookies(req) {
    const cookies = {};
    const header = req.headers.cookie || "";

    header.split(";").forEach((part) => {
        const index = part.indexOf("=");
        if (index === -1) {
            return;
        }

        const key = part.slice(0, index).trim();
        const value = part.slice(index + 1).trim();
        cookies[key] = decodeURIComponent(value);
    });

    return cookies;
}

function isSecureRequest(req) {
    return req.secure || String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";
}

function createPasswordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return "scrypt:" + salt + ":" + hash;
}

function verifyPassword(password, storedHash) {
    const parts = String(storedHash || "").split(":");
    if (parts.length !== 3 || parts[0] !== "scrypt") {
        return false;
    }

    const expected = Buffer.from(parts[2], "hex");
    const actual = crypto.scryptSync(password, parts[1], expected.length);

    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function timingSafeStringEqual(left, right) {
    const leftBuffer = Buffer.from(String(left || ""));
    const rightBuffer = Buffer.from(String(right || ""));

    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function signSession(sessionId, secret) {
    return crypto.createHmac("sha256", secret).update(sessionId).digest("hex");
}

function createSession(authConfig) {
    const sessionId = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + SESSION_TTL_MS;

    sessions.set(sessionId, {
        createdAt: new Date().toISOString(),
        expiresAt
    });

    return {
        sessionId,
        expiresAt,
        value: sessionId + "." + signSession(sessionId, authConfig.sessionSecret)
    };
}

function getSession(req) {
    const authConfig = readAuthConfig();
    if (!authConfig.enabled) {
        return null;
    }

    const raw = parseCookies(req)[SESSION_COOKIE];
    if (!raw) {
        return null;
    }

    const parts = raw.split(".");
    if (parts.length !== 2) {
        return null;
    }

    const expected = signSession(parts[0], authConfig.sessionSecret);
    const received = Buffer.from(parts[1]);
    const expectedBuffer = Buffer.from(expected);

    if (received.length !== expectedBuffer.length || !crypto.timingSafeEqual(received, expectedBuffer)) {
        return null;
    }

    const session = sessions.get(parts[0]);
    if (!session || session.expiresAt < Date.now()) {
        sessions.delete(parts[0]);
        return null;
    }

    return {
        id: parts[0],
        expiresAt: session.expiresAt
    };
}

function setSessionCookie(req, res, session) {
    const cookie = [
        SESSION_COOKIE + "=" + encodeURIComponent(session.value),
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=" + Math.floor(SESSION_TTL_MS / 1000)
    ];

    if (isSecureRequest(req)) {
        cookie.push("Secure");
    }

    res.setHeader("Set-Cookie", cookie.join("; "));
}

function clearSessionCookie(res) {
    res.setHeader("Set-Cookie", SESSION_COOKIE + "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}

function requireAuth(req, res, next) {
    const authConfig = readAuthConfig();

    if (!authConfig.enabled) {
        res.status(503).send("SIGNAL13 authentication is not configured.");
        return;
    }

    if (getSession(req)) {
        next();
        return;
    }

    if (req.path.startsWith("/api/")) {
        res.status(401).json(buildError("AUTH_REQUIRED", "Authentication required"));
        return;
    }

    res.redirect(302, "/login?next=" + encodeURIComponent(req.originalUrl || "/admin/"));
}

function recordLoginFailure(req) {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const current = loginAttempts.get(key) || { count: 0, firstAt: now };

    if (now - current.firstAt > LOGIN_WINDOW_MS) {
        current.count = 0;
        current.firstAt = now;
    }

    current.count += 1;
    loginAttempts.set(key, current);

    return current;
}

function isLoginThrottled(req) {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const current = loginAttempts.get(key);

    return Boolean(current && current.count >= LOGIN_MAX_ATTEMPTS && Date.now() - current.firstAt <= LOGIN_WINDOW_MS);
}

function resetLoginAttempts(req) {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    loginAttempts.delete(key);
}

function renderLoginPage(errorMessage = "", nextPath = "/admin/") {
    const normalizedNext = String(nextPath || "/admin/");
    const safePath = normalizedNext.startsWith("/") && !normalizedNext.startsWith("//") ? normalizedNext : "/admin/";
    const safeNext = safePath.replace(/"/g, "&quot;");
    const error = errorMessage ? '<p class="error">' + errorMessage + "</p>" : "";

    return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SIGNAL13 Login</title>
<style>
body{font-family:Arial,sans-serif;background:#111;color:#f7f0df;display:grid;min-height:100vh;place-items:center;margin:0}
form{width:min(360px,90vw);background:#1c1a16;border:1px solid #7a6334;padding:24px}
label{display:block;margin:14px 0}
input{box-sizing:border-box;width:100%;padding:10px;margin-top:6px}
button{padding:10px 14px;background:#caa45d;border:0;color:#111;font-weight:700}
.error{color:#ffb4a8}
</style>
</head>
<body>
<form method="post" action="/login">
<h1>SIGNAL13 Admin</h1>
${error}
<input type="hidden" name="next" value="${safeNext}">
<label>Username<input name="username" autocomplete="username" required></label>
<label>Password<input name="password" type="password" autocomplete="current-password" required></label>
<button type="submit">Login</button>
</form>
</body>
</html>`;
}

function hostname(req) {
    return String(req.headers.host || "").split(":")[0].toLowerCase();
}

function isApiOrHealthPath(pathname) {
    return pathname === "/health" || pathname.startsWith("/api/") || pathname === "/login" || pathname === "/logout";
}

function routeToPrefixedPath(req, prefix) {
    req.url = req.url.startsWith(prefix) ? req.url : prefix + (req.url === "/" ? "/" : req.url);
}

function routeToOnTimeView(req, prefix) {
    if (req.path === "/" || req.path === prefix || req.path.startsWith(prefix + "/")) {
        routeToPrefixedPath(req, prefix);
    }
}

function redirectOnTimeRoot(req, res, prefix) {
    if (req.path !== "/") {
        return false;
    }

    const queryIndex = req.originalUrl.indexOf("?");
    const queryString = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : "";
    res.redirect(302, `${prefix}/${queryString}`);
    return true;
}

function normalizeOnTimeViewPath(pathname) {
    return String(pathname || "").replace(/\/$/, "");
}

function getOnTimeViewTitle(pathname) {
    return ONTIME_VIEW_TITLES[normalizeOnTimeViewPath(pathname)] || "";
}

function brandOnTimeDocument(html, title) {
    const marker = "<!-- TEMPORARY BRANDING: Upstream OnTime UI assets remain until official Illustrator assets are applied. -->";
    const metadata = '<meta name="signal13-temporary-branding" content="ontime-upstream-assets">';
    let brandedHtml = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);

    if (brandedHtml === html) {
        brandedHtml = brandedHtml.replace(/<head[^>]*>/i, (match) => `${match}\n    <title>${title}</title>`);
    }

    if (!brandedHtml.includes("signal13-temporary-branding")) {
        brandedHtml = brandedHtml.replace(/<\/head>/i, `    ${marker}\n    ${metadata}\n</head>`);
    }

    return brandedHtml;
}

function proxyOnTimeDocument(req, res, next) {
    if (req.method !== "GET") {
        next();
        return;
    }

    const title = getOnTimeViewTitle(req.path);
    if (!title) {
        next();
        return;
    }

    const upstreamUrl = new URL(req.originalUrl, ONTIME_BASE_URL);
    const client = upstreamUrl.protocol === "https:" ? https : http;
    const upstreamRequest = client.get(upstreamUrl, (upstreamResponse) => {
        let body = "";
        const contentType = upstreamResponse.headers["content-type"] || "";

        upstreamResponse.setEncoding("utf8");
        upstreamResponse.on("data", (chunk) => {
            body += chunk;
        });
        upstreamResponse.on("end", () => {
            if (!contentType.includes("text/html")) {
                res.status(upstreamResponse.statusCode || 200);
                res.setHeader("Content-Type", contentType || "text/plain; charset=utf-8");
                res.end(body);
                return;
            }

            res.status(upstreamResponse.statusCode || 200);
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(brandOnTimeDocument(body, title));
        });
    });

    upstreamRequest.on("error", () => {
        res.status(503).type("text/plain").send("SIGNAL13 Gateway: OnTime is offline or unreachable.");
    });
}

function isProtectedHost(host) {
    return host === "admin.semestaonstage.com" ||
        host === "editor.semestaonstage.com" ||
        host === "operator.semestaonstage.com" ||
        host === "cuesheet.semestaonstage.com" ||
        host === "countdown.semestaonstage.com";
}

function mapHostToRoute(req, res, next) {
    const host = hostname(req);

    if (host === "semestaonstage.com") {
        res.redirect(302, "https://dashboard.semestaonstage.com");
        return;
    }

    if (isProtectedHost(host) && req.path.startsWith("/api/")) {
        requireAuth(req, res, next);
        return;
    }

    if (host === "dashboard.semestaonstage.com" && !isApiOrHealthPath(req.path)) {
        routeToPrefixedPath(req, "/dashboard");
        next();
        return;
    }

    const publicOnTimeHosts = {
        "timer.semestaonstage.com": "/timer",
        "backstage.semestaonstage.com": "/backstage",
        "timeline.semestaonstage.com": "/timeline",
        "studio.semestaonstage.com": "/studio"
    };

    if (publicOnTimeHosts[host] && !isApiOrHealthPath(req.path)) {
        if (redirectOnTimeRoot(req, res, publicOnTimeHosts[host])) {
            return;
        }

        routeToOnTimeView(req, publicOnTimeHosts[host]);
        next();
        return;
    }

    const protectedOnTimeHosts = {
        "editor.semestaonstage.com": "/editor",
        "operator.semestaonstage.com": "/operator",
        "cuesheet.semestaonstage.com": "/cuesheet",
        "countdown.semestaonstage.com": "/countdown"
    };

    if (protectedOnTimeHosts[host] && !isApiOrHealthPath(req.path)) {
        requireAuth(req, res, () => {
            if (redirectOnTimeRoot(req, res, protectedOnTimeHosts[host])) {
                return;
            }

            routeToOnTimeView(req, protectedOnTimeHosts[host]);
            next();
        });
        return;
    }

    if (host === "admin.semestaonstage.com" && !isApiOrHealthPath(req.path)) {
        requireAuth(req, res, () => {
            routeToPrefixedPath(req, "/admin");
            next();
        });
        return;
    }

    next();
}

// ======================================================
// Admin Event Configuration
// ======================================================

function buildError(code, message, fields = {}) {
    return {
        ok: false,
        error: {
            code,
            message,
            fields
        }
    };
}

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasUnsafeKey(payload) {
    return Object.keys(payload).some((key) => POLLUTION_KEYS.includes(key));
}

async function readEventConfig() {
    const raw = await fs.promises.readFile(EVENT_CONFIG_PATH, "utf8");
    return JSON.parse(raw);
}

function validateStringField(payload, field, options = {}) {
    const fields = {};
    const value = payload[field];

    if (value === undefined) {
        if (options.required) {
            fields[field] = "Field is required";
        }

        return { fields };
    }

    if (typeof value !== "string") {
        fields[field] = "Must be a string";
        return { fields };
    }

    const trimmed = value.trim();

    if (options.required && !trimmed) {
        fields[field] = "Cannot be empty";
    }

    return {
        fields,
        value: trimmed
    };
}

function isValidDateString(value) {
    if (!value) {
        return true;
    }

    const date = new Date(value);
    return !Number.isNaN(date.getTime());
}

function isValidHttpUrl(value) {
    if (!value) {
        return true;
    }

    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (error) {
        return false;
    }
}

function validateEventPayload(payload) {
    const errors = {};
    const sanitized = {};

    if (!isPlainObject(payload)) {
        return {
            ok: false,
            errors: {
                payload: "Payload must be a JSON object"
            }
        };
    }

    if (hasUnsafeKey(payload)) {
        return {
            ok: false,
            errors: {
                payload: "Payload contains reserved keys"
            }
        };
    }

    Object.keys(payload).forEach((key) => {
        if (FORBIDDEN_EVENT_FIELDS.includes(key)) {
            errors[key] = "Runtime fields cannot be written to event config";
            return;
        }

        if (!EVENT_EDITABLE_FIELDS.includes(key)) {
            errors[key] = "Unsupported field";
        }
    });

    EVENT_EDITABLE_FIELDS.forEach((field) => {
        const required = field === "project";
        const result = validateStringField(payload, field, { required });

        Object.assign(errors, result.fields);

        if (result.value !== undefined) {
            sanitized[field] = result.value;
        }
    });

    if (sanitized.eventDate !== undefined && !isValidDateString(sanitized.eventDate)) {
        errors.eventDate = "Must be a valid date string or empty";
    }

    if (sanitized.showStatus !== undefined) {
        sanitized.showStatus = sanitized.showStatus.toUpperCase();

        if (!SHOW_STATUS_VALUES.includes(sanitized.showStatus)) {
            errors.showStatus = "Must be one of " + SHOW_STATUS_VALUES.join(", ");
        }
    }

    [
        "rundownUrl",
        "productionDocsUrl",
        "instagramUrl",
        "dashboardUrl",
        "timerUrl",
        "backstageUrl",
        "timelineUrl",
        "studioUrl",
        "editorUrl",
        "adminUrl"
    ].forEach((field) => {
        if (sanitized[field] !== undefined && !isValidHttpUrl(sanitized[field])) {
            errors[field] = "Must be an http/https URL or empty";
        }
    });

    return {
        ok: Object.keys(errors).length === 0,
        errors,
        value: sanitized
    };
}

function mergeEventConfig(existingConfig, sanitizedConfig) {
    const nextConfig = {};

    Object.keys(existingConfig).forEach((key) => {
        if (POLLUTION_KEYS.includes(key) || FORBIDDEN_EVENT_FIELDS.includes(key)) {
            return;
        }

        nextConfig[key] = existingConfig[key];
    });

    EVENT_EDITABLE_FIELDS.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(sanitizedConfig, field)) {
            nextConfig[field] = sanitizedConfig[field];
        }
    });

    return nextConfig;
}

async function writeJsonAtomic(filePath, data) {
    const dir = path.dirname(filePath);
    const tempPath = path.join(dir, ".event." + process.pid + "." + Date.now() + ".tmp");
    const json = JSON.stringify(data, null, 2) + "\n";

    JSON.parse(json);
    await fs.promises.writeFile(tempPath, json, "utf8");
    await fs.promises.rename(tempPath, filePath);
}

function enqueueEventWrite(task) {
    eventWriteLock = eventWriteLock.then(task, task);
    return eventWriteLock;
}

app.get("/login", (req, res) => {
    if (getSession(req)) {
        res.redirect(302, req.query.next || "/admin/");
        return;
    }

    res.send(renderLoginPage("", req.query.next || "/admin/"));
});

app.post("/login", (req, res) => {
    const authConfig = readAuthConfig();
    const nextPath = req.body.next || "/admin/";

    if (!authConfig.enabled) {
        res.status(503).send(renderLoginPage("Authentication is not configured.", nextPath));
        return;
    }

    if (isLoginThrottled(req)) {
        res.status(429).send(renderLoginPage("Too many login attempts. Try again later.", nextPath));
        return;
    }

    const usernameOk = timingSafeStringEqual(req.body.username, authConfig.username);
    const passwordOk = verifyPassword(String(req.body.password || ""), authConfig.passwordHash);

    if (!usernameOk || !passwordOk) {
        recordLoginFailure(req);
        res.status(401).send(renderLoginPage("Invalid username or password.", nextPath));
        return;
    }

    resetLoginAttempts(req);
    const session = createSession(authConfig);
    setSessionCookie(req, res, session);
    res.redirect(302, nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/admin/");
});

app.post("/logout", (req, res) => {
    const session = getSession(req);
    if (session) {
        sessions.delete(session.id);
    }

    clearSessionCookie(res);
    res.redirect(302, "/login");
});

app.get("/api/session", (req, res) => {
    const session = getSession(req);
    res.json({
        authenticated: Boolean(session),
        expiresAt: session ? new Date(session.expiresAt).toISOString() : null
    });
});

app.use(mapHostToRoute);

// ======================================================
// SIGNAL13 Dashboard
// ======================================================

app.use(
    "/dashboard",
    express.static(path.join(__dirname, "dashboard"))
);

app.use(
    ["/admin", "/admin/"],
    requireAuth,
    express.static(path.join(__dirname, "admin"))
);

// ======================================================
// SIGNAL13 API
// ======================================================

app.get("/health", async (req, res) => {

    const gateway = await collectGatewayStatus();

    res.json({
        status: normalizeServiceStatus(gateway),
        server: "SIGNAL13",
        service: "gateway",
        version: GATEWAY_VERSION,
        time: new Date().toISOString()
    });

});

app.get("/api/status", async (req, res) => {

    const services = await collectRuntimeStatus();

    res.json(buildStatusResponse(services));

});

app.get("/api/event", async (req, res) => {

    try {
        const eventConfig = await readEventConfig();
        res.json(eventConfig);
    } catch (error) {
        res.status(500).json(buildError("EVENT_READ_ERROR", "Unable to read event configuration"));
    }

});

app.put("/api/event", requireAuth, async (req, res) => {

    if (!req.is("application/json")) {
        res.status(415).json(buildError("UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json"));
        return;
    }

    const validation = validateEventPayload(req.body);

    if (!validation.ok) {
        res.status(400).json(buildError("VALIDATION_ERROR", "Event configuration is invalid", validation.errors));
        return;
    }

    try {
        const savedConfig = await enqueueEventWrite(async () => {
            const existingConfig = await readEventConfig();
            const nextConfig = mergeEventConfig(existingConfig, validation.value);

            await writeJsonAtomic(EVENT_CONFIG_PATH, nextConfig);
            return nextConfig;
        });

        res.json({
            ok: true,
            event: savedConfig
        });
    } catch (error) {
        res.status(500).json(buildError("EVENT_WRITE_ERROR", "Unable to save event configuration"));
    }

});

app.use((error, req, res, next) => {
    if (!error) {
        next();
        return;
    }

    if (error.type === "entity.too.large") {
        res.status(413).json(buildError("PAYLOAD_TOO_LARGE", "Request body is too large"));
        return;
    }

    if (error instanceof SyntaxError && Object.prototype.hasOwnProperty.call(error, "body")) {
        res.status(400).json(buildError("INVALID_JSON", "Request body must be valid JSON"));
        return;
    }

    res.status(400).json(buildError("BAD_REQUEST", "Request could not be processed"));
});

// ======================================================
// Reverse Proxy
// Semua route selain dashboard akan diteruskan ke OnTime
// ======================================================

const ontimeProxy = createProxyMiddleware({

    target: ONTIME_BASE_URL,

    changeOrigin: true,

    ws: true,

    xfwd: true,

    logLevel: "warn",

    on: {
        error: (error, req, res) => {
            if (res.headersSent) {
                return;
            }

            res.statusCode = 503;

            if (req.path.startsWith("/api/")) {
                res.setHeader("Content-Type", "application/json; charset=utf-8");
                res.end(JSON.stringify(buildError(
                    "ONTIME_UNAVAILABLE",
                    "OnTime is offline or unreachable"
                )));
                return;
            }

            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end("SIGNAL13 Gateway: OnTime is offline or unreachable.");
        }
    }

});

app.get(
    [
        "/timer", "/timer/",
        "/backstage", "/backstage/",
        "/timeline", "/timeline/",
        "/studio", "/studio/",
        "/operator", "/operator/",
        "/cuesheet", "/cuesheet/",
        "/countdown", "/countdown/"
    ],
    proxyOnTimeDocument
);

app.get(["/editor", "/editor/"], requireAuth, proxyOnTimeDocument);

app.use("/editor", requireAuth, ontimeProxy);

// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {

res.send(`

<!DOCTYPE html>

<html>

<head>

<meta charset="utf-8">

<title>SIGNAL13 Gateway</title>

<style>

body{

background:#111;

color:white;

font-family:Arial;

padding:40px;

}

a{

display:block;

margin:12px 0;

font-size:22px;

color:#59b8ff;

text-decoration:none;

}

</style>

</head>

<body>

<h1>SIGNAL13 Gateway</h1>

<hr>

<a href="/dashboard/">Dashboard</a>

<a href="/admin/">Admin</a>

<a href="/timer/">Timer</a>

<a href="/editor/">Editor</a>

<a href="/backstage/">Backstage</a>

<a href="/timeline/">Timeline</a>

<a href="/studio/">Studio</a>

<hr>

<a href="/health">Health</a>

<a href="/api/status">Status</a>

</body>

</html>

`);

});

// ======================================================
// Reverse Proxy
// HARUS PALING BAWAH
// ======================================================

app.use("/", ontimeProxy);

// ======================================================

const gatewayServer = app.listen(PORT, HOST, () => {

console.log("");

console.log("========================================");

console.log(" SIGNAL13 Gateway v3.0");

console.log("========================================");

console.log("");

console.log(`Dashboard : http://127.0.0.1:${PORT}/dashboard/`);

console.log(`Timer     : http://127.0.0.1:${PORT}/timer/`);

console.log(`Editor    : http://127.0.0.1:${PORT}/editor/`);

console.log(`Backstage : http://127.0.0.1:${PORT}/backstage/`);

console.log(`Timeline  : http://127.0.0.1:${PORT}/timeline/`);

console.log(`Studio    : http://127.0.0.1:${PORT}/studio/`);

console.log("");

});
