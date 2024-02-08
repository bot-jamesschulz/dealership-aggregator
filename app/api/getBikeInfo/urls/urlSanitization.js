const fs = require('fs');
const urls = require('./filteredUrls.json');
const excludedDomains = JSON.parse(fs.readFileSync('./excludedDomains.json', 'utf-8'));

const results = [];

function deduplicateDomains(urls) {
    const uniqueDomains = new Set();
    const uniqueDomainUrls = [];

    for (const url of urls) {
        const domain = new URL(url).hostname;
        console.log(domain)
        if (excludedDomains.includes(domain)) continue;
        if (uniqueDomains.has(domain)) continue;
        uniqueDomains.add(domain);
        uniqueDomainUrls.push(url);
    }

    return uniqueDomainUrls;
}

const uniqueDomainUrls = deduplicateDomains(urls);
const json = JSON.stringify(uniqueDomainUrls);

fs.writeFile('./cleanedUrls.json', json , 'utf-8', (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
});