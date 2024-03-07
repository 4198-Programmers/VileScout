if ("serviceWorker" in navigator) {
    window.onload = () => navigator.serviceWorker.register("./sw.js");
}

const menuToggleButton = document.querySelector("#menu-toggle-btn");
const locationText = document.querySelector("#crew-text");
const menuDiv = document.querySelector("#menu");
const authPasswd = document.querySelector("#auth-passwd");
const scoutName = document.querySelector("#scout-name");
const locationSelect = document.querySelector("#crew-select");
const templateCopyButton = document.querySelector("#template-copy-btn");
const templateEditButton = document.querySelector("#template-edit-btn");
const downloadSelect = document.querySelector("#download-type-sel");
const surveysDownloadButton = document.querySelector("#surveys-download-btn");
const surveysEraseButton = document.querySelector("#surveys-erase-btn");
//const teamDisp = document.querySelector("#disp-team"); //used with static team box

const teamMetricList = document.querySelector("#teams-list");
const teamMetric = document.querySelector("#metric-team");
const absentMetric = document.querySelector("#metric-absent");
const customMetricsDiv = document.querySelector("#metrics-custom");
const surveySaveButton = document.querySelector("#survey-save-btn");
const surveyResetButton = document.querySelector("#survey-reset-btn");

const teamDisp = teamMetric

menuToggleButton.onclick = () => toggleMenu();
locationSelect.onchange = e => setLocation(e.target.value);
templateCopyButton.onclick = () => copyTemplate();
templateEditButton.onclick = () => editTemplate();
surveysDownloadButton.onclick = () => downloadSurveys();
surveysEraseButton.onclick = () => eraseSurveys();
teamMetric.oninput = () => backupSurvey();
absentMetric.onclick = () => toggleAbsent();
surveySaveButton.onclick = () => saveSurvey();
surveyResetButton.onclick = () => resetSurvey();

let scoutLocation = "Crew 1";
let isAbsent = false;
let gameMetrics = [];
let serverURL = "https://data.team4198.org:8000"
// If you make a new type, be sure to add it here
const metricTypes = {
    "toggle": ToggleMetric,
    "togglegrid": ToggleMetricGrid,
    "number": NumberMetric,
    "select": SelectMetric,
    "text": TextMetric,
    "rating": RatingMetric,
    "timer": TimerMetric,
};

// The example template showcases each metric type
/*const exampleTemplate = {
  metrics: [
    { name: "Toggle", type: "toggle", group: "Group" },
    { name: "Number", type: "number" },
    { name: "Select", type: "select", values: ["Value 1", "Value 2", "Value 3"] },
    { name: "Text", type: "text", tip: "Tip" },
    { name: "Rating", type: "rating" },
    { name: "Timer", type: "timer" },
  ]
};*/

