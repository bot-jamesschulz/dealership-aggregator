const fs = require('fs');
const cheerio = require('cheerio');

// Read the HTML file
const htmlContent = fs.readFileSync('models.html', 'utf-8');

// Load the HTML content into cheerio
const $ = cheerio.load(htmlContent);

// Extract innerText from label elements within an unordered list
const labels = $('li label')
  .filter((index, element) => !$(element).attr('for').includes('ModelGroup'))
  .map((index, element) => $(element).text())
  .get();

// Print or process the extracted labels
console.log(labels);

const cleanedLabels = labels.map((label) => {
    return label
        .replace(/\s+|\n/g, ' ')
        .trim().replace(/\(.*/, '')
        .trim();
});

const json = JSON.stringify(cleanedLabels);
console.log(json);
fs.appendFile('models.json', json , 'utf-8', (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
});