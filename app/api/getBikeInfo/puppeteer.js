const puppeteer = require('puppeteer-extra')

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

// Search for anchor content that includes one of the make from vehicleMakes
async function vehicleTitleAnchorSearch(page,vehicleMakes) {
  let vehicleInfo = {};

  console.log("Searching for anchor titles on:", page.url())
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
      // Check if the digit substring is in a year range
      if (matches) {
        validMatches = matches.filter(match => {
          const year = parseInt(match);
          return year >= lowerBound && year <= upperBound;
        });
      }

      let validUrl;
      if (validMatches) {
        // Clean string
        const trimmedContent = content.trim().split('\n')[0];
        validUrl = getNewUrl(href, page);
        if (vehicleInfo[make]) {
          vehicleInfo[make].push({"title": trimmedContent, "url": validUrl});
        } else {
          vehicleInfo[make] = [{"title": trimmedContent, "url": validUrl}];
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

async function goToNewTab(url, browser) {
  const page = await browser.newPage();
  await page.goto(url,{ waitUntil: 'networkidle2' });
  return page;
}

async function getInventoryPages (url, browser) {
  let page;
  try {
    page = await goToNewTab(url,browser);
    let hrefs;
    let inventoryPages = new Map();
    const inventoryKeywords = ["new","used","all","owned","inventory"];
    const homeKeywords = ["home"];

    // First make sure we are on the home page
    hrefs = await sortedAnchorHrefs(page,homeKeywords);
    if (hrefs["home"]) {
      await page.goto(hrefs["home"],{ waitUntil: 'networkidle2' });
    }
    // Search for links to inventory pages
    hrefs = await sortedAnchorHrefs(page,inventoryKeywords,"inventory");

    // Decide which inventory pages to create depending on which inventory page types were found
    if (hrefs["new"]) {
      inventoryPages.set("new", await goToNewTab(hrefs["new"],browser));  
      if (hrefs["owned"]) { 
        inventoryPages.set("owned", await goToNewTab(hrefs["owned"],browser));
      } else if (hrefs["used"]) {
        inventoryPages.set("used", await goToNewTab(hrefs["used"],browser));
      }
    } else if (hrefs["inventory"]){
      inventoryPages.set("inventory", await goToNewTab(hrefs["inventory"],browser));
    } else if (hrefs["all"]) {
      inventoryPages.set("all", await goToNewTab(hrefs["all"],browser));
    } else {
      console.log("No anchors found");
    }

  console.log("Inventory pages retrieved");
  return inventoryPages;
  } catch (error) {
    console.error('Error getting inventory pages:', error);
  } finally {
    await page.close();
  }
}

async function getListings(page) {
  console.log("getting listings on:", page.url());
  const makes = ['benelli', 'beta', 'bmw', 'can-am', 'ducati', 'greenger', 'hisun', 'honda', 'husqvarna', 'indian', 'karavan', 'kawasaki', 'ktm', 'kymco', 'mv agusta', 'polaris', 'ssr', 'stacyc', 'suzuki', 'triumph', 'yamaha'];
  try {
    const listings = await vehicleTitleAnchorSearch(page,makes);
    console.log(`Listings for: ${page.url()}`);
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
      const inventoryPages = await getInventoryPages(url, browser);
      
      for (const  [inventoryType,page] of inventoryPages){
        console.log(`Getting '${inventoryType}' listings for ${page.url()}`)
        await getListings(page);
      }

      allSitesHrefs.push(inventoryPages);
    }
    //const allSitesHrefs = await Promise.all(urls.map(async url => getInventoryPages(url,browser))) // Asynchronous
    
    //console.log("allSitesHrefs:", allSitesHrefs);

  

    return "All the info";

  } catch (error) {
  console.error('Error:', error);
  } finally {
    await browser.close();
  }
}