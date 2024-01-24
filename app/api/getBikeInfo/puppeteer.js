const puppeteer = require('puppeteer-extra');

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());


/**
 * Retrieves the listings of vehicles from a web page.
 * 
 * @param {Page} page - The Puppeteer page object.
 * @param {string[]} vehicleMakes - An array of vehicle makes to search for.
 * @returns {Object} - An object containing the vehicle information.
 */
async function pageListings(page, vehicleMakes) {
  let vehicleInfo = {};
  const listings = [];
  const listingUrls = [];


  // Get all anchor elements
  const anchorHandles = await page.$$('a');

  // Get the content/attributes from the anchors
  const anchorData = await Promise.all(anchorHandles.map(async (anchorHandle) => {
    const innerText = await anchorHandle.evaluate(node => node.innerText);
    const href = await anchorHandle.evaluate(node => node.getAttribute("href"));
    
    return { innerText, href };
  }));
 
  console.log("Searching for listings on:", page.url())

  // Alternative
  const yearPattern = /(\d{4})/g;
  for (const { innerText, href } of anchorData ) {
    const trimmedText = innerText.trim().replace(/\r?\n|\r/,' ');
    // Look for substrings of 4 digits
    const matches = trimmedText.match(yearPattern);
    const lowerBound = 1950;
    const upperBound = new Date().getFullYear() + 2;
    
    // Check if any of the digit substrings are in the correct range
    const validMatch = matches?.find(match => {
        const year = parseInt(match);
        return year >= lowerBound && year <= upperBound;
      });
    if (validMatch) {
      const validUrl = getNewUrl(href, page);
      if (!listingUrls.includes(validUrl)) {

        listingUrls.push(validUrl);
        listings.push({listing: innerText, url: validUrl})
      }
    }
  }; 


  // Look through anchorData for innerText that includes the make
  // for (const make of vehicleMakes) {
    
  //   // Look through anchors that include the make and check if they are valid listings
  //   anchorData.forEach(({ innerText, href }) => {
  //     const trimmedText = innerText.trim().replace(/\r?\n|\r/,' ');
      
  //     // Split the string into an array of words
  //     // const words = trimmedText.split(/\s+/);

  //     if (!innerText || !trimmedText.toLowerCase().includes(make)) {
  //       return;
  //     };

  //     // First word should either be a 4 digit number or a keyword
  //     const yearPattern = /(\d{4})/g;
  //     const validFirstWords = ['owned', 'new', 'used'];
  //     const words = trimmedText.split(/\s+/);
  //     const firstWord = words[0];

  //     const isValidFirstWord = validFirstWords.some(validWord => firstWord.toLowerCase().includes(validWord)) ||  yearPattern.test(firstWord);

  //     if (!isValidFirstWord) {
  //       return;
  //     }

  //     // Look for substrings of 4 digits
  //     const matches = trimmedText.match(yearPattern);
  //     const lowerBound = 1950;
  //     const upperBound = new Date().getFullYear() + 2;
      
  //     // Check if any of the digit substrings are in the correct range
  //     const validMatches = matches?.find(match => {
  //         const year = parseInt(match);
  //         return year >= lowerBound && year <= upperBound;
  //       });

  //     // If we have a valid title then add it to vehicleInfo
  //     if (validMatches) {
  //       const validUrl = getNewUrl(href, page);

  //       if (!listingUrls.includes(validUrl)) {

  //         listingUrls.push(validUrl);

  //         if (vehicleInfo[make]) {   
  //             vehicleInfo[make].push({"title": trimmedText, "url": validUrl});
  //         } else {
  //           vehicleInfo[make] = [{"title": trimmedText, "url": validUrl}];
  //         }
  //       }
  //     } 
  //   });
  // }
  
  return listings;
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
  try {
    const newUrl = new URL(href,  page.url())
    return newUrl.href;
  } catch (error) {
    console.log("Error creating new url:", error)
    return null
  }
}

