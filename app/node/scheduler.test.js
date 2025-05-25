// const { softmax, calculateDay, calculateShift, normalize, randomUser } = require('./PublicResources/js/scheduler')
const scheduler = require('./PublicResources/js/scheduler');
const { softmax, calculateDay, calculateShift, normalize, randomUser } = scheduler;
// import puppeteer from 'puppeteer';
const puppeteer = require('puppeteer');

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
            shiftPreference: [4, 7, 4]
        }
    }
    const weights = {
        "Morning": 2,
        "Evening": 2,
        "Night": 1
    }

    const result = calculateShift(user, weights);
    const expected = [8, 14, 4];

    expect(result).toEqual(expected);

})

test('normalize', () => {
    const result = normalize([10,10,10]);
    expect(result).toEqual([1/3, 1/3, 1/3]);
})

describe('randomUser', () => {
    test('should return correct index based on random value', () => {
        const probs = [0.1, 0.2, 0.3, 0.4];

        expect(randomUser(probs, 0.05)).toBe(0);
        expect(randomUser(probs, 0.15)).toBe(1);
        expect(randomUser(probs, 0.35)).toBe(2);
        expect(randomUser(probs, 0.85)).toBe(3);
    });
    test('should return last index if random value is 1', () => {
        const probs = [0.1, 0.2, 0.3, 0.4];
        expect(randomUser(probs, 1)).toBe(3);
    });
    test('fallback case', () => {
        const probs = [0, 0, 0];
        expect(randomUser(probs, 0.1)).toBe(2); // 
    });
})
test('change preferences', async () => {
    let updatedPreferences;
    let originalPreferences;

        const browser = await puppeteer.launch({
            headless: false, 
            slowMo: 20,
            args: ['--window-size=1920,1080'],
        });
        // accepts all dialog (Succes notice at end of test)
    try {
        const page = await browser.newPage();
        page.on('dialog', async (dialog) => {
            await dialog.accept();
        });
         // Navigate from login page to settings and change preferences
        await page.goto('http://localhost:3000/html/login.html');
        await page.reload();
        await page.waitForSelector('#username');
        await page.type('#username', 'Anton');
        await page.waitForSelector('#password');
        await page.type('#password', 'HfgR74GD');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        //Now at the planner page 
        await page.click('#settingsBtn');
        // Now at the settings/preferences page
        const currentWeekdays = parseInt(await page.$eval('#weekdays', el => el.value),10);
        let originalWeekdays;
        let variableWeekdays;
        if (currentWeekdays ===1) {
            variableWeekdays = currentWeekdays +9;
            await page.select('#weekdays', '' + variableWeekdays);
            originalWeekdays = currentWeekdays;
        }  else if (currentWeekdays <=10) {
            variableWeekdays = currentWeekdays -1
            await page.select('#weekdays', '' + variableWeekdays);
            originalWeekdays = currentWeekdays;
         }

        const currentWeekends = parseInt(await page.$eval('#weekends', el => el.value),10);
        let originalWeekends;
        let variableWeekends;
        if (currentWeekends ===1) {
            variableWeekends = currentWeekends +9;
            await page.select('#weekends', '' + variableWeekends);
            originalWeekends = currentWeekends;
        }  else if (currentWeekends <=10) {
            variableWeekends = currentWeekends -1
            await page.select('#weekends', '' + variableWeekends);
            originalWeekends = currentWeekends;
         }
        await page.click('button[type="submit"]');
        const updatedWeekdays = parseInt(await page.$eval('#weekdays', el => el.value),10);
        const updatedWeekends = parseInt(await page.$eval('#weekends', el => el.value),10);

        originalPreferences = {
            preferences: {
                weekdays: originalWeekdays,
                weekends: originalWeekends
            }
        };
       
        updatedPreferences = {
            preferences: {
                weekdays: updatedWeekdays,
                weekends: updatedWeekends 
         }
        };
        // Check the new preferences
        expect(updatedPreferences.preferences.weekdays).not.toEqual(originalPreferences.preferences.weekdays);
        expect(updatedPreferences.preferences.weekends).not.toEqual(originalPreferences.preferences.weekends);  
        expect(updatedPreferences).not.toEqual(originalPreferences);

        expect(updatedPreferences).not.toEqual(null);
        expect(updatedPreferences).not.toEqual(undefined);
    } finally {
        await browser.close();
    }  
    const browserCheck = await puppeteer.launch({
            headless: false, 
            slowMo: 20,
            args: ['--window-size=1920,1080'],
        });
        // accepts all dialog (Succes notice at end of test)
    try {
        const page = await browserCheck.newPage();
        page.on('dialog', async (dialog) => {
            await dialog.accept();
        });
         // Navigate from login page to settings and change preferences
        await page.goto('http://localhost:3000/html/login.html');
        await page.reload();
        await page.waitForSelector('#username');
        await page.type('#username', 'Anton');
        await page.waitForSelector('#password');
        await page.type('#password', 'HfgR74GD');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        //Now at the planner page 
        await page.click('#settingsBtn');
        // Now at the settings/preferences page
        const checkedWeekdays = parseInt(await page.$eval('#weekdays', el => el.value),10);
        const checkedWeekends = parseInt(await page.$eval('#weekends', el => el.value),10);
        const checkedPreferences = {
            preferences: {
                weekdays: checkedWeekdays,
                weekends: checkedWeekends
            }
        };

        expect(checkedPreferences.preferences.weekdays).toEqual(updatedPreferences.preferences.weekdays);
        expect(checkedPreferences.preferences.weekends).toEqual(updatedPreferences.preferences.weekends);
        expect(checkedPreferences).toEqual(updatedPreferences)
        expect(checkedPreferences).not.toEqual(null);
        expect(checkedPreferences).not.toEqual(undefined);
    
    } finally{
        await browserCheck.close();
    }
    },50000);