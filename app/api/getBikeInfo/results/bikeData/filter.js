const fs = require('fs');

const bikeData = JSON.parse(fs.readFileSync('./bikeData.json', 'utf-8'));
const results = {};




for (const make in bikeData) {
    results[make] = bikeData[make].map(model => ({ model: model.model.toLowerCase(), category: model.category }));
}

const json = JSON.stringify(results);
fs.writeFile('./bikeDataLower.json', json , 'utf-8', (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
});