/**
 * Retrieves sorted anchor hrefs based on search criteria.
 * @param {Page} page - The Puppeteer page object.
 * @param {string[]} searchTexts - An array of keywords to search for.
 * @param {string} anchorContentSearch - The keyword to search for in the text content of the anchors.
 * @returns {Object} - An object containing the sorted hrefs.
 */
async function sortedAnchorHrefs(page,searchTexts,anchorContentSearch) {
  let sortedHrefs = {};
  try {
    // Search for keywords in the text content of the anchors
    if (anchorContentSearch && searchTexts.length > 0) {
      const xpath = `//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${anchorContentSearch}")]`; 
      const elementHandles = await page.$x(xpath);
      
      if (elementHandles.length > 0) {
        // Pull the hrefs from the anchors
        const hrefs = await Promise.all(elementHandles.map(async elem => await page.evaluate(element => element.getAttribute('href'), elem)));
        
        // Keywords to search for in the hrefs. Find the one for each and add them to matchHref if they exist
        for (const keyword of searchTexts) {
          const matchingHref = hrefs.find(href => href.toLowerCase().includes(keyword));
          if (matchingHref) {
            sortedHrefs[keyword] = getNewUrl(matchingHref,page);
          }
        }
      }
      return sortedHrefs;
    // Search for keywords in the hrefs
    } else if (anchorContentSearch && searchTexts.length === 0) {
      const xpath = `//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${anchorContentSearch}")]`; 
      const elementHandles = await page.$x(xpath);
      
      if (elementHandles.length > 0) {
        // Pull the hrefs from the anchors
        const href = await page.evaluate(element => element.getAttribute('href'), elementHandles[0]);
        if (href) {
          sortedHrefs[anchorContentSearch] = getNewUrl(href,page);
        }
      }
      return sortedHrefs;

    } else {
      for (const searchText of searchTexts) {
        const xpath = `//a[contains(translate(@href, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${searchText}") and not(contains(@href, '#'))]`; 
        const elementHandles = await page.$x(xpath);
        
        if (elementHandles.length > 0) {
          const href = await page.evaluate(element => element.getAttribute('href'), elementHandles[0]);
          sortedHrefs[searchText] = getNewUrl(href,page);
          
        }
      }
    
    return sortedHrefs;
  }
} catch (err) {
      console.log("Error getting sorted anchor hrefs:", err);
}
  
}

async function goToNewTab(url, browser) {
  const page = await browser.newPage();
  await page.goto(url,{ waitUntil: 'networkidle2' });
  return page;
}

/**
 * Retrieves the inventory pages for a given URL.
 * 
 * @param {string} url - The URL to navigate to.
 * @param {object} browser - The browser instance.
 * @returns {Map} - A Map containing the inventory pages.
 * @throws {Error} - If there is an error getting the inventory pages.
 */
