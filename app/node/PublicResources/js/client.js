'use strict'

/* *******************************************************
* Helper functions to communicate with server
* ********************************************************* */

//Tries to parse a http body as json document. 
//But first ensure taht the response code is OK (200) and
//the content type is actually a json document; else rejects the promise
function jsonParse(response) {
  if (response.ok) 
     if (response.headers.get("Content-Type") === "application/json") 
       return response.json();
     else
      throw new Error("Wrong Content Type. Expected application/json, got " + response.headers.get("Content-Type"));   
  else
    return response.text()
      .then(text => { throw new Error(response.status + ": " + text); });
}

//GET a json document at URL
function jsonFetch(url) {
  return fetch(url).then(jsonParse);
}

//POST a json document in data to URL
//Sets content type appropriately first. 
function jsonPost(url = '', data={}) {
  const options={
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      headers: {
        'Content-Type': 'application/json'
      },
    body: JSON.stringify(data) // body data type must match "Content-Type" header
    };
  return fetch(url, options).then(jsonParse);
}

//some helper functions to show/hide/enable/diable elements of the HTML page
function hideElem(elem) {
  elem.style.visibility="hidden";
}

function showElem(elem) {
 elem.style.visibility="visible";
}
function disableElem(elem) {
  elem.style.display="none";
}
//assumes the element should be a block type
function enableElem(elem) {
 elem.style.display="block";
}

//Menu button elements have an id of the form: xxxx_Btn_id 
//A corresponding section has an id of the form: xxxx_Section_id 
//This function map from menu button id to section id 
function menuBtnId2SectionId(btnId) {
 const featureName=btnId.split("_Btn_id")[0]; //remove _Btn_id suffix, eg "record"
 return featureName+"_Section_id";            //eg record_Section_id 
}

//eventhandler that is called when a menu button is clicked.
//it shows the corresponding section containing the requested feature
function selectFeature(event) {
  let selectedFeature=event.target.id; //recordBtn,statsBtn, or helpBtn
  let featureNameId=menuBtnId2SectionId(selectedFeature); 
  let featureElem=document.querySelector("#"+featureNameId); 
  hideFeatures();         //Hide all feature sections
  enableElem(featureElem);//and show only selected feature
  console.log("selected "+featureNameId);
}

//register menu event handler functions
function registerMenuSelect() {
  let menuBtns=document.querySelectorAll("nav button"); //get all buttons in nav element containing the "menu"
  for(let btn of menuBtns) 
    btn.addEventListener("click",selectFeature); 
}

//hide all program feature (corresponding to HTML sections)
function hideFeatures() {
  let menuBtns=document.querySelectorAll("nav button"); //get all buttons in nav element containing the "menu"
  for(let btn of menuBtns) {
    let featureNameId=menuBtnId2SectionId(btn.id); 
    disableElem(document.querySelector("#"+featureNameId));
  }
}

function loginForm() {
  document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
      const response = await jsonPost("/login", { username, password });

      if (response.success) {
        sessionStorage.setItem('currentUser', username);
        window.location.href = '/html/planner.html';
      }
    } catch (err) {
      document.getElementById('errorMessage').textContent = "Invalid username or password";
      document.getElementById('errorMessage').style.display = 'block';
      console.error(err);
    }
  });
}

async function preferenceForm() {
  let user = await jsonFetch("/user")
    .catch(err => { 
      console.error("Failed to fetch user preferences:", err)
  });
  if (!user) return;

  const username = user.user;
  user = user.preferences || { weekdays: 0, weekends: 0, preferred: [], notPreferred: [], shiftPreference: [] };

  document.getElementById('currentUser').innerHTML = username;

  //Updates the form to already include user preferences, for them to edit afterwards
  document.getElementById('weekdays').value = user.weekdays;
  document.getElementById('weekends').value = user.weekends;
  const preferredDays = document.querySelectorAll('input[name="preferredDays"]');
  const notPreferredDays = document.querySelectorAll('input[name="notPreferredDays"]');
  const shiftsArray = document.querySelectorAll('select[name="shift"]');

  preferredDays.forEach(day => {
    day.checked = user.preferred.includes(day.value);
  });

  notPreferredDays.forEach(day => {
    day.checked = user.notPreferred.includes(day.value);
  });

  for (let i = 0; i < 7; i++) { 
    shiftsArray[i].value = user.shiftPreference[i] || "";
  }

  document.getElementById('preferenceForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const weekdays = document.getElementById('weekdays').value;
    const weekends = document.getElementById('weekends').value;
    const preferredDays = document.querySelectorAll('input[name="preferredDays"]:checked');
    const notPreferredDays = document.querySelectorAll('input[name="notPreferredDays"]:checked');
    const shiftsArray = document.querySelectorAll('select[name="shift"]');
    
    // This only registers the checked days by making the nodeList into an array and filtering it to only include checked days
    // Afterwards, maps the day values which is just the day as a string
    const preferred = Array.from(preferredDays).map(day => day.value);
    const notPreferred = Array.from(notPreferredDays).map(day => day.value);
    const shifts = Array.from(shiftsArray).map(shift => shift.value);

    try {
      const response = await jsonPost("/preferences", { username, weekdays, weekends, preferred, notPreferred, shifts });

      if (response.success) {
        alert("Preferences saved successfully!");
      }
    } catch (err) {
      alert("Failed to save preferences.");
      console.error(err);
    }
  })
}