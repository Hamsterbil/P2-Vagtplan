


document.getElementById('preferencesForm').addEventListener('submit',function(event){
    event.preventDefault();
    const preferredDays = document.querySelectorAll('input[name="preferredDays"]:checked');
    const notPreferredDays = document.querySelectorAll('input[name="notPreferredDays"]:checked');

    if (preferredDays.length === 0) {
        alert('Please select at least one preferred day!');
        return;
    }else if (notPreferredDays.length === 0) {
        alert('Please select at least one day you prefer NOT to work!');
        return;
    }
    fetch("Users.json")
        .then(response => response.json())
        .then(data => { userPreference(data, preferredDays, notPreferredDays),
                        softmax(data)
            
        })
        .catch(error => console.error('Error fetching JSON:', error));

    
});

function userPreference(data, preferredDays,notPreferredDays){

    data.employees[0].Weekday = document.getElementById("weekdays").value;
    // console.log(data.employees[0].Weekday);
    data.employees[0].Weekend = document.getElementById("weekends").value;

    preferredDays.forEach(day =>{data.employees[0].Preferred[day.value] = true});
    notPreferredDays.forEach(day =>{
        let dayValue = day.value.replace("not", "");
        data.employees[0].NotPreferred[dayValue] = true
    });

    for (let i = 1; i < 7; i++) {
        let shiftValue = document.getElementById(`shift${i}`).value;
        data.employees[0].ShiftPreference[`shift${i}`] = shiftValue;
    }
    data.employees[0].id = data.employees[0].user + data.employees[0].password
    console.log(data.employees[0].id)
    console.log(data)

}

function softmax(data){
    
    let weekMax = new Array();
    for (let i = 0; i < 2; i++) {
        let value = document.getElementById(i === 0 ? "weekdays" : "weekends").value;
        weekMax.push(value);
    }

    let weekdayMax = Math.E ** weekMax[0] / (Math.E ** weekMax[0] + Math.E ** weekMax[1]);
    let weekendMax = Math.E ** weekMax[1] / (Math.E ** weekMax[0] + Math.E ** weekMax[1]);

    console.log(weekdayMax);
    console.log(weekendMax);

    console.log(weekdayMax+weekendMax);

    weekMax[0] = weekdayMax;
    weekMax[1] = weekendMax;


    let shiftTotal = 0
    for (let i = 1; i <= 7; i++) {
        let shiftValue = parseFloat(document.getElementById(`shift${i}`).value);
        data.employees[0].ShiftPreference[`shift${i}`] = shiftValue;
        shiftTotal += Math.E ** shiftValue;
        
    }

    let shiftMax = [];
    for (let i = 1; i <= 7; i++) {
        let shiftValue = parseFloat(document.getElementById(`shift${i}`).value);
        shiftMax.push(Math.E ** shiftValue / shiftTotal);
        
    }

    let sum = 0;
    for (let i = 0; i < shiftMax.length; i++) {
        // sum += shiftMax[i];
        // console.log(sum);
        console.log(shiftMax[i]);
    }

    // return weekMax;

}