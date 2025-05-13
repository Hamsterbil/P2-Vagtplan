export {ValidationError, NoResourceError, processReq};
import {selectUserEntries, getDB, getVars, getSchedule, validateLogin, getCurrentUser, updateDatabase} from "./app.js";
import {extractJSON, fileResponse, htmlResponse, extractForm, jsonResponse, errorResponse, reportError, startServer, fs} from "./server.js";

const ValidationError = "Validation Error";
const NoResourceError = "No Such Resource";

startServer();
/* *********************************************************************
   Setup HTTP route handling: Called when a HTTP request is received 
   ******************************************************************** */
function processReq(req, res){
  console.log("GOT: " + req.method + " " + req.url);

  let baseURL = 'http://' + req.headers.host + '/';    //https://github.com/nodejs/node/issues/12682
  let url = new URL(req.url,baseURL);
  let searchParms = new URLSearchParams(url.search);
  let queryPath = decodeURIComponent(url.pathname); //Convert uri encoded special letters (eg æøå that is escaped by "%number") to JS string
  let pathElements = queryPath.split("/"); 
  console.log(pathElements);

  res.setHeader('Set-Cookie', 'HttpOnly; Secure; Path=/; Max-Age=3600');

  // Keep people out if they aren't logged in
  let currentUser = getCurrentUser(req);

  if (!currentUser && pathElements[1] !== "login" && pathElements[1] !== "js") {
    fileResponse(res, "/html/login.html");
    console.log("Access denied.");
    return;
  }

  switch(req.method) {
    case "POST": {
      switch(pathElements[1]) {
        case "login": {
          handleLogin(req, res);
          break;
        }
        case "logout": {
          handleLogout(res);
          break;
        }
        case "register": {
          handleRegister(req, res);
          break;
        }
        case "database": {
          if (currentUser.type !== "admin" && pathElements[2] !== "preferences") {
            reportError(res, new Error("Access denied. Only admins can update the database."));
            return;
          }
          handleUpdateDatabase(req, res);
          break;
        }
        default: {
          console.error("Resource doesn't exist");
          reportError(res, new Error(NoResourceError)); 
        }
      }
      break; //END POST URL
    } 
    case "GET": {
      switch(pathElements[1]) {     
        case "": { // "/"
          if (currentUser) {
            fileResponse(res, "/html/planner.html");
          } else {
            fileResponse(res, "/html/login.html");
          }
          break;
        }
        case "database": {
          try {
            // checkAccess(currentUser, res);
            let db = getDB();
            if (db)
              jsonResponse(res, db);
            else
              throw new Error(NoResourceError);
          } catch (error) {
            reportError(res, error);
          }
          break;
        }
        case "variables": {
          try {
            // checkAccess(currentUser, res);
            let vars = getVars();
            if (vars)
              jsonResponse(res, vars);
            else
              throw new Error(NoResourceError);
            }
          catch (error) {
            reportError(res, error);
          }          
          break;
        }
        case "schedule": {
          let schedule = getSchedule();
          if (schedule)
            jsonResponse(res, schedule);
          else
            reportError(res, new Error(NoResourceError));
          break;
        }
        case "user": {
          let username = searchParms.get("username") || currentUser.user;
          let userEntries = selectUserEntries(username);
          if (userEntries)
            jsonResponse(res, userEntries);
          else
            reportError(res, new Error("User not found"));
          break;
        }
        default: { //for anything else we assume it is a file to be served
          console.log("Serving file: " + pathElements[1]);
          if (req.url === "/html/index.html") {
            if (currentUser.type === "admin") {
              fileResponse(res, "/html/indexAdmin.html");
            }
            else {
              fileResponse(res, req.url);
            }
          } else {
            fileResponse(res, req.url);
          }
        }
      }
      break;
    }
    default:
      reportError(res, new Error(NoResourceError)); 
  } //end switch method
}

function handleLogin(req, res) {
  extractJSON(req)
  .then(({ username, password }) => {
    if (validateLogin(username, password)) {
      res.setHeader('Set-Cookie',
        `currentUser=${encodeURIComponent(username)}; Path=/; HttpOnly; Secure; Max-Age=3600`);
      jsonResponse(res, { success: true, message: "Login successful" });
    } else {
      throw new Error('Invalid username or password');
    }
  })
  .catch((err) => {
    reportError(res, err);
  });
}

function handleLogout(res) {
  res.setHeader('Set-Cookie',
    'currentUser=""; Path=/; HttpOnly; Secure; Max-Age=0');
  jsonResponse(res, { success: true, message: "Logout successful" });
}

function handleUpdateDatabase(req, res) {
  extractJSON(req)
  .then(({ data, entry }) => {
    if (updateDatabase(data, entry)) {
      jsonResponse(res, { success: true, message: `${entry} in database updated successfully` })
    } else throw new Error(`Failed to update ${entry} in database`);
  })
  .catch((err) => {
    reportError(res, err);
  })
}

function checkAccess(currentUser, res) {
  if (currentUser.type !== "admin") {
    reportError(res, new Error("Access denied. Only admins can access this resource."));
    return false;
  }
}