const fs = require('fs');
const cheerio = require('cheerio');

// Read the HTML file
const htmlContent = fs.readFileSync('makes.html', 'utf-8');
console.log(`cwd: ${process.cwd()}`);
// Load the HTML content into cheerio
const $ = cheerio.load(htmlContent);

// Extract innerText from label elements within an unordered list
const labels = $('li label')
  .map((index, element) => $(element).text())
  .get();

// Print or process the extracted labels
console.log(labels);

const cleanedLabels = labels.map((label) => {
    return label
        .replace(/[^a-zA-Z\&]/g, '')
        .trim().replace(/\(.*/, '')
        .trim()
        .toLowerCase();
});

const json = JSON.stringify(cleanedLabels);
console.log(json);
fs.writeFileSync('makes.json', json , 'utf-8');