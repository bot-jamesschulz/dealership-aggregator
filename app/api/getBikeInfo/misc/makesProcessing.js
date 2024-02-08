const fs = require('fs');
const makes = JSON.parse(fs.readFileSync('../results/bikeData/makes.json', 'utf-8'));
const makesRegexes = JSON.parse(fs.readFileSync('../results/bikeData/makesRegexes.json', 'utf-8'));

const results = {};

for (let i = 0; i < makes.length; i++) {
    results[makesRegexes[i]] = makes[i];
}

fs.writeFileSync('../results/bikeData/regexToMake.json', JSON.stringify(results) , 'utf-8');