async function getInventoryPages (url, browser, makes) {
  let page, hrefs, forSaleUrl, forSaleHref;
  let inventoryPages = new Map();
  try {
    page = await goToNewTab(url,browser);
    const inventoryKeywords = ["new","used","all","owned","inventory"];
    const homeKeywords = ["home"];

    // First make sure we are on the home page
    hrefs = await sortedAnchorHrefs(page,homeKeywords);
    if (hrefs["home"]) {
      console.log("Going to home page")
      const homeUrl = getNewUrl(hrefs["home"],page);
      await page.goto(homeUrl,{ waitUntil: 'networkidle2' });
    }
    
    // Search for links to inventory pages
    hrefs = await sortedAnchorHrefs(page,inventoryKeywords,"inventory");
    console.log("hrefs:", hrefs);
    const noInventoryHrefs = JSON.stringify(hrefs) === '{}' || !hrefs;


    // If there are no inventory pages, look for a for sale page.
    if (noInventoryHrefs) {
      console.log("No inventory pages found");
      forSaleHref = await sortedAnchorHrefs(page,[],"for sale");
      // Go to for sale page and check for inventory pages
      if (forSaleHref["for sale"]) {
        console.log("Going to for sale page");
        forSaleUrl = getNewUrl(forSaleHref["for sale"],page);
        await page.goto(forSaleUrl,{ waitUntil: 'networkidle2' });
        // Search for links to inventory pages
        hrefs = await sortedAnchorHrefs(page,inventoryKeywords,"inventory");
        console.log("hrefs:", hrefs);
      }
    }

    // If there are no inventory pages, look for (a) make page(s).
    if (noInventoryHrefs && !forSaleHref["for sale"]) {
      for (const make of makes) {
        console.log(`Searching for ${make} inventory page`);
        const makeHref = await sortedAnchorHrefs(page,[],make);
        if (makeHref[make]) {
          
          const makeUrl = getNewUrl(makeHref[make],page);
          console.log(`Found ${make} inventory page: ${makeUrl}`);
          inventoryPages.set(make, await goToNewTab(makeUrl,browser));
        }
      }
      return inventoryPages;
    }

    

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
    } else if(forSaleUrl["for sale"]) {
      inventoryPages.set("inventory", await goToNewTab(forSaleUrl["for sale"],browser));
    } else {
      console.log("No anchors found");
    }

  console.log("Inventory pages retrieved");
  return inventoryPages;
  } catch (error) {
    console.error('Error getting inventory pages:', error);
    return null;
  } finally {
    await page?.close();
  }
}

/**
 * Checks if the next href is valid based on certain conditions.
 * @param {Page} page - The Puppeteer page object.
 * @param {string} url - The current URL.
 * @param {string} href - The href of the next page navigation element to be validated.
 * @param {string} inventoryType - The type of inventory (new, used...).
 * @returns {boolean} - Returns true if the next href is valid, otherwise false.
 */
function isValidNextHref(page, url, href, inventoryType) {

  try {
    const nextPageUrl = getNewUrl(href,page);
    console.log(`nextPageUrl: ${nextPageUrl} | url: ${url} | inventoryType: ${inventoryType}`)
  
    const includesInventoryType = nextPageUrl.toLowerCase().includes(inventoryType);
    
    const currentDomain = new URL(url)?.hostname;
    const nextPageDomain = new URL(nextPageUrl)?.hostname;

    console.log(`currentDomain: ${currentDomain} | nextPageDomain: ${nextPageDomain} | inventoryType: ${inventoryType} | includesInventoryType: ${includesInventoryType}`)
    
    return currentDomain == nextPageDomain && includesInventoryType;
  } catch (error) {
    console.log("Error validating href:", error)
  }
}

async function delay(length) {
  await new Promise(resolve => setTimeout(resolve, length));
}

/**
 * Retrieves the href attribute of the next anchor element in the DOM hierarchy starting from the given element.
 * @param {Page} page - The Puppeteer page object.
 * @param {Element} element - The starting element to search from.
 * @returns {Promise<string|boolean>} - The href attribute value of the next anchor element, or false if not found.
 */
async function nextElementHref(page, element) {
  return page.evaluate((element) => {
    let currentElement = element;
    do {
      if (currentElement.tagName === "A") {
        return currentElement.getAttribute("href");
      }
      currentElement = currentElement.parentElement;
    } while (currentElement);
    return false;
  }, element);
}

/**
 * Handles the click event on the nextElement.
 * 
 * @param {Page} page - The Puppeteer page object.
 * @param {ElementHandle} nextElement - The element to be clicked.
 * @param {string} inventoryType - The type of inventory.
 * @returns {Promise<Page|null>} - The page object after the click event, or null if there was an error.
 */
