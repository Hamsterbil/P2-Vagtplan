export {selectUserEntries, getDB, getCurrentUser, validateLogin, updatePreferences};
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
// async function generateHash(pass) {
//   const saltRounds = 10;

//   try {
//     const hash = await bcrypt.hash(pass, saltRounds);
//     return hash;
//   } catch (err) {
//     throw new Error(`Error generating hash: ${err.message}`);
//   }
// }
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
  try {
    const user = selectUserEntries(validateUserName(username));

    if (!user) {
      throw new Error("User not found");
    }

    const pass = sanitize(password);
    if (!bcrypt.compareSync(pass, user.password)) {
      throw new Error("Invalid password");
    }

    return true; // If everything is fine
  } catch (err) {
    console.error("Error during login validation:", err);
    return false;
  }
}

function selectUserEntries(username) {
  // Search for the user in the employees array
  const name = sanitize(username);
  const employee = DB.employees.find(e => e.user === name);
  if (employee) {
    return employee;
  }

  // Search for the user in the admins array
  const admin = DB.admins.find(a => a.user === name);
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

function updatePreferences(req) {
  try {
    let { username, weekdays, weekends, preferred, notPreferred, shifts } = req.body;

    const user = selectUserEntries(validateUserName(username)).preferences;
    if (!user) throw new Error("User not found");

    user.weekdays = sanitize(weekdays);
    user.weekends = sanitize(weekends);
    user.preferred = sanitize(preferred, true);
    user.notPreferred = sanitize(notPreferred, true);
    user.shiftPreference = sanitize(shifts, true);

    fs.writeFileSync(sampleData, JSON.stringify(DB, null, 2), 'utf-8');

    return true;
  } catch (err) {
    console.error("Error updating preferences:", err);
    return false;
  }
}