
const puppeteer = require('puppeteer-extra')

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

async function vehicleTitleAnchorSearch(page,vehicleMakes) {
  let vehicleInfo = {};
  for (const make of vehicleMakes) {
    const xpath = `//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${make}")]`;
    const elementHandles = await page.$x(xpath);

    // Map through elementHandles that contain the make i.e. 'yamaha', and return the text content and href
    const makeElementInfoList = await Promise.all(elementHandles.map(async elementHandle => await page.evaluate(element => ({"content": element.textContent,"href": element.getAttribute("href")}), elementHandle)));
    
    
    
    makeElementInfoList.forEach(({ content, href }) => {
      // Look for a substring of 4 digits
      
      const yearPattern = /(\d{4})/g;
      const matches = content.match(yearPattern);
      const lowerBound = 1950;
      const upperBound = 2025;
      let validMatches;
      console.log(`content: ${content}`);
      console.log(`href: ${href}`);
      // Check if the digit substring is in a year range
      if (matches) {
        console.log("matches found")
        validMatches = matches.filter(match => {
          const year = parseInt(match);
          return year >= lowerBound && year <= upperBound;
        });
      }

      let validUrl;
      if (validMatches) {
        validUrl = getNewUrl(href, page);
        if (vehicleInfo[make]) {
          vehicleInfo[make].push({"title": content, "url": validUrl});
        } else {
          vehicleInfo[make] = [{"title": content, "url": validUrl}];
        }
      } 
    });
  }
  return vehicleInfo;
}

function logNestedObject(obj, indent = '') {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (typeof value === 'object' && value !== null) {
        // If the value is an object, recursively log its keys and values
        console.log(`${indent}${key}:`);
        logNestedObject(value, `${indent}  `);
      } else {
        // If the value is not an object, log the key and value
        console.log(`${indent}${key}: ${value}`);
      }
    }
  }
}

function getNewUrl(href,page) {
  let newUrl

  if (href.includes("http")) {
    newUrl = href;
  } else {
    const url = page.url();
    const indexOfDotCom = url.indexOf(".com");
    newUrl = `${url.substring(0, indexOfDotCom + 4)}${href}`;
  }

  return encodeURI(newUrl)
}

async function sortedAnchorHrefs(page,searchTexts,anchorContentSearch) {
  let sortedHrefs = {};

  // Search for keywords in the text content of the anchors
  if (anchorContentSearch) {
    const xpath = `//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${anchorContentSearch}")]`; 
    const elementHandles = await page.$x(xpath);
    
    if (elementHandles.length > 0) {
      // Pull the hrefs from the anchors
      const tempHrefs = await Promise.all(elementHandles.map(async elem => await page.evaluate(element => element.getAttribute('href').toLowerCase(), elem)));
      
      // Keywords to search for in the hrefs. Find the one for each and add them to matchHref if they exist
      for (const keyword of searchTexts) {
        const matchingHref = tempHrefs.find(href => href.includes(keyword));
        let newUrl;
        if (matchingHref) {
          if (matchingHref.includes("http")) {
            newUrl = matchingHref;
          } else {
            const url = page.url();
            const indexOfDotCom = url.indexOf(".com");
            newUrl = `${url.substring(0, indexOfDotCom + 4)}${matchingHref}`;
          }
          sortedHrefs[keyword] = newUrl;
        }
      }
    }
    return sortedHrefs;
  // Search for keywords in the hrefs
  } else {
    for (const searchText of searchTexts) {
      const xpath = `//a[contains(translate(@href, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${searchText}") and not(contains(@href, '#'))]`; 
      const elementHandles = await page.$x(xpath);
      
      if (elementHandles.length > 0) {
        const href = await page.evaluate(element => element.getAttribute('href').toLowerCase(), elementHandles[0]);

        let newUrl;
        if (href.includes("http")) {
          newUrl = href;
        } else {
          const url = page.url();
          const indexOfDotCom = url.indexOf(".com");
          newUrl = `${url.substring(0, indexOfDotCom + 4)}${href}`;
        }
        sortedHrefs[searchText] = newUrl;
        
      }
    }
    return sortedHrefs;
  }
  
}

async function getHrefs (url, browser) {
  let page;
  try {
    page = await browser.newPage();
    let hrefs;
    const inventoryKeywords = ["new","used","all","owned","inventory"];
    const homeKeywords = ["home"];

    await page.goto(url,{ waitUntil: 'networkidle2' });
    
    // First make sure we are on the home page
    hrefs = await sortedAnchorHrefs(page,homeKeywords);
    if (hrefs["home"]) {
      await page.goto(hrefs["home"],{ waitUntil: 'networkidle2' });
    }
    // Search for links to
    hrefs = await sortedAnchorHrefs(page,inventoryKeywords,"inventory");
  
  return hrefs;
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await page.close();
  }
}

async function getBasicInfo(url,browser) {
  console.log("getting basic info");
  const makes = ['benelli', 'beta', 'bmw', 'can-am', 'ducati', 'greenger', 'hisun', 'honda', 'husqvarna', 'indian', 'karavan', 'kawasaki', 'ktm', 'kymco', 'mv agusta', 'polaris', 'ssr', 'stacyc', 'suzuki', 'triumph', 'yamaha'];
  let page;
  try {
    page = await browser.newPage();
    await page.goto(url,{ waitUntil: 'networkidle2' });
    console.log("on inventory page");
    const listings = await vehicleTitleAnchorSearch(page,makes);
    console.log(`Listings for: ${url}`);
    logNestedObject(listings);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await page.close();
  }
}

export default async function getInfo(urls) {
  let browser;
  try {
    browser = await puppeteer.launch({headless: false});
    // Get the hrefs that link to inventory pages
    let allSitesHrefs = [];
    for (const url of urls) {
      let hrefs = await getHrefs(url, browser); // Synchronous
      
      if (hrefs["new"]) {
        if (hrefs["owned"]) {
          await getBasicInfo(hrefs["new"], browser);
          await getBasicInfo(hrefs["owned"], browser);
        } else if (hrefs["used"]) {
          await getBasicInfo(hrefs["new"], browser);
          await getBasicInfo(hrefs["used"], browser);
        }
      } else if (hrefs["inventory"]){
        await getBasicInfo(hrefs["inventory"], browser);
      } else if (hrefs["all"]) {
          await getBasicInfo(hrefs["all"], browser);
      } else {
        console.log("No anchors found");
      }
      allSitesHrefs.push(hrefs);
    }
    //const allSitesHrefs = await Promise.all(urls.map(async url => getHrefs(url,browser))) // Asynchronous
    
    //console.log("allSitesHrefs:", allSitesHrefs);

  

    return "All the info";

  } catch (error) {
  console.error('Error:', error);
  } finally {
    await browser.close();
  }
}