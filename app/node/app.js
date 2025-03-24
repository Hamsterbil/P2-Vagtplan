export {selectUserEntries, getEntries};
import { ValidationError } from "./router.js";

//remove potentially dangerous/undesired characters 
function sanitize(str){
  str=str
.replace(/&/g, "")
.replace(/</g, "")
.replace(/>/g, "")
.replace(/"/g, "")
.replace(/'/g, "")
.replace(/`/g, "")
.replace(/\//g, "");
return str.trim();
}

//helper function for validating form data 
function validateUserName(userName){
  let name=sanitize(userName); 
  let nameLen=name.length;
  if((nameLen>=minNameLength) && (nameLen<=maxNameLength)) 
     return name;
  throw(new Error(ValidationError)); //Exceptions treated in a future class
}

/* "Database" emulated by maintained an in-memory array of Data objects 
   Higher index means newer data record: you can insert by simply 
  'push'ing new data records */

let sampleData={};
let DB=[sampleData];

function selectUserEntries(userName){
  return DB.filter(e=>e.userName===userName);
}

function getEntries(){
  return DB;
}