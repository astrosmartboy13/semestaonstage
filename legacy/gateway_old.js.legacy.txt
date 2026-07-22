const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");

const app = express();

console.clear();

console.log("==================================");
console.log(" SIGNAL13 Gateway - OnTime");
console.log("==================================");
console.log("");

// =====================================================
// DASHBOARD
// =====================================================

app.use("/dashboard", express.static(path.join(__dirname, "dashboard")));

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/health", (req, res) => {
    res.json({
        status: "online",
        gateway: "SIGNAL13",
        ontime: "connected",
        version: "1.0"
    });
});

// =====================================================
// PROJECT API
// =====================================================

app.use("/api/project", createProxyMiddleware({

    target: "http://127.0.0.1:4001",

    changeOrigin: true,

    ws: true,

    pathRewrite: {
        "^/api/project": "/project"
    }

}));

// =====================================================
// TIMER
// =====================================================

app.use("/timer", createProxyMiddleware({

    target: "http://127.0.0.1:4001",

    changeOrigin: true,

    ws: true,

    xfwd: true,

    logLevel: "silent"

}));

// =====================================================
// BACKSTAGE
// =====================================================

app.use("/backstage", createProxyMiddleware({

    target: "http://127.0.0.1:4001",

    changeOrigin: true,

    ws: true,

    xfwd: true,

    logLevel: "silent"

}));

// =====================================================
// TIMELINE
// =====================================================

app.use("/timeline", createProxyMiddleware({

    target: "http://127.0.0.1:4001",

    changeOrigin: true,

    ws: true,

    xfwd: true,

    logLevel: "silent"

}));

// =====================================================
// STUDIO (EDITOR)
// =====================================================

app.use("/studio", createProxyMiddleware({

    target: "http://127.0.0.1:4001",

    changeOrigin: true,

    ws: true,

    xfwd: true,

    logLevel: "silent",

    pathRewrite: {
        "^/studio": "/editor"
    }

}));

// =====================================================
// ROOT
// =====================================================

app.get("/", (req, res) => {

res.send(`

<!DOCTYPE html>

<html>

<head>

<title>SIGNAL13 Gateway</title>

<style>

body{

background:#111;
color:#fff;
font-family:Arial;
padding:40px;

}

a{

display:block;
margin:12px 0;
font-size:20px;
color:#00d0ff;
text-decoration:none;

}

</style>

</head>

<body>

<h1>SIGNAL13 Gateway</h1>

<h2>OnTime</h2>

<a href="/timer/">Timer</a>

<a href="/backstage/">Backstage</a>

<a href="/timeline/">Timeline</a>

<a href="/studio/">Studio</a>

<hr>

<h2>SIGNAL13</h2>

<a href="/dashboard/">Dashboard</a>

</body>

</html>

`);

});

// =====================================================

app.listen(8080, () => {

console.log("Gateway Running");
console.log("");

console.log("Dashboard : http://127.0.0.1:8080/dashboard/");
console.log("Timer     : http://127.0.0.1:8080/timer/");
console.log("Backstage : http://127.0.0.1:8080/backstage/");
console.log("Timeline  : http://127.0.0.1:8080/timeline/");
console.log("Studio    : http://127.0.0.1:8080/studio/");
console.log("API       : http://127.0.0.1:8080/api/project");
console.log("");

});