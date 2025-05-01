// Using IIFE to keep some client functions out of access and only return functions allowed to be used by users. Security
var client = (function() {
return {

//Tries to parse a http body as json document. 
//But first ensure taht the response code is OK (200) and
//the content type is actually a json document; else rejects the promise
  jsonParse: function(response) {
    if (response.ok) 
      if (response.headers.get("Content-Type") === "application/json") 
        return response.json();
      else
        throw new Error("Wrong Content Type. Expected application/json, got " + response.headers.get("Content-Type"));   
    else
      return response.text()
        .then(text => { throw new Error(response.status + ": " + text); });
  },

//GET a json document at URL
  jsonFetch: function(url) {
    return fetch(url).then(client.jsonParse);
  },

//POST a json document in data to URL
//Sets content type appropriately first. 
  jsonPost: function(url = '', data={}) {
    const options={
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        headers: {
          'Content-Type': 'application/json'
        },
      body: JSON.stringify(data) // body data type must match "Content-Type" header
      };
    return fetch(url, options).then(client.jsonParse);
  },

  logout: async function() {
    try {
      const response = await client.jsonPost("/logout");

      if (response.success)
        window.location.href = '/';
    } catch (err) {
      console.error(err);
    }
  },

  loginForm: function() {
    document.getElementById('loginForm').addEventListener('submit', async function (e) {
      e.preventDefault();

      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      try {
        const response = await client.jsonPost("/login", { username, password });

        if (response.success) {
          // sessionStorage.setItem('currentUser', username);
          window.location.href = '/html/planner.html';
        }
      } catch (err) {
        document.getElementById('errorMessage').textContent = "Invalid username or password";
        document.getElementById('errorMessage').style.display = 'block';
        console.error(err);
      }
    });
  },

  preferenceForm: async function() {
    let user = await client.jsonFetch("/user")
      .catch(err => {
        console.error("Failed to fetch user preferences:", err)
    });
    if (!user) return;

    const { user: username, preferences } = user;
    if (Object.keys(preferences).length > 0) {
      user = preferences;
    } else {
      user = { weekdays: "", weekends: "", preferred: [], notPreferred: [], shiftPreference: [] };
    }
    
    document.getElementById('currentUser').innerHTML = username;

    const weekdaysElem = document.getElementById('weekdays');
    const weekendsElem = document.getElementById('weekends');
    const preferredElem = document.querySelectorAll('input[name="preferredDays"]');
    const notPreferredElem = document.querySelectorAll('input[name="notPreferredDays"]');
    const shiftsElem = document.querySelectorAll('select[name="shift"]');

    //Updates the form to already include user preferences, for them to edit afterwards
    weekdaysElem.value = user.weekdays;
    weekendsElem.value = user.weekends;

    updateCheckbox(preferredElem, user.preferred);
    updateCheckbox(notPreferredElem, user.notPreferred);

    for (let i = 0; i < 7; i++) { 
      shiftsElem[i].value = user.shiftPreference[i] || "";
    }

    function updateCheckbox(elements, values) {
      elements.forEach(elem => {
        elem.checked = values.includes(elem.value);
      })
    }

    function getCheckedValues(elements) {
      // This only registers the checked days by making the nodeList into an array and filtering it to only include checked days
      // Afterwards, maps the day values which is just the day as a string
      return Array.from(elements)
        .filter(elem => elem.checked)
        .map(elem => elem.value);
    }

    document.getElementById('preferenceForm').addEventListener('submit', async function (e) {
      e.preventDefault();

      const weekdays = weekdaysElem.value;
      const weekends = weekendsElem.value;
      const preferred = getCheckedValues(preferredElem);
      const notPreferred = getCheckedValues(notPreferredElem);
      const shifts = Array.from(shiftsElem).map(shift => shift.value);

      try {
        if (preferred.some(day => notPreferred.includes(day)))
          throw new Error("You cannot select the same day as preferred and not preferred.");

        const data = { username, weekdays, weekends, preferred, notPreferred, shifts };
        const entry = "user preferences";
        const response = await client.jsonPost("/database/preferences", { data, entry });

        if (response.success) {
          alert("Preferences saved successfully!");
        }
      } catch (err) {
        alert("Error saving preferences: " + err.message);
        console.error(err);
      }
      
      window.preferenceSubmit();
    });
  }
}
})();