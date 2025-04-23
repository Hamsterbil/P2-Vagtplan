export {selectUserEntries, getDB, getCurrentUser, validateLogin, updateDatabase};
import { ValidationError } from "./router.js";
import fs from 'fs';
import bcrypt from 'bcrypt';

let sampleData = 'node/db.json';
let DB = JSON.parse(fs.readFileSync(sampleData, 'utf-8'));

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
async function generateHash(pass) {
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

  // If everything is fine
  return true;
}

function selectUserEntries(username) {
  // Search for the user in the employees array
  const employee = DB.employees.find(e => e.user === sanitize(username));
  if (employee) {
    return employee;
  }

  // Search for the user in the admins array
  const admin = DB.admins.find(a => a.user === sanitize(username));
  if (admin) {
    return admin;
  }

  // If no match is found, return null
  return null;
}

function getDB() {
  return DB;
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

    switch (entry) {
      case "user password": {
        user.password = generateHash(sanitize(data.plainPassword));
        break;
      }
      case "user preferences": {
        user = user.preferences;
        user.weekdays = sanitize(data.weekdays);
        user.weekends = sanitize(data.weekends);
        user.preferred = sanitize(data.preferred, true);
        user.notPreferred = sanitize(data.notPreferred, true);
        user.shiftPreference = sanitize(data.shifts, true);
            
        break;
      }
      case "user score": {
        user = user.score;
        user.days = data.days;
        user.shifts = data.shifts;

        break;
      }
      case "weights": {
        DB.algoWeights = data.weights;
        break;
      }
      case "worker count": {
        DB.workerCount = data.count;
        break;
      }
      default: {
        throw new Error("Entry not defined accordingly");
      }
    }

    fs.writeFileSync(sampleData, JSON.stringify(DB, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}