async function handleElement(page, nextElement,inventoryType, makes) {
  const DELAY_MS = 500;
  const TIMEOUT_MS = 15000;

  // const outerHTML = await nextElement.evaluate(node => node.outerHTML);
  // console.log(`OuterHTML of clicked element: ${outerHTML}`);

  try {
    const href = await nextElementHref(page, nextElement);
    if (href && !isValidNextHref(page, page.url(), href, inventoryType)) {
        console.log("Invalid href", href)
        return null;
    }
    console.log(`href: ${href}`)

    // Get the cursor type
    const cursorType = await page.evaluate((nextElement) => {
      const computedStyle = window.getComputedStyle(nextElement);
      return computedStyle.cursor;
    }, nextElement);

    // If the cursor is not a pointer, then the element is not clickable
    if (cursorType != "pointer") {
      return null
    }


    // Monitor requests and responses
    let requestCount = 0;
    let responseCount = 0;
    let loadEvent = false;
    const prevListings = await pageListings(page, makes);
    await page.setRequestInterception(true);
    page.on('request', interceptedRequest => {
      requestCount++;
      // console.log("request #", requestCount)
      if (interceptedRequest.isInterceptResolutionHandled()) return;
        else interceptedRequest.continue();
    });
    page.on('response', response => {
      responseCount++;
      // console.log("response #", responseCount);
    });
    page.on('load', () => {
      loadEvent = true;
    });
    
    await nextElement.scrollIntoView();
    await nextElement.click();

    // Wait for the network to be idle
    const startTime = Date.now();
    
    let networkIdle, withinTimeout, navigationEventFinished, listings;
    do {
      const prevRequestCount = requestCount;
      const prevResponseCount = responseCount;
    
      await delay(DELAY_MS);

      networkIdle = requestCount === prevRequestCount && responseCount === prevResponseCount && responseCount > 1;
      navigationEventFinished = loadEvent && responseCount > 1;
      withinTimeout = Date.now() - startTime < TIMEOUT_MS;

      console.log("Request count:", requestCount);
      console.log("Response count:", responseCount);
      console.log(`navigationEvenFinished: ${navigationEventFinished}`);

      if (navigationEventFinished) {
        console.log("Navigation event finished");
        break;
      }
      if (networkIdle) {
        try {
          if (page) {
            listings = await pageListings(page, makes);
            const newListings = JSON.stringify(listings) != JSON.stringify(prevListings);
            if (!newListings) console.log("No new listings found");
            const pageLoaded = await page.evaluate(() => {
              return document.readyState === 'complete';
            });
            if (pageLoaded && newListings) {
              console.log("Page loaded and new listings found");
              break;
            }
          }
        } catch(error) {
          console.log("Error accessing document ready state:");
        }
      }
        // console.log(`networkIdle: ${networkIdle} | requestsFulfilled: ${requestsFulfilled} | withinTimeout: ${withinTimeout}`);
    } while (withinTimeout);

    if (!withinTimeout) {
      console.log("Timeout reached");
      console.log(`prevListings: ${JSON.stringify(prevListings, null, 2)} \n listings: ${JSON.stringify(listings, null, 2)}`);
    }
    // console.log("Request count after polling:", requestCount);
    // console.log("Response count after polling:", responseCount);
    // console.log(`Isnavigating after polling: ${isNavigating}`)
    return page;
  } catch (error) {
    console.log("Error clicking next element", error);
  } finally {
    page?.off('request');
    page?.off('response');
  }
}

// Find the next page navigation and return the navigated page
/**
 * Retrieves the next page of inventory based on the given page and inventory type.
 * @param {Page} page - The Puppeteer page object.
 * @param {string} inventoryType - The type of inventory (new, used, etc).
 * @returns {Promise<Page|null>} - A promise that resolves to the next page of inventory, or null if no next page is found.
 */
