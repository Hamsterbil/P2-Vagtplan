export {ValidationError, NoResourceError, processReq};
import {selectUserEntries, getDB, validateLogin, getCurrentUser} from "./app.js";
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

  // Keep people out if they aren't logged in
  let user = getCurrentUser(req);

  if (!user && pathElements[1] !== "login" && pathElements[1] !== "js") {
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
          handleLogout(req, res);
          break;
        }
        case "preferences": {
          // handlePreferences(req, res);
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
          if (user) {
            fileResponse(res, "/html/planner.html");
          } else {
            fileResponse(res, "/html/login.html");
          }
          break;
        }
        case "date": {
          let date = new Date();
          console.log(date);
          jsonResponse(res,date);
          break;
        }
        case "records": {
          try { 
            if((pathElements.length===2) && (searchParms.toString().length===0)) {
                jsonResponse(res, getDB);
            }
            else //resource does not exist
              reportError(res, new Error(NoResourceError));
          }catch(error){
            reportError(res,error)
          } 
          break;
        }
        default: { //for anything else we assume it is a file to be served
          fileResponse(res, req.url);
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
      jsonResponse(res, { success: false, message: "Invalid username or password" });
    }
  })
  .catch((err) => {
    reportError(res, err);
  });
}

function handleLogout(req, res) {
  res.setHeader('Set-Cookie',
    'currentUser=; Path=/; HttpOnly; Secure; Max-Age=0'
  );
  jsonResponse(res, { success: true, message: "Logout successful" });
}

// function handlePreferences(req, res) {
//   extractJSON(req)
//   .then(({ weekdays, weekends, preferred, not_preferred, shifts }) => {
//     if (!preferred.isArray() || !not_preferred.isArray() || !shifts.isArray()) {
//       throw new Error("Invalid type of input");
//     }
//     if (updatePreferences(weekdays, weekends, preferred, not_preferred, shifts)) {
//       jsonResponse(res, { success: true, message: "Preferences updated successfully" })
//     } else {
//       throw new Error("Could not update preferences of user in the database");
//     }
//   })
//   .catch((err) => {
//     reportError(res, err);
//   })
// }