const fs = require('fs');

const listings = JSON.parse(fs.readFileSync('listingsCleanTest1-27_15-42-35.json', 'utf-8'));


const textContent = listings.join('\n');

fs.writeFileSync('listings.txt', textContent , 'utf-8');