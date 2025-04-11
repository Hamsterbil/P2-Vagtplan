export {ValidationError, NoResourceError, processReq};
import {selectUserEntries, getDB, validateLogin} from "./app.js";
import {extractJSON, fileResponse, htmlResponse, extractForm, jsonResponse, errorResponse, reportError, startServer, fs} from "./server.js";

const ValidationError = "Validation Error";
const NoResourceError = "No Such Resource";

startServer();
/* *********************************************************************
   Setup HTTP route handling: Called when a HTTP request is received 
   ******************************************************************** */
function processReq(req,res){
  console.log("GOT: " + req.method + " " +req.url);

  let baseURL = 'http://' + req.headers.host + '/';    //https://github.com/nodejs/node/issues/12682
  let url = new URL(req.url,baseURL);
  let searchParms = new URLSearchParams(url.search);
  let queryPath = decodeURIComponent(url.pathname); //Convert uri encoded special letters (eg æøå that is escaped by "%number") to JS string
  let pathElements = queryPath.split("/"); 
  console.log(pathElements);

  switch(req.method) {
    case "POST": {
      switch(pathElements[1]) {
        case "login": {
          handleLogin(req, res);
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
          fileResponse(res,"html/login.html");
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
      jsonResponse(res, { success: true, message: "Login successful" });
    } else {
      throw new Error("Invalid username or password");
    }
  })
  .catch((err) => {
    reportError(res, err);
  });
}