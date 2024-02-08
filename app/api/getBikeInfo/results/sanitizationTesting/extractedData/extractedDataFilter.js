const fs = require('fs');

const listings = JSON.parse(fs.readFileSync('./extractedData.json', 'utf-8'));
const results = {}



for (const listing of listings) {
    const make = listing.make.toLowerCase();

    if (results[make]) results[make].add(listing.model);
    else results[make] = new Set([listing.model]);
}

Object.entries(results).forEach(([make, models]) => {
    results[make] = Array.from(models).sort();
});



const json = JSON.stringify(results);
fs.writeFile('./extractedDataFiltered.json', json , 'utf-8', (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
});