const survey = {
    "metrics": [
    { "name": "Full Team Name", "type": "text", "tip": "Enter team name here...", "group": "Team Information", "category": "2teaminfo", "identifier": "fullteamname" },
    { "name": "Team Location", "type": "text", "tip": "Enter town here...", "category": "2teaminfo", "identifier": "teamlocation" },
    { "name": "Robot Name", "type": "text", "tip": "Enter name here...", "category": "2teaminfo", "identifier": "robotname" },

    { "name": "Drive Train Type", "type": "select", "values": ["Mechanum","Tank(traction)","Tank(omni)","Tank(mixed)","Swerve"], "group": "Robot Specs", "category": "robotspecs", "identifier": "drivetrain" },
    { "name": "Motor Type", "type": "text", "tip": "Enter type here..." , "category": "robotspecs", "identifier": "motortype"},
    { "name": "Can climb?", "type": "toggle", "category": "robotspecs", "identifier": "canclimb" },
    { "name": "Can do amp or speaker?", "type": "select", "values": ["Neither", "Amp", "Speaker", "Both"], "category": "robotspecs", "identifier": "amporspeaker" },
    { "name": "Can do trap?", "type": "toggle", "category": "robotspecs", "identifier": "cantrap" },

    { "name": "Robot Weight (lbs)", "type": "number", "category": "robotspecs", "identifier": "robotweightlbs" },
    { "name": "Total Wheels Used", "type": "number", "category": "other", "identifier": "wheelcount" },

    { "name": "Where are Pneumatics Used?", "type": "text", "tip": "Type here. Leave blank for none.","group": "Engineered Capabilities", "category": "engineercapabilities", "identifier": "pneumatics" },
    { "name": "Where are 3D-Printed Parts Used?", "type": "text", "tip": "Type here. Leave blank for none.", "category": "engineercapabilities", "identifier": "3dprintparts" },

    { "name": "Programmed Auto Capabilities?", "type": "text", "tip": "Type here. Leave blank for none.", "group": "Programmed Capabilities", "category": "programcapabilities", "identifier": "autocapabilities" },
    { "name": "April tags used?", "type":"toggle", "category": "programcapabilities", "identifier": "useapriltags" },
    { "name": "Reflective tape used?", "type":"toggle", "category": "programcapabilities", "identifier": "usereflecttape" },
    { "name": "Extra Cameras Used?", "type": "toggle", "category": "programcapabilities", "identifier": "useextracameras" },
    { "name": "Automation Via Sensors?", "type": "toggle", "category": "programcapabilities", "identifier": "usesensorautomation" },

    { "name": "Endgame Ability/Strategy Summary", "type": "text","tip":"Type here...", "group":"Other", "category": "other", "identifier": "endgamestrategy"},
    { "name": "What is your favorite or least favorite part of this year's game?", "type": "text", "tip": "Type here...", "category": "other", "identifier": "favoritepartofgame" },
    { "name": "Drive station summary", "type": "text", "tip": "Summarize the battle station", "category": "other", "identifier": "drivestationsummary"},
    { "name": "Are there any other unique abilities or quirks that your robot has that you’d like to talk about?", "type": "text", "tip": "Type here...", "category": "other", "identifier": "robotquirks" },
    ]
};

const matchListings = []

const exampleTemplate = survey;

let currentTemplate = JSON.parse(localStorage.template ?? JSON.stringify(exampleTemplate));
loadTemplate(currentTemplate);
setLocation(localStorage.location ?? "Crew 1");

if (localStorage.backup) {
    const backup = JSON.parse(localStorage.backup);
    authPasswd.value = backup.find(metric => metric.name == "Auth").value;
    scoutName.value = backup.find(metric => metric.name == "tName").value;
    isAbsent = backup.find(metric => metric.name == "Absent").value;
    if (isAbsent) {
      absentMetric.innerHTML = "<i class='square-checked text-icon'></i>Absent";
      customMetricsDiv.classList.toggle("hide");
      refreshIcons(absentMetric);
    }
    gameMetrics.forEach(metric => {
        metric.update(backup.find(m => m.name == metric.name).value);
    });
}

function postSurvey(surveyJson) {
    newJson = surveyToJson(surveyJson);

    let xhr = new XMLHttpRequest();
    xhr.open("POST", serverURL + "/api/pits");

    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("x-pass-key", authPasswd.value);

    xhr.onload = function () {
        console.log(xhr.status);

        if (xhr.status == 401) {
            console.log("Password Failed")
            alert("Authentication failure. Please check password.");
            authPasswd.focus();
            return;
        }

        // Process our return data
        if (xhr.status >= 200 && xhr.status < 300) {
            // Runs when the request is successful
            console.log(xhr.responseText);
            if (xhr.status == 202) {
                resetSurvey(false);
            }
            else if (xhr.status == 200) {
                resetSurvey(false)
            }
            else {
                alert("Unknown error occured. Please check your Internet connection.");
                return;
            }
        } else {
            // Runs when it's not
            console.log(xhr.responseText)
        }
    };
    xhr.send(newJson);

}

function surveyToJson(surveyJson) {
    const formattedJson = {

    };

    surveyJson.forEach(metric => {
        console.log(metric);
        if (!formattedJson[metric.category]) {
                formattedJson[metric.category] = {};
        }
        formattedJson[metric.category][metric.identifier] = metric.value;
    });

    return JSON.stringify(formattedJson, null, 2);
}

