export {selectUserEntries, getDB, getVars, getSchedule, getCurrentUser, validateLogin, updateDatabase};
import { ValidationError } from "./router.js";
// import { scheduler } from './PublicResources/js/scheduler.js';
import fs from 'fs';
import bcrypt from 'bcrypt';

let sampleData = 'node/json/db.json';
let variablesData = 'node/json/variables.json';
let scheduleData = 'node/json/schedule.json';
let DB = JSON.parse(fs.readFileSync(sampleData, 'utf-8'));
let scheduleVariables = JSON.parse(fs.readFileSync(variablesData, 'utf-8'));
let schedule = JSON.parse(fs.readFileSync(scheduleData, 'utf-8'));

// var AsyncLock = require('async-lock');
// var lock = new AsyncLock();


//remove potentially dangerous/undesired characters 
function sanitize(str, isArray = false){
  if (!isArray) {
    str=str
    .replace(/&/g, "")
    .replace(/</g, "")
    .replace(/>/g, "")
    .replace(/"/g, "")
    .replace(/'/g, "")
    .replace(/`/g, "")
    .replace(/\//g, "");
    return str.trim();
  } else {
    return str.map(item => sanitize(item));
  }
}

// Just for creating the initial hashed password for the database
async function hashDealer(pass) {
  const saltRounds = 10;

  try {
    const hash = await bcrypt.hash(pass, saltRounds);
    return hash;
  } catch (err) {
    throw new Error("Error generating hash: ", err);
  }
}
// (async () => {
//   try {
//     const hashedPassword = await generateHash("123456");
//     console.log("Hashed Password:", hashedPassword);
//   } catch (err) {
//     console.error(err.message);
//   }
// })();

// TEST AF ALGORITME -----
function softmax(array) {
  let exp = array.map(number => Math.exp(number));
  let sum = exp.reduce((a, b)=> a + b, 0);
  return exp.map(expValue => expValue / sum);
}

// testUserScore();
function testUserScore() {
  let averageDay = 0;
  let averageShift = 0;
  const userScores = DB.users.map(user => {
    if (user.type === "employee") {
      const totalShifts = schedule.filter(shift => shift.title === user.user);
      const preferredDays = totalShifts.filter(shift => {
        const shiftDate = new Date(shift.start);
        const day = shiftDate.toLocaleString('en-UK', { weekday: 'long' });
        return user.preferences.preferred.includes(day);
      });
      const preferredPercentDay = (preferredDays.length / totalShifts.length) * 100;
      averageDay += preferredPercentDay;

      let normalizedShifts = softmax(user.score.shifts);
      let morningCount = 0;
      let eveningCount = 0;
      let nightCount = 0;
      totalShifts.forEach(shift => {
        if (shift.extendedProps.shift === "Morning") morningCount++;
        else if (shift.extendedProps.shift === "Evening") eveningCount++;
        else if (shift.extendedProps.shift === "Night") nightCount++;
      });
      const totalCount = totalShifts.length;
      const distribution = [morningCount / totalCount, eveningCount / totalCount, nightCount / totalCount];

      const compareMorning = Math.abs(normalizedShifts[0] - distribution[0]);
      const compareEvening = Math.abs(normalizedShifts[1] - distribution[1]);
      const compareNight = Math.abs(normalizedShifts[2] - distribution[2]);
      const preferredPercentShift = (1 - (compareMorning + compareEvening + compareNight) / 3) * 100;
      averageShift += preferredPercentShift;

      return { username: user.user, preferredPercentDay, preferredPercentShift };
    }
  }).filter(user => user !== undefined);

  console.log("User Scores: ", userScores);
  console.log("Average Score for days: ", averageDay / userScores.length);
  console.log("Average Score for shifts: ", averageShift / userScores.length);
}
// ---------------------------


// FUNKTION TIL AT FYLDE DB MED TEST DATA --------------------------
// fillDB();
function fillDB() {
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  DB.users.forEach(user => {
    if (user.type === "employee") {
      user.preferences = { weekdays: "", weekends: "", preferred: [], notPreferred: [], shiftPreference: [] };
      user.preferences.weekdays = Math.floor(Math.random() * 10) + 1;
      user.preferences.weekends = Math.floor(Math.random() * 10) + 1;

      let weekArr = weekdays.map(elem => elem);

      for (let i = 0; i < 3; i++) {
        let rand = Math.max(0, Math.floor(Math.random() * 7) - i);
        user.preferences.preferred[i] = weekArr[rand];
        weekArr.splice(rand, 1);
      }

      for (let i = 0; i < 3; i++) {
        let rand = Math.max(0, Math.floor(Math.random() * 4) - i);
        user.preferences.notPreferred[i] = weekArr[rand];
        weekArr.splice(rand, 1);
      }

      for (let i = 0; i < 3; i++) {
        user.preferences.shiftPreference[i] = Math.floor(Math.random() * 10) + 1;
      }
      user.score = { days: [], shifts: [] };
      let weights = scheduleVariables.algoWeights;
      user.score.days = scheduler.calculateDay(user, weights);
      user.score.shifts = scheduler.calculateShift(user, weights);
    }
  });
  console.log("Writing");
  fs.writeFileSync(sampleData, JSON.stringify(DB, null, 2), 'utf-8');
}
// ---------------------------------------------------------------

function validateUserName(username) {
  let minNameLength = 1;
  let maxNameLength = 30;

  let name = sanitize(username); 
  let nameLen = name.length;
  if((nameLen >= minNameLength) && (nameLen <= maxNameLength))
     return name;
  throw(new Error(ValidationError));
}

function validateLogin(username, password) {
  const user = selectUserEntries(validateUserName(username));

  if (!user) {
    return false;
  }
  try {
    const pass = sanitize(password);
    if (!bcrypt.compareSync(pass, user.password)) {
      throw new Error("Invalid password");
    }

    return true; // If everything is fine
  } catch (err) {
    console.error("Error during login validation: ", err);
    return false;
  }
}

function selectUserEntries(username) {
  username = sanitize(username).toLowerCase();
  const user = DB.users.find(e => e.user.toLowerCase() === username);
  if (user) {
    return user;
  }

  // If no match is found, return null
  return null;
}

function getDB() {
  return DB;
}

function getVars() {
  return scheduleVariables;
}

function getSchedule() {
  return schedule;
}

function getCurrentUser(req) {
  const cookies = req.headers.cookie;
  const match = cookies.match(/currentUser=([^;]+)/);
  if (!match) return null;

  const username = decodeURIComponent(match[1]);
  return selectUserEntries(username);
}

function updateDatabase(data, entry) {
  try {
    let user;
    if (data.username) {
      user = selectUserEntries(validateUserName(data.username));
      if (!user) throw new Error("User not found");
    }

    let filePath;
    switch (entry) {
      case "user password": {
        user.password = hashDealer(sanitize(data.plainPassword));
        filePath = sampleData;
        break;
      }
      case "user preferences": {
        user = user.preferences;
        user.weekdays = sanitize(data.weekdays);
        user.weekends = sanitize(data.weekends);
        user.preferred = sanitize(data.preferred, true);
        user.notPreferred = sanitize(data.notPreferred, true);
        user.shiftPreference = sanitize(data.shifts, true);
        filePath = sampleData;
        break;
      }
      case "user score": {
        user = user.score;
        user.days = data.dayScores;
        user.shifts = data.shiftScores;
        filePath = sampleData;
        break;
      }
      case "weights": {
        scheduleVariables.algoWeights = data.weights;
        filePath = variablesData;
        break;
      }
      case "worker count": {
        scheduleVariables.workerCount = data.workerCount;
        filePath = variablesData;
        break;
      }
      case "schedule": {
        schedule = data.events;
        filePath = scheduleData;
        break;
      }
      default: {
        throw new Error("Entry not defined accordingly");
      }
    }

    fs.writeFileSync(sampleData, JSON.stringify(DB, null, 2), 'utf-8');
    fs.writeFileSync(variablesData, JSON.stringify(scheduleVariables, null, 2), 'utf-8');
    fs.writeFileSync(scheduleData, JSON.stringify(schedule, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}