async function getNextPage(page, inventoryType, makes) {
  const xpaths = [
    `//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")]`,
    `//*[@aria-label[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")]]`,
    `//span[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")]`,
    `//*[@title[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")]]`,
    `//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), ">")]`
  ];
  try {
    console.log("getting next page");
    
    for (const xpath of xpaths) {
      const elementHandles = await page.$x(xpath);
      // Attempt to click each element
      for (const handle of elementHandles) {
        const nextPage = await handleElement(page, handle, inventoryType, makes);
        if (nextPage) {
          console.log("element clicked"); 
          // Successfully retrieved the next page
          return nextPage
        }
      }
    }

    return null;
    
  } catch (error) {
    console.error('Error getting next page:', error);
    return null;
  }
}

/**
 * Retrieves all listings from a given page and its subsequent pages.
 * 
 * @param {Page} page - The Puppeteer page object.
 * @param {string} inventoryType - The type of inventory to search for (new, used, etc).
 * @param {Array} listingsData - The array to store the retrieved listings.
 * @returns {Promise<Array>} - A promise that resolves to an array of listings data.
 */
async function allPageListings(page, inventoryType, makes, listingsData = []) {
  
  try {
    // Search for listings on the current page
    const url= page.url();
    console.log("getting listings on:", url);
    const listings = await pageListings(page, makes);

    // Add the listings to the aggregate map
    if (listings) {
      // const listingsCount = Object.values(listings).reduce((acc, arr) => acc + arr.length, 0);
      const listingsCount = listings.length;
      listingsData.push({
        pageCount: listingsData.length + 1,
        url,
        listingsCount
      })
    }

    console.log(`Listings for page ${listingsData.length + 1}: ${url}`);
    logNestedObject(listings);
    
    const currentPageContent = await page.$eval('body', (body) => body.textContent);
    
    // Retrieve the next page
    const nextPage = await getNextPage(page, inventoryType, makes);
    console.log("getNextPage returned");
    if (!nextPage) {
      console.log("No clickable next page elements found");
      return;
    }

    console.log("Next page loaded")
    const nextPageContent =await page.$eval('body', (body) => body.textContent);
    // Compare the current page content to the next page content
    // Keep searching if they are different
    if (currentPageContent != nextPageContent) {
      await allPageListings(nextPage, inventoryType, makes, listingsData);
    }

    console.log("End of inventory"); 
  } catch (error) {
    console.error('Error getting listings:', error);
  } finally {
    return listingsData;
  }
}

export default async function getInfo(urls) {
  let browser;
  const makes = ['agusta', 'aprilia', 'benelli', 'bmw', 'can-am', 'cf moto', 'ducati', 'greenger', 'guzzi', 'harley',  'hisun', 'honda', 'husqvarna', 'indian', 'karavan', 'kawasaki', 'ktm', 'kymco', 'mv agusta', 'polaris', 'royal enfield ', 'ssr', 'stacyc', 'suzuki', 'triumph', 'yamaha', 'beta', 'kayo', 'moke'];
  try {
    browser = await puppeteer.launch({headless: false});
    // Get the hrefs that link to inventory pages
    let allSitesListings = {};
    let inventoryUrl;
    for (const url of urls) {
      try {
        const inventoryPages = await getInventoryPages(url, browser, makes);

        // const page = await goToNewTab("https://www.fators.com/ktm-1",browser);
        // const inventoryPages = new Map([["ktm", page]]);
        for (const  [inventoryType,page] of inventoryPages){
          inventoryUrl = page.url()
          console.log(`Getting '${inventoryType}' listings for ${inventoryUrl}`)
          await page.bringToFront();
          const listings = await allPageListings(page, inventoryType, makes);
          
          allSitesListings[inventoryUrl] = listings;
          await page.close();
        }
      } catch(error) {
        console.log(`Error getting listings for ${inventoryUrl}`)
      }

      console.log(`All listings for ${url}: ${JSON.stringify(allSitesListings, null, 2)}`)
    }

    return "All the info";

  } catch (error) {
  console.error('Error:', error);
  } finally {
    await browser.close();
  }
}