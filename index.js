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
const teamMetric = document.querySelector("#metric-team");
const teamMetricList = document.querySelector("#teams-list");
const absentMetric = document.querySelector("#metric-absent");
const customMetricsDiv = document.querySelector("#metrics-custom");
const surveySaveButton = document.querySelector("#survey-save-btn");
const surveyResetButton = document.querySelector("#survey-reset-btn");

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

let serverURL = "https://data.team4198.org:8000";

// If you make a new type, be sure to add it here
const metricTypes = {
  "toggle": ToggleMetric,
  "number": NumberMetric,
  "select": SelectMetric,
  "text": TextMetric,
  "rating": RatingMetric,
  "timer": TimerMetric,
  "float": FloatMetric,
  "new_line": new_line,
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

const infiniteRechargeSurvey = {
  "metrics": [
    { "name": "Full Team Name", "type": "text", "tip": "Enter team name here...", "group": "Team Information" },
    { "name": "Team Location", "type": "text", "tip": "Enter town here..." },
    { "name": "Robot Name", "type": "text", "tip": "Enter name here..." },

    { "name": "Drive Train Type", "type": "select", "values": ["Mechanum","Tank(traction)","Tank(omni)","Tank(mixed)","Swerve"], "group": "Robot Specs" },
    { "name": "Motor Type", "type": "text", "tip": "Enter type here..." },
    { "name": "Ability to move Cones", "type": "rating"},
    { "name": "Ability to move Cubes", "type": "rating"},
    { "name": "Average Cone cycle Time (s)", "type": "float"},
    { "name": "Average Cube cycle Time (s)", "type": "float"},
    { "name": "Successfull grab rate (%)", "type": "float"},
    { "name": "Robot Weight (lbs)", "type": "float"},
    { "name": "Height Capabilities", "type": "select", "values": ["All", "High","Middle", "Low", "None"] },
    { "name": "Total Wheels Used", "type": "number" },

    { "name": "Where are Pneumatics Used?", "type": "text", "tip": "Type here. Leave blank for none.","group": "Engineered Capabilities" },
    { "name": "Where are 3D-Printed Parts Used?", "type": "text", "tip": "Type here. Leave blank for none." },

    { "name": "Programmed Auto Capabilities?", "type": "text", "tip": "Type here. Leave blank for none.", "group": "Programmed Capabilities" },
    { "name": "April tags used?", "type":"toggle"},
    { "name": "Reflective tape used?", "type":"toggle"},
    { "name": "Extra Cameras Used?", "type": "toggle" },
    { "name": "Automation Via Sensors?", "type": "toggle" },

    { "name": "endgame ability/strategy summary", "type": "text","tip":"Type here...", "group":"Other"},
    { "name": "What is your favorite or least favorite part of this year's game?", "type": "text", "tip": "Type here..." },
    { "name": "drive station summary", "type": "text", "tip": "Summarize the battle station"},
    { "name": "Are there any other unique abilities or quirks that your robot has that you’d like to talk about?", "type": "text", "tip": "Type here..." },
  ]
};

// const matchMetric = [];
const matchListings = [];

const exampleTemplate = infiniteRechargeSurvey;

let currentTemplate = JSON.parse(localStorage.template ?? JSON.stringify(exampleTemplate));
loadTemplate(currentTemplate);
setLocation(localStorage.location ?? "Crew 1");

if (localStorage.backup) {
    const backup = JSON.parse(localStorage.backup);
    authPasswd.value = backup.find(metric => metric.name == "Auth").value;
    // matchMetric.value = matchCount;
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
    if (matchListings.length != 0) {
      teamDisp.value = determineTeam(matchMetric.value, scoutLocation);
    }
  }

/** Stores the current unsaved survey to `localStorage` */
function backupSurvey() {
  localStorage.backup = JSON.stringify([
    { name: "Team", value: teamMetric.value },
    { name: "Absent", value: isAbsent },
    { name: "Auth", value: authPasswd.value },
    { name: "Name", value: scoutName.value},
    ...gameMetrics.map(metric => { return { name: metric.name, value: metric.value } })
  ]);
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
    gameMetrics.push(metricObject);
  });
}

/**
 * Sets a new scout location
 * @param {string} newLocation A string that includes alliance color and robot position
 */
