function preferenceSubmit(){
    console.log("From submitted")
    const preferredDays = document.querySelectorAll('input[name="preferredDays"]:checked');
    const notPreferredDays = document.querySelectorAll('input[name="notPreferredDays"]:checked');

    if (preferredDays.length === 0) {
        alert('Please select at least one preferred day!');
        return;
    }else if (notPreferredDays.length === 0) {
        alert('Please select at least one day you prefer NOT to work!');
        return;
    }

    async function fetchUserAndWeights() {
        try {
            // Fetch the user
            const currentUser = await client.jsonFetch("/user");
            console.log("Fetched User:", currentUser.preferences.weekdays);

            // Fetch weights and workerCount
            const vars = await client.jsonFetch("/variables");

            // Fetch the database
            try {
                const database = await client.jsonFetch("/database");
                console.log("Fetched Database:", database);
                //Do stuff

            } catch (err) {
                console.log("Could not fetch database. Is user admin?");
                console.log(err);
            }

            // Extract weights from the database
            const currentWeights = vars.algoWeights;
            console.log("Extracted Weights:", currentWeights);

            // clone the users names values into a new array
            // const userNames = database.employees.map(employee => employee.user);
            // let availableUsers = database.employees[user]
            // console.log("Available Users:", userNames);

            // Return them as an object for further use
            return { currentUser, currentWeights };
        } catch (error) {
            console.error("Error fetching user or weights:", error);
        }
    }
        fetchUserAndWeights().then(({ currentUser, currentWeights }) => {
        console.log("User:", currentUser);
        console.log("Weights:", currentWeights);

        // Example: Use the data in another function
        const dayScores = calculateDay(currentUser, currentWeights);
        const shiftScores = calculateShift(currentUser, currentWeights);
        console.log("Day Scores:", dayScores);
        console.log("Shift Scores:", shiftScores);

        const username = currentUser.user;

        const data = { username, dayScores, shiftScores };
        const entry = "user score";
        const response = client.jsonPost("/database/preferences", { data, entry });
        console.log("Response:", response);
    }).catch(error => {
        console.error("Error:", error);
    });

    // jsonFetch("/database")
    // .then(data => {
    //     console.log(data.weights)
    //     let weights = data.weights;

    //     // userPreference(data, preferredDays, notPreferredDays);
    //     // tempSoftmax(data);
    // })
    // .catch(error => console.error('Error fetching users:', error));

    // jsonFetch("/user")
    // .then(user => {
    //     console.log(user)
    //     userPreference(user, preferredDays, notPreferredDays);
    //     // tempSoftmax(user);
    // })

}



// function userPreference(user, preferredDays,notPreferredDays){

//     user.Weekday = document.getElementById("weekdays").value;
//     console.log(user.Weekday);
//     user.Weekend = document.getElementById("weekends").value;

//     preferredDays.forEach(day =>{user.preferences.preferred[day.value] = true});
//     notPreferredDays.forEach(day =>{
//         // let dayValue = day.value.replace("not", "");
//         user.preferences.notPreferred[day.value] = true
//     });

//     for (let i = 1; i < 7; i++) {
//         let shiftValue = document.getElementById(`shift${i}`).value;
//         user.preferences.shiftPreference[`shift${i}`] = shiftValue;
//     }
//     console.log(user)

// }

function softmax(array){
    let exp = array.map(number => Math.exp(number));
    let sum = exp.reduce((a, b)=> a + b, 0);
    return exp.map(expValue => expValue / sum);
}

