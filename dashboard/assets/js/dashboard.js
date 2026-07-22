const Signal13Dashboard = (function () {
    const eventDataUrl = "assets/data/event.json";

    const fallbackData = {
        project: "Semesta On Stage",
        venue: "Venue TBA",
        eventDate: "",
        duration: "00:00:00",
        showDirector: "TBA",
        stageManager: "TBA",
        status: "unknown",
        showStatus: "READY",
        rundownUrl: "",
        rundown: [],
        systemStatus: [
            { service: "Dashboard", status: "online" },
            { service: "Gateway", status: "unknown" },
            { service: "OnTime", status: "unknown" },
            { service: "Tunnel", status: "unknown" }
        ],
        product: "Pusat Kendali Semesta",
        version: "v1.0.0"
    };

    async function loadEventData() {
        const response = await fetch(eventDataUrl);

        if (!response.ok) {
            throw new Error("Event data failed to load");
        }

        return response.json();
    }

    function resolveQuickAccessUrl(key, data) {
        const eventUrlFields = {
            dashboard: "dashboardUrl",
            stageTimer: "timerUrl",
            backstage: "backstageUrl",
            timeline: "timelineUrl",
            studio: "studioUrl",
            editor: "editorUrl",
            controlCenter: "adminUrl"
        };

        if (key === "rundown" && data.rundownUrl) {
            return data.rundownUrl;
        }

        if (key === "instagram" && data.instagramUrl) {
            return data.instagramUrl;
        }

        if (eventUrlFields[key] && data[eventUrlFields[key]]) {
            return data[eventUrlFields[key]];
        }

        if (!window.SIGNAL13 || !window.SIGNAL13[key]) {
            return "#";
        }

        const target = window.SIGNAL13[key];
        if (typeof target === "string" && /^https?:\/\//i.test(target)) {
            return target;
        }

        if (typeof target === "string" && target.startsWith("/")) {
            return target;
        }

        return getLink(target);
    }

    function formatShowDate(dateValue) {
        if (!dateValue) {
            return "-";
        }

        const date = new Date(dateValue);
        if (isNaN(date.getTime())) {
            return dateValue;
        }

        return date.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });
    }

    function normalizeShowStatus(status) {
        const value = String(status || "READY").trim().toUpperCase();
        const allowedStatus = ["PRE-SHOW", "READY", "LIVE", "BREAK", "FINISHED"];

        if (allowedStatus.indexOf(value) === -1) {
            return "READY";
        }

        return value;
    }

    function renderQuickAccess(data) {
        const links = document.querySelectorAll("[data-link-key]");

        links.forEach(function (link) {
            const key = link.dataset.linkKey;
            const href = resolveQuickAccessUrl(key, data);
            const isExternal = /^https?:\/\//i.test(href);

            link.setAttribute("href", href);

            if (isExternal) {
                link.setAttribute("target", "_blank");
                link.setAttribute("rel", "noreferrer noopener");
            } else {
                link.removeAttribute("target");
                link.removeAttribute("rel");
            }
        });
    }

    function renderDashboard(data) {
        const eventData = Object.assign({}, fallbackData, data);
        const showStatus = normalizeShowStatus(eventData.showStatus);

        Signal13UI.setText("event-name", eventData.project, fallbackData.project);
        Signal13UI.setText("project", eventData.project, fallbackData.project);
        Signal13UI.setText("project-title", eventData.project, fallbackData.project);
        Signal13UI.setText("venue", eventData.venue, fallbackData.venue);
        Signal13UI.setText("event-date", eventData.eventDate, "Date TBA");
        Signal13UI.setDateTime("event-date", eventData.eventDate);
        Signal13UI.setText("total-duration", eventData.duration, fallbackData.duration);
        Signal13UI.setText("duration", eventData.duration, fallbackData.duration);
        Signal13UI.setText("show-date", formatShowDate(eventData.eventDate), fallbackData.eventDate);
        Signal13UI.setText("director", eventData.showDirector, fallbackData.showDirector);
        Signal13UI.setText("show-director", eventData.showDirector, fallbackData.showDirector);
        Signal13UI.setText("stageManager", eventData.stageManager, fallbackData.stageManager);
        Signal13UI.setText("stage-manager", eventData.stageManager, fallbackData.stageManager);
        Signal13UI.setText("show-status", showStatus, fallbackData.showStatus);
        Signal13UI.setText("show-status-badge", showStatus, fallbackData.showStatus);
        Signal13UI.setText("system-version", eventData.version, fallbackData.version);
        Signal13UI.setText("sidebar-version", eventData.version, fallbackData.version);

        Signal13UI.setShowStatus("#show-status-badge", showStatus);
        renderQuickAccess(eventData);
    }

    async function initDashboard() {
        try {
            const data = await loadEventData();
            renderDashboard(data);
        } catch (error) {
            renderDashboard(fallbackData);
            console.warn(error.message);
        }
    }

    return {
        initDashboard: initDashboard,
        renderDashboard: renderDashboard
    };
})();
