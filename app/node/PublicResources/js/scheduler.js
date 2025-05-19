// export {scheduler}

// Using IIFE to encapsulate the client code and avoid polluting the global namespace
var scheduler = (function() {
return {
    preferenceSubmit: function() {
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
            const dayScores = this.calculateDay(currentUser, currentWeights);
            const shiftScores = this.calculateShift(currentUser, currentWeights);
            // const dayScores = employees.map(currentUser => calculateDay(currentUser, currentWeights));
            // const shiftScores = employees.map(currentUser => calculateShift(currentUser, currentWeights));
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
    
    },

    generate: async function() {
        console.log("Generate schedule")
        const database = await client.jsonFetch("/database");
        users = database.users;
        const vars = await client.jsonFetch("/variables");
        const weights = vars.algoWeights;
        // console.log("Fetched Database:", database);
        // console.log("Users:", users);
        // console.log("Users score:", users[2].score.days);
        // users.forEach(user => {
        //     if (!user.score) {
        //         console.error(`User ${user.user} is missing a score object`);
        //     } else if (!user.score.days) {
        //         console.error(`User ${user.user} is missing score.days`);
        //     } else if (!user.score.shifts) {
        //         console.error(`User ${user.user} is missing score.shifts`);
        //     }
        // });
        // day and shift calculations for all users
        users.forEach(user => {
            if(user.type === "employee"){
                //If user.preferences is not set, set it to default values
                if (!user.score) {
                    user.score = {days: [], shifts: []};
                } else if (!user.score.days) {
                    user.score.days = [];
                } else if (!user.score.shifts) {
                    user.score.shifts = [];
                }
                user.score.days = this.calculateDay(user, weights);
                user.score.shifts = this.calculateShift(user, weights);
            }
        });
        console.log("Generate schedule");
        const employeesPerShift = 3;
        //Start from first of current month
        const startDate = new Date();
        startDate.setDate(1);
        const weeksAmount = 4;
        const schedule = this.assignShifts(users, employeesPerShift, 2220, weeksAmount, startDate);
        const formattedSchedule = this.outputSchedule(schedule, startDate);
        console.log(formattedSchedule);
    
        
        const data = { formattedSchedule };
        client.jsonPost("/database", { data, entry: "schedule" })
        .then(response => {
            console.log("Schedule saved successfully:", response);
        });
    },

    softmax: function(array) {
        let exp = array.map(number => Math.exp(number));
        let sum = exp.reduce((a, b)=> a + b, 0);
        return exp.map(expValue => expValue / sum);
    },

    calculateDay: function(user, weights) {
        const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        let bonus = 2;
        let normalizeWeekday = user.preferences.weekdays / 10;
        let normalizeWeekend = user.preferences.weekends / 10;
        
        //  find preference for hver dag og brug den til shifts;
        let dayScore  = []
        for (let i = 0; i < weekdays.length; i++) {
            let weightDay = 0;
            let day = weekdays[i];
            let isWeekend = ['Saturday', 'Sunday'].includes(day);

            if(!isWeekend){
                weightDay += weights[day] * (weights[day] * normalizeWeekday);
                // weightDay -= weights[day] * (weights[day] * (1 - normalizeWeekday));
            }else{
                weightDay += weights[day] * (weights[day] * normalizeWeekend);
                // weightDay -= weights[day] * (weights[day] * (1 - normalizeWeekend));
            }

            if (user.preferences.preferred.includes(day)) {
                weightDay += bonus;
            }

            if (user.preferences.notPreferred.includes(day)) {
                weightDay -= bonus;
            }

            dayScore.push(weightDay);
        }
        return dayScore;
    },

    calculateShift: function(user, weights) {
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
        return shiftsScore;
    },

    randomUser: function(probabilities, randomValue) {
        let sum = 0;
        for (let i = 0; i < probabilities.length; i++){
            sum += probabilities[i];
            if (randomValue < sum) {
                return i;
            }
        }
        // If no user is found, return the last one
        return probabilities.length - 1;
    },

    normalize: function(probabilities) {
        let total = probabilities.reduce((a, b) => a + b, 0);
        return probabilities.map(p => p / total);
    },

    assignShifts: function(users, employeesPerShift, maxMinutesPerEmployee, weeksAmount, startDate) {
        const schedule = {};
        let minuteCount = {};
        let weeklyMinuteCount = {};
        let assignedUsers = {};
    
        const employees = users.filter(user => user.type === "employee");
        // console.log("Employees:", employees);
        //Set shift count for all users to 0
        for(let employee of employees){
            minuteCount[employee.user] = 0;
            weeklyMinuteCount[employee.user] = [];
        }
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
        const startDayIndex = new Date(startDate).getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const adjustedDays = [];
        for (let i = startDayIndex; i < days.length; i++) {
            adjustedDays.push(days[i]);
        }
        for (let i = 0; i < startDayIndex; i++) {
            adjustedDays.push(days[i]);
        }
        console.log(adjustedDays);    
    
        const shifts = ["Shift1", "Shift2", "Shift3", "Shift4", "Shift5", "Shift6", "Shift7"];
        const shiftTime = {
            "Shift1": 444,
            "Shift2": 480,
            "Shift3": 444,
            "Shift4": 480,
            "Shift5": 480,
            "Shift6": 480,
            "Shift7": 480
        }
        for (let week = 0; week < weeksAmount; week++){
            for (let day of adjustedDays){
            // Initialize the schedule for each day
                let dayIndex = days.indexOf(day);
                const weekdayInfo = `Week${week + 1}-${day}`;
                schedule[weekdayInfo] = {};
                assignedUsers[weekdayInfo] = [];
    
                for (let shift of shifts){
                    let shiftIndex = shifts.indexOf(shift);
                    // Initialize the schedule for each shift on the day
                    schedule[weekdayInfo][shift] = [];
    
                    // Get the scores for the current day and shift for all employees
                    let dayScore = employees.map(user => user.score.days[dayIndex]);
                    let shiftScore = employees.map(user => user.score.shifts[shiftIndex]);
    
                    // Calculate softmax for day and shift scores
                    let dayProbability = this.softmax(dayScore);
                    let shiftProbability = this.softmax(shiftScore);
    
    
                    // Combine the day and shift probabilities
                    let combinedProbabilities = dayProbability.map((prob, index) => (prob + shiftProbability[index]) / 2);
    
                    // Normalize the combined probabilities
                    let normalizedProbabilities = this.normalize(combinedProbabilities);
    
                    // Get the available employees for the current day and shift
                    let availableUsers = employees.map(employee => employee.user).filter(user => minuteCount[user] < maxMinutesPerEmployee);
    
                    let attempts = 0;
                    let maxAttempts = availableUsers.length * 2;
    
                    while (schedule[weekdayInfo][shift].length < employeesPerShift && attempts < maxAttempts) {
                        if (availableUsers.length === 0)
                            break;
    
                        // Adjust probabilities based on minute count
                        let adjustedProbabilities = employees.map((employee, index) => {
                            let minutes = minuteCount[employee.user];
                            let penalty = 1 / Math.pow(1 + minutes, 5);
                            let preferenceMultiplier = employee.preferences.preferred.includes(day) ? 5 : 1;
                            
                            return normalizedProbabilities[index] * penalty * preferenceMultiplier;
                        });
                        
                        // Get probabilities for available employees
                        let currentProbs = availableUsers.map(user => {
                            let index = employees.findIndex(u => u.user === user);
                            return adjustedProbabilities[index];
                        });
    
                        currentProbs = this.normalize(currentProbs);
    
                        let selectUserIndex = this.randomUser(currentProbs, Math.random());
                        let selectUser = availableUsers[selectUserIndex];
    
                        if (assignedUsers[weekdayInfo].includes(selectUser) || minuteCount[selectUser] + shiftTime[shift] >= maxMinutesPerEmployee) {
                            attempts++;
                            continue;
                        }
                        schedule[weekdayInfo][shift].push(selectUser);
                        minuteCount[selectUser] += shiftTime[shift];
                        assignedUsers[weekdayInfo].push(selectUser);
                        availableUsers.splice(selectUserIndex, 1);
                        attempts = 0;
                    }
                }
            } 
    
            for (let user in minuteCount){
                weeklyMinuteCount[user].push(minuteCount[user]);
                minuteCount[user] = 0;
            }
        }
        console.log("Schedule:", schedule);
        console.log("Minute Count:", weeklyMinuteCount);
        return schedule;
    },

    outputSchedule: function(schedule, startDate) {
        const shiftDetails = {
            "Shift1": {dayTime: "Morning", start: "07:00", minutes: 444},
            "Shift2": {dayTime: "Morning", start: "07:00", minutes: 480},
            "Shift3": {dayTime: "Morning", start: "08:00", minutes: 444},
            "Shift4": {dayTime: "Morning", start: "08:00", minutes: 480},
            "Shift5": {dayTime: "Evening", start: "11:00", minutes: 480},
            "Shift6": {dayTime: "Evening", start: "15:00", minutes: 480},
            "Shift7": {dayTime: "Night", start: "23:00", minutes: 480}
        };
        // const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        let output = []
        let date = new Date(startDate);
    
        for (let weekday in schedule){
            // let currentDate = new Date(date);
            // let dayIndex = days.indexOf(day);
            let dateFormatted = date.toISOString().split('T',1);
    
            for (let shift in schedule[weekday]){
                for (let employee of schedule[weekday][shift]){
                    output.push({
                        // week: weekday.split('-')[0],
                        date: dateFormatted,
                        shift: shiftDetails[shift].dayTime,
                        start: shiftDetails[shift].start,
                        minutes: shiftDetails[shift].minutes,
                        user: employee
                    })
                }
            }
            date.setDate(date.getDate() + 1);
        }
        // console.log(output);
        return output;
    }
}
})();