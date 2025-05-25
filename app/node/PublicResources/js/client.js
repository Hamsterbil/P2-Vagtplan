// Using IIFE to encapsulate the client code and avoid polluting the global namespace
var client = (function() {
  function saveSchedule(events) {
    const data = { events };
    client.jsonPost("/database", { data, entry: "schedule" })
    .then(response => {
        console.log("Schedule saved successfully:", response);
        alert("Schedule saved successfully!");
    });
  }
  
  async function findUser() {
    const response = await client.jsonFetch("/user").catch(err => {
      console.error("Failed to fetch user data:", err);
    });
    return response;
  }

  async function getEvents(user = "") {
    const schedule = await client.jsonFetch("/schedule").catch(err => {
      console.error("Failed to fetch events:", err);
    });

    const allEvents = schedule.map(event => {
      const isUserEvent = event.title === user;
      let color = "";
      switch (event.extendedProps.shift) {
        case "Morning":
          color = "rgb(0, 86, 139)"; // Morning shift color
          break;
        case "Evening":
          color = "rgb(60, 72, 135)"; // Evening shift color
          break;
        case "Night":
          color = "rgb(0, 14, 65)"; // Night shift color
          break;
        default:
          color = "white";
          break;
      }
      color = isUserEvent ? "rgb(83, 195, 189)" : color;

      // https://fullcalendar.io/docs/event-object
      return {
        title: `${isUserEvent ? event.extendedProps.shift : event.title}`,
        start: event.start,
        end: event.end,
        backgroundColor: color,
        isUserEvent,
        user: event.title,
        shift: event.extendedProps.shift,
      };
    }) || [];

    const userEvents = allEvents.filter(event => event.isUserEvent);
    return { allEvents, userEvents };
  }

  function setSchedule(events, user) {
    const isAdmin = user.type === "admin";
    const customButtons = isAdmin ? 'generateSchedule saveSchedule ' : '';

    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'timeGridDay',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: customButtons + 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      events: events,
      firstDay: 1,
      editable: isAdmin,
      selectable: isAdmin,
      allDaySlot: false,
      scrollTime: '07:00:00',
      nowIndicator: true,
      handleWindowResize: true,
      weekNumberCalculation: 'ISO',
      weekNumbers: true,
      navLinks: true,
      dayMaxEvents: true,
      aspectRatio: 2,
      eventDidMount: function(info) {
        new bootstrap.Tooltip(info.el, {
          title: info.event.title + "<br>" + info.event.start.toLocaleString() + " - " + info.event.end.toLocaleString(),
          placement: 'top',
          trigger: 'hover',
          container: 'body',
          html: true,
        });
      },
      customButtons: {
        saveSchedule: {
          text: 'Save Schedule',
          click: function() {
            saveSchedule(calendar.getEvents());
          }
        },
        generateSchedule: {
          text: 'Generate Schedule',
          click: function() {
            alert("Generating new schedule. This may take a while.");
            scheduler.generate().then(newEvents => {
              const currentDate = new Date();
              const onlyFuture = false;
              const filteredEvents = onlyFuture ? newEvents.filter(event => new Date(event.start) > currentDate) : newEvents;
              if (onlyFuture) {
                calendar.getEvents().forEach(event => {
                  if (new Date(event.start) > currentDate) {
                    event.remove();
                  }
                });
              }
              else {
                calendar.removeAllEvents();
              }
              filteredEvents.forEach(event => {
                calendar.addEvent(event);
              });
        
              calendar.render();
              alert("New Schedule generated");
            });
          }
        }
      },  
    });
    calendar.render();
  }

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
          window.location.href = '/html/index.html';
        }
      } catch (err) {
        document.getElementById('errorMessage').textContent = "Invalid username or password";
        document.getElementById('errorMessage').style.display = 'block';
        console.error(err);
      }
    });
  },

  preferenceForm: async function() {
    let user = await findUser()
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

    for (let i = 0; i < 3; i++) { 
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
        const response = await client.jsonPost("/database/preferences", { data, entry: "user preferences" });

        if (response.success) {
          alert("Preferences saved successfully!");
        }
      } catch (err) {
        alert("Error saving preferences: " + err.message);
        console.error(err);
      }
      
      scheduler.preferenceSubmit();
    });
  },

  initializeEmployee: async function() {
    let user = await findUser()
    if (!user) return;

    const { allEvents, userEvents } = await getEvents(user.user);
    const upcomingEvents = userEvents.filter(event => new Date(event.start) > new Date());

    document.getElementById('currentUser').innerHTML = user.user;
    document.getElementById('displayUser').innerHTML = user.user;
    document.getElementById('shiftCount').innerHTML = `${upcomingEvents.length} upcoming shifts`;
    document.getElementById('viewToggleBtn').classList.add("d-inline-block");

    setSchedule(userEvents, user);

    let isShowingAll = false;
    document.getElementById('viewToggleBtn').addEventListener('click', function() {
      isShowingAll = isShowingAll ? false : true;
      const eventsToShow = isShowingAll ? allEvents : userEvents;
      setSchedule(eventsToShow, user);
      this.innerHTML = isShowingAll ? "Show my shifts only" : "Show all shifts";
    });
  },
  
  initializeAdmin: async function() {
    let user = await findUser()
    if (user.type !== "admin") return;

    document.getElementById('currentUser').innerHTML = user.user;

    const settingValue = await client.jsonFetch("/variables").catch(err => {
      console.error("Failed to fetch setting value:", err);
    });

    const DAYS_OF_WEEK = [ "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" ];
    const container = document.getElementById("daySettingsContainer");
    let html = "";
    DAYS_OF_WEEK.forEach((day) => {
      const value = settingValue.workerCount[day] || 0;
      html += `<div class="mb-4 border-bottom pb-2"><h5 class="text-capitalize">${day}</h5>`;
        const sliderId = `settings-${day}`;
        html += `
          <div class="slider-container mb-2">
            <label for="${sliderId}" class="form-label text-capitalize"></label>
            <input type="range" class="form-range" min="0" max="10" step="1" id="${sliderId}" value="${value}">
            <span class="slider-value">${value}</span>
          </div>`;
      html += `</div>`;
    });
    container.innerHTML = html;

    const sliders = container.querySelectorAll(".form-range");
    sliders.forEach((slider) => {
      slider.oninput = function() {
        const value = this.value;
        const sliderValue = this.nextElementSibling;
        sliderValue.innerHTML = value;
      }
    });

    document.getElementById("saveDaySettingsBtn").addEventListener("click", () => {
      const settings = {};
      DAYS_OF_WEEK.forEach((day) => {
        const value = document.getElementById(`settings-${day}`).value;
        settings[day] = parseInt(value, 10);
      });
      const data = { username: user.user, workerCount: settings };
      
      client.jsonPost("/database", { data, entry: "worker count" })
      .then(response => {
        if (response.success) {
          alert("Settings saved successfully!");
        } else {
          alert("Error saving settings: " + response.message);
        }
      })
      .catch(err => {
        console.error(err);
        alert("Error saving settings: " + err.message);
      });
    });

    const { allEvents } = await getEvents();
    setSchedule(allEvents, user);
  }
}
})();