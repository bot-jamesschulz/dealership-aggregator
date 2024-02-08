const fs = require('fs');
const makes = require('../makesModels/makes.json')

const listings = JSON.parse(fs.readFileSync('../listings/makeAppendedUniqueListings1-27_15-42-35.json', 'utf-8'));
const excludedWords = JSON.parse(fs.readFileSync('./excludedWords.json', 'utf-8'));
const results = [];




for (const listing of listings) {
    
    const alphaNumListing = listing.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
    if (makes.some(make => alphaNumListing.includes(make)) && !excludedWords.some(word => alphaNumListing.includes(word))) {
        const cleanedListing = listing.replace(/\s+/g, ' ').trim()
        results.push(cleanedListing);
    }
}

const json = JSON.stringify(results);
fs.writeFile('./hasMakeAndNoExcludedWords.json', json , 'utf-8', (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
});