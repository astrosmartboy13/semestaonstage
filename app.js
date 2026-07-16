// ========================================
// SIGNAL13 Dashboard
// ========================================

// ---------- DATA MANUAL ----------

const PROJECT = {

    eventName: "EUFORIA ART 11",

    totalDuration: "09:00:00",

    showDirector: "Abdul Basit",

    stageManager: "Putri"

};

// ---------- LOAD PROJECT ----------

document.getElementById("event-name").textContent =
PROJECT.eventName;

document.getElementById("duration").textContent =
PROJECT.totalDuration;

document.getElementById("show-director").textContent =
PROJECT.showDirector;

document.getElementById("stage-manager").textContent =
PROJECT.stageManager;


// ---------- DATE & TIME ----------

function updateClock(){

    const now = new Date();

    document.getElementById("time").innerHTML =
    now.toLocaleTimeString("id-ID") + " WIB";

    document.getElementById("date").innerHTML =
    now.toLocaleDateString("id-ID",{

        weekday:"long",

        day:"numeric",

        month:"long",

        year:"numeric"

    });

}

updateClock();

setInterval(updateClock,1000);


// ---------- STATUS ----------

document.getElementById("status-text").innerHTML =
"ONLINE";


// ---------- BUTTON ----------

document.getElementById("timer").onclick=()=>{

    window.open(CONFIG.timer,"_blank");

}

document.getElementById("backstage").onclick=()=>{

    window.open(CONFIG.backstage,"_blank");

}

document.getElementById("timeline").onclick=()=>{

    window.open(CONFIG.timeline,"_blank");

}

document.getElementById("studio").onclick=()=>{

    window.open(CONFIG.studio,"_blank");

}