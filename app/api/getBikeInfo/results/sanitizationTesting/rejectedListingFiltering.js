const fs = require('fs');

const listings = JSON.parse(fs.readFileSync('./rejectedListings.json', 'utf-8'));
const results = [];
const excludedWords = [
    'can-am',
    'canam',
    'can am',
    'sea-doo',
    'seadoo',
    'sea doo',
    'polaris',

];






for (const listing of listings) {
    
    const alphaNumListing = listing.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
    if (!excludedWords.some(word => alphaNumListing.includes(word))) results.push(listing);
}

const json = JSON.stringify(results);
fs.writeFile('./rejectedListingsFiltered.json', json , 'utf-8', (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
});