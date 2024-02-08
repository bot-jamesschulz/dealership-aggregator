const fs = require('fs');

const bikeData = JSON.parse(fs.readFileSync('./bikeData.json', 'utf-8'));

const makes = Object.keys(bikeData);

fs.writeFileSync('./makes.json', JSON.stringify(makes, null, 2));