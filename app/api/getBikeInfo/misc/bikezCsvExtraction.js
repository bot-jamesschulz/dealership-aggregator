const fs = require('fs');
const csv = require('csv-parser');

const inputCsvFile = './content/all_bikez_curated.csv';

// Create an array to store the extracted data
const extractedData = {};

// Read the CSV file and extract the specified columns
fs.createReadStream(inputCsvFile)
  .pipe(csv())
  .on('data', (row) => {
    const brand = row['Brand'];
    const model = row['Model'];
    const category = row['Category'];
    if (brand in extractedData) {
      if (!extractedData[brand].some(data => data.model === model)) {
        extractedData[brand].push( {model, category} );
      }
    } else {
      extractedData[brand] = [{model, category}];
    }
  })
  .on('end', () => {
    // Save the extracted data to a new file or perform further processing
    fs.writeFileSync('../results/bikeData/bikeData.json', JSON.stringify(extractedData, null, 2));
  });