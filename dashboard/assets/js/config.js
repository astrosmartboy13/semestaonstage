const SIGNAL13 = {

    dashboard: "https://dashboard.semestaonstage.com",

    stageTimer: "https://timer.semestaonstage.com",

    backstage: "https://backstage.semestaonstage.com",

    timeline: "https://timeline.semestaonstage.com",


    editor: "https://editor.semestaonstage.com",

    studio: "https://studio.semestaonstage.com",

    controlCenter: "https://admin.semestaonstage.com",

    health: "/health",

    apiStatus: "/api/status",

    rundown: "",

    instagram: "https://www.instagram.com/semesta.show"

};

window.SIGNAL13 = SIGNAL13;

function getLink(path){
    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    return window.location.origin + path;
}
