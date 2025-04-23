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
      if (preferred.some(day => notPreferred.includes(day)))
        throw new Error("You cannot select the same day as preferred and not preferred.");

      const data = { username, weekdays, weekends, preferred, notPreferred, shifts };
      const entry = "user preferences";
      const response = await jsonPost("/database", { data, entry });

      if (response.success) {
        alert("Preferences saved successfully!");
      }
    } catch (err) {
      alert("Error saving preferences: " + err.message);
      console.error(err);
    }
  })
}