function setLocation(newLocation = "Crew 1") {
  scoutLocation = newLocation;
  /*let newTheme = "red";
  if (/blue/.test(newLocation.toLowerCase())) newTheme = "blue";*/
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
    // Matches a 1-3 long sequence of numbers
    // if (!/\d{1,3}/.test(matchMetric.value)) {
    //   alert("Invalid match value! Make sure the match value is an integer.");
    //   matchMetric.focus();
    //   return;
    // }
    if (matchListings.length != 0) {
      if (1 > matchMetric.value || matchMetric.value > matchListings.length) {
        alert("Invalid match value! Make sure the match value is a valid qualifier match.");
        matchMetric.focus();
        return;
      }
    }
    if (authPasswd.value == ""){
      if (!confirm("Save match data OFFLINE?")) return;
      let surveys = JSON.parse(localStorage.surveys ?? "[]");
      surveys.push([
        { name: "Team", value: teamMetric.value },
        { name: "Absent", value: isAbsent },
        { name: "Location", value: locationSelect.value },
        { name: "Name", value: scoutName.value},
        ...gameMetrics.map(metric => { return { name: metric.name, value: metric.value } })
      ]);
      localStorage.surveys = JSON.stringify(surveys);
      resetSurvey(false);
    }
    else {
      if (!confirm("Save match data online?")) return;
      let surveys = JSON.parse(localStorage.surveys ?? "[]");
      surveys.push([
        { name: "Team", value: teamMetric.value },
        { name: "Absent", value: isAbsent },
        { name: "Location", value: locationSelect.value },
        { name: "Name", value: scoutName.value},
        ...gameMetrics.map(metric => { return { name: metric.name, value: metric.value } })
      ]);
      postSurvey([
        { name: "Team", value: teamMetric.value },
        { name: "Absent", value: isAbsent },
        { name: "Location", value: locationSelect.value },
        { name: "Name", value: scoutName.value},
        ...gameMetrics.map(metric => { return { name: metric.name, value: metric.value } })
      ]);
    }
  }

function postSurvey(surveyJson){
    newJson = "{\n";
    surveyJson.forEach(metric => {
      prettyName = metric.name.toLowerCase().split(/\(|\)|\ |\?|\\|\/|\-/).join("").slice(0, 15);
      if (typeof metric.value == "string") newJson += ('    "' + prettyName + '": "' + metric.value + '",\n');
      else newJson += ('    "' + prettyName + '": ' + metric.value + ',\n');
    });
    newJson += '    "password": "' + authPasswd.value + '"\n}';
    let xhr = new XMLHttpRequest();
    xhr.open("POST", serverURL + "/pits");
  
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", "application/json");
  
    xhr.onload = function () {
      console.log(xhr.status);
  
      if (xhr.status == 401){
          console.log("Password Failed")
        alert("Authentication failure. Please check password.");
        authPasswd.focus();
        return;
      }
  
      // Process our return data
      if (xhr.status >= 200 && xhr.status < 300) {
          // Runs when the request is successful
          console.log(xhr.responseText);
      if (xhr.status == 202){
        resetSurvey(false);
      }
      else if (xhr.status == 200) {
          resetSurvey(false)
      }
      else{
        alert("Unknown error occured. Please check your Internet connection.");
        return;
      }
      } else {
          // Runs when it's not
          console.log(xhr.responseText);
       }
    };
    xhr.send(newJson);

  }

/**
 * Resets the current survey
 * @param {boolean} askUser A boolean that represents whether to prompt the user
 */
function resetSurvey(askUser = true) {
  if (askUser) if (prompt("Type 'reset' to reset the survey") != "reset") return;
  teamMetric.value = "";
  teamMetric.focus();
/*  if (!askUser) {
    matchCount = parseInt(matchMetric.value) + 1;
    matchMetric.value = matchCount;
  }*/
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
  if (askUser) if (!confirm("Confirm download?")) return;
  var fileName = localStorage.location.replace(" ", "_").toLowerCase();
  var today = new Date();
  fileName = fileName + "_" + today.getHours() + "h" + today.getMinutes() + "m";
  const anchor = document.createElement("a");
  anchor.href = "data:text/plain;charset=utf-8,";
  switch (downloadSelect.value) {
    case "JSON":
      anchor.href += encodeURIComponent(localStorage.surveys);
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
  if (prompt("Type 'erase' to erase saved surveys") == "erase"){
    localStorage.surveys = "[]";
  }
}