/** Function to call the survey data instead of just writing it all out manually */
function surveyData() {
    return [
        { name: "Team", value: teamMetric.value, category: "1metadata", identifier: "1team" },
        { name: "Absent", value: isAbsent, category: "1metadata", identifier: "absent" },
        { name: "Location", value: locationSelect.value, category: "1metadata", identifier: "location" },
        { name: "Name", value: scoutName.value, category: "1metadata", identifier: "name" },
        ...gameMetrics.map(metric => { return { name: metric.name, value: metric.value, category: metric.category, identifier: metric.identifier } })
    ];
}

/** Stores the current unsaved survey to `localStorage` */
function backupSurvey() {
    localStorage.backup = JSON.stringify(surveyData());
}

/** Toggles the options menu */
function toggleMenu() {
    menuDiv.classList.toggle("hide");
}

/** Toggles whether the team is absent */
function toggleAbsent() {
    customMetricsDiv.classList.toggle("hide");
    absentMetric.innerHTML = `<i class="square-${isAbsent ? "empty" : "checked"} text-icon"></i>Absent`;
    refreshIcons(absentMetric);
    isAbsent = !isAbsent;
    backupSurvey();
}

/** Copies the current template to clipboard */
function copyTemplate() {
    const input = document.createElement("input");
    input.value = JSON.stringify(currentTemplate);
    document.body.append(input);
    input.select();
    input.setSelectionRange(0, input.value.length);
    document.execCommand("copy");
    input.remove();
    alert("Copied template");
}

/** Requests a new template and checks if the template is valid */
function editTemplate() {
    const newPrompt = prompt("Paste new template (you can also 'reset' the template):");
    if (newPrompt) {
        if (newPrompt == "reset") {
            setTemplate();
        } else {
            const newTemplate = JSON.parse(newPrompt);
            let error;
            if (newTemplate.metrics) {
                newTemplate.metrics.forEach(metric => {
                    if (!metric.name) error = "Metric has no name";
                    if (!Array.isArray(metric.values ?? [])) error = "Metric has invalid values";
                    if (!metricTypes.hasOwnProperty(metric.type)) error = "Metric has invalid type";
                });
            } else error = "Template has no metrics";
            if (error) {
                alert(`Could not set template! ${error}`);
                return;
            }
            setTemplate(newTemplate);
        }
    }
}

/**
 * Sets a new template or to example template
 * @param {object} newTemplate An object that contains template data
 */
function setTemplate(newTemplate = exampleTemplate) {
    currentTemplate = JSON.parse(JSON.stringify(newTemplate));
    localStorage.template = JSON.stringify(currentTemplate ?? "");
    loadTemplate(currentTemplate);
    backupSurvey();
    refreshIcons();
}

/**
 * Loads a template into the UI
 * @param {object} newTemplate An object that contains template data
 */
function loadTemplate(newTemplate = exampleTemplate) {
    teamMetricList.innerHTML = "";
    if (newTemplate.teams) {
        newTemplate.teams.forEach(team => {
            teamMetricList.innerHTML += `<option value="${team}">`;
        });
    }
    customMetricsDiv.innerHTML = "";
    gameMetrics = [];
    let metricObject;
    newTemplate.metrics.forEach(metric => {
        metricObject = new metricTypes[metric.type](metric);
        if (metric.group) {
            let groupSpan = document.createElement("span");
            groupSpan.classList.add("group");
            groupSpan.innerHTML = metric.group;
            customMetricsDiv.append(groupSpan);
        }
        customMetricsDiv.append(metricObject.element);
        // console.log(metricObject)
        gameMetrics.push(metricObject);
    });
}

/**
 * Sets a new scout location
 * @param {string} newLocation A string that includes alliance color and robot position
 */
