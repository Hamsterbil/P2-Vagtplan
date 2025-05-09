// const { calculateDay } = require('./scheduler').calculateDay;
// const { calculateShift } = require('./scheduler').calculateShift;
const { softmax, calculateDay, calculateShift } = require('./PublicResources/js/scheduler')

test('softmax', () => {
    const result = softmax([10, 10, 10]);
    expect(result).toEqual([1/3, 1/3, 1/3]);
});

test('calculateDay', () => {
    const user = {
        preferences: {
            weekdays: 7,
            weekends: 3,
            preferred: ['Monday', 'Wednesday', 'Thursday'],
            notPreferred: ['Friday', 'Saturday', 'Sunday']
        }
    }
    const weights = {
        "Monday": 1,
        "Tuesday": 2,
        "Wednesday": 2,
        "Thursday": 2,
        "Friday": 1,
        "Saturday": 1.5,
        "Sunday": 1.5
    }
    const result = calculateDay(user, weights);
    const expected = [0.9, 1.6, 2.1, 2.1, -0.1, -1.4, -1.4];
    result.forEach((number, index) => {
        expect(number).toBeCloseTo(expected[index], 1);
    });
})

test('calculateShift', () => {
    const user  = {
        preferences: {
            shiftPreference: [4, 7, 4, 5, 6, 6, 10]
        }
    }
    const weights = {
        "Morning": 2,
        "Evening": 2,
        "Night": 1
    }

    const result = calculateShift(user, weights);
    const expected = [8, 14, 8, 10, 12, 12, 10];

    expect(result).toEqual(expected);

})