function calculateDay(user, weights){
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let bonus = 0.5;
    let normalizeWeekday = user.preferences.weekdays / 10;
    console.log(normalizeWeekday);
    let normalizeWeekend = user.preferences.weekends / 10;
    console.log(normalizeWeekend);

    //  find preference for hver dag og brug den til shifts;
    let dayScore  = []
    for (let i = 0; i < weekdays.length; i++) {
        let weightDay = 0;
        let day = weekdays[i];
        // console.log(weights[day]);
        let isWeekend = ['Saturday', 'Sunday'].includes(day);

        if(!isWeekend){
            weightDay += weights[day] * (weights[day] * normalizeWeekday);
            weightDay -= weights[day] * (weights[day] * (1 - normalizeWeekday));
        }else{
            weightDay += weights[day] * (weights[day] * normalizeWeekend);
            weightDay -= weights[day] * (weights[day] * (1 - normalizeWeekend));
        }

        if (user.preferences.preferred.includes(day)) {
            weightDay += bonus;
        }

        if (user.preferences.notPreferred.includes(day)) {
            weightDay -= bonus;
        }

        dayScore.push(weightDay);
    }
    // console.log(dayScore);
    return dayScore;
}

function calculateShift(user, weights){
    let shiftsScore = [];
    let shift = user.preferences.shiftPreference;
    for (let i = 0; i < shift.length; i++) {
        let weightShift = 0;
        if (i <= 3) {
            weightShift += weights.Morning * shift[i];
        }else if (i <= 5) {
            weightShift += weights.Evening * shift[i];
        }else{
            weightShift += weights.Night * shift[i];
        }
        shiftsScore.push(weightShift);
    }
    console.log(shiftsScore);
    return shiftsScore;
}

// function allShiftScore(users, weights){
//     const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
//     let schedules = [];

//     for (employee of users){
//         let userSchedules = {user: employee.name, shiftPref: {}};

//         for (let day of weekdays){
//             let shiftPreference = user.preferences.shiftPreference;
//             let score = calculateShift(employee, day, shiftPreference, weights)
//             userSchedules.shiftPref[day] = score;
//         }
//         schedules.push(userSchedules);
//     }


// }

//FIX THIS:
function randomUser(probabilities, randomValue) {
    let sum = 0;
    for (let i = 0; i < probabilities.length; i++){
        sum += probabilities[i];
        if (randomValue < sum) {
            return i;
        }
    }
    // If no user is found, return the last one
    return probabilities.length - 1;
}

function normalize(probabilities) {
    let total = probabilities.reduce((a, b) => a + b, 0);
    return probabilities.map(p => p / total);
}

function assignShifts(users, employeesPerShift, maxShiftsPerEmployee){
    const schedule = {};
    let shiftCount = {};

    //Set shift count for all users to 0
    for(let employee of users){
        shiftCount[employee.user] = 0;
    }
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const shifts = ["Shift1", "Shift2", "Shift3", "Shift4", "Shift5", "Shift6", "Shift7"];

    for (let day of days){
        // Initialize the schedule for each day
        schedule[day] = {};
        for (let shift of shifts){
            schedule[day][shift] = [];

            let dayScore = users.map(user => user.score.days[day]);
            let shiftScore = users.map(user => user.score.shifts[shift]);

            let dayProbability = softmax(dayScore);
            let shiftProbability = softmax(shiftScore);

            // Combine the day and shift probabilities
            let combinedProbabilities = dayProbability.map((prob, index) => (prob + shiftProbability[index])/2);

            // Normalize the combined probabilities
            let normalizedProbabilities = normalize(combinedProbabilities);

            let availableUsers = users.map(employee => employee.user);

            for (let i = 0; i < employeesPerShift; i++){
                if (availableUsers.length === 0)
                    break;

                // Get probabilities for available users
                let currentProbs = availableUsers.map(user => {
                    let index = users.findIndex(u => u.user === user.user);
                    return normalizedProbabilities[index];
                });
                currentProbs = normalize(currentProbs);

                let selectUserIndex = randomUser(currentProbs, Math.random());
                let selectUser = availableUsers[selectUserIndex];

                if (shiftCount[selectUser] < maxShiftsPerEmployee) {
                    schedule[day][shift].push(selectUser);
                    shiftCount[selectUser] += 1;
                    availableUsers.splice(selectUserIndex, 1);

                }
            }
        }
    }
    return schedule;
}