function setLocation(newLocation = "Crew 1") {
    scoutLocation = newLocation;
    // let newTheme = "red";
    // if (/blue/.test(newLocation.toLowerCase())) newTheme = "blue";
    document.documentElement.style.setProperty("--theme-color", `var(--${"purple"})`);
    localStorage.location = newLocation;
    locationText.innerHTML = newLocation;
    locationSelect.value = newLocation;
    refreshIcons();
}

/** Validates and saves the current survey to `localStorage` */
function saveSurvey() {
    if (matchListings.length == 0) {
        // Matches a 1-4 long sequence of numbers and an optional character
        if (!/^\d{1,4}[A-Z]?$/.test(teamMetric.value)) {
            alert("Invalid team value! Please enter a 1-9999 digit team number.");
            teamMetric.focus();
            return;
        }
        if (currentTemplate.teams) {
            if (!currentTemplate.teams.some(team => team == teamMetric.value)) {
                alert("Invalid team value! Please enter a 1-9999 digit team number.");
                teamMetric.focus();
                return;
            }
        }

        if (scoutName.value == "") {
            alert("Invalid name value! Please enter your name where it goes.");
            teamMetric.focus();
            return;
        }

    }
    if (authPasswd.value == "") {
        if (!confirm("Save match data OFFLINE?")) return;
        let surveys = JSON.parse(localStorage.surveys ?? "[]");
        surveys.push(surveyData());
        console.log(surveyToJson(surveyData()))
        localStorage.surveys = JSON.stringify(surveys);
        resetSurvey(false);
    }
    else {
        if (!confirm("Save match data online?")) return;
        let surveys = JSON.parse(localStorage.surveys ?? "[]");
        surveys.push(surveyData());
        postSurvey(surveyData());
    }
}

/**
 * Resets the current survey
 * @param {boolean} askUser A boolean that represents whether to prompt the user
 */
function resetSurvey(askUser = true) {
    if (askUser) if (prompt("Type 'reset' to reset this match's data.") != "reset") return;
    if (isAbsent) toggleAbsent();
    gameMetrics.forEach(metric => metric.reset());
    refreshIcons();
    localStorage.backup = "";
}

/**
 * Downloads all surveys from `localStorage` either as JSON or CSV
 * @param {boolean} askUser A boolean that represents whether to prompt the user
 */
function downloadSurveys(askUser = true) {
    if (askUser) if (!confirm("Are you sure you would like to export collected data?")) return;

    var fileName = localStorage.location.replace(" ", "_").toLowerCase();
    var today = new Date();
    fileName = fileName + "_" + today.getHours() + "h" + today.getMinutes() + "m";
    const anchor = document.createElement("a");
    anchor.href = "data:text/plain;charset=utf-8,";

    switch (downloadSelect.value) {
        case "JSON":
            surveyJson = JSON.parse(localStorage.surveys);
            console.log(surveyJson);
            if (surveyJson.length == 1) {
                newJson = surveyToJson(surveyJson[0]);
            } else {
                newJson = {entries: []}
                for (i = 0; i < surveyJson.length; i++) {
                    newJson["entries"].push(JSON.parse(surveyToJson(surveyJson[i])));
                }
                newJson = JSON.stringify(newJson, null, 2);
            }

            anchor.href += encodeURIComponent(newJson);
            console.log(newJson);
            anchor.download = fileName + ".json";

            break;

        case "CSV":
            let surveys = JSON.parse(localStorage.surveys);
            let csv = "";
            if (surveys) {
                surveys.forEach(survey => {
                    let surveyAsCSV = "";
                    survey.forEach(metric => {
                        if (typeof metric.value == "string") surveyAsCSV += "\"" + metric.value + "\",";
                        else surveyAsCSV += metric.value + ",";
                    });
                    csv += surveyAsCSV + "\n";
                });
            }
            anchor.href += encodeURIComponent(csv);
            anchor.download = fileName + ".csv";
            break;
    }
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
}

/** Erases all surveys from `localStorage` after prompting the user **/
function eraseSurveys() {
    if (prompt("This deletes all scouting data! Type 'ERASE' to erase saved surveys") == "ERASE") {
        localStorage.surveys = "[]";
    }
}
