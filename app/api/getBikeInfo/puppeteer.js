import puppeteer from 'puppeteer-extra';
import fs from 'fs/promises';
import { list } from 'postcss';

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
  } catch (err) {
    console.log("Error creating new url:", err)
    return null
  }
}

/**
 * Retrieves sorted anchor hrefs based on search criteria.
 * @param {Page} page - The Puppeteer page object.
 * @param {string[]} keywords - An array of keywords to search for.
 * @param {string} anchorContentSearch - The keyword to search for in the text content of the anchors.
 * @returns {Object} - An object containing the sorted hrefs.
 */
async function sortedPageSearch(page, keywords, anchorContentSearch, innerTextSearch) {
  let sortedHrefs = {};
  console.log(`innerTextSearch: ${innerTextSearch}`)
  try {
    // Search for keywords in the text content of the anchors
    if (keywords.length > 0 && !innerTextSearch) {
      for (const keyword of keywords) {
        const xpath = `//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${keyword}")]`; 
        const elementHandles = await page.$x(xpath);
        
        if (elementHandles.length > 0) {
          // // Pull the hrefs from the anchors
          
          const hrefs = await Promise.all(elementHandles.map(async elem => await page.evaluate(element => element.getAttribute('href'), elem)));
  
          let matchingHref;    
          if (keyword === 'new') {
            matchingHref = hrefs?.find(href => 
              href?.toLowerCase().includes(keyword) 
              && !href?.toLowerCase().includes('news')
            );
          } else if (keyword === 'all') {
            matchingHref = hrefs?.find(href => 
              href?.toLowerCase().includes(keyword) 
              && !href?.toLowerCase().includes('gallery')
            );
          } else {
            matchingHref = hrefs?.find(href => href?.toLowerCase().includes(keyword));
          }
          if (matchingHref) {
            sortedHrefs[keyword] = getNewUrl(matchingHref,page);
          }
        }
      }

    } else if (innerTextSearch) {
      
      // Keywords to search for in the innerText, if found, then add the href.
      for (const keyword of keywords) {
        const xpath = `//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${keyword}")]`; 
        const elementHandles = await page.$x(xpath);
        const elementInfo = await Promise.all(elementHandles.map(async elem => await page.evaluate(element => ({ href: element.getAttribute('href'), innerText: element.innerText }), elem)));
        console.log("searching in innertTexts")
        
        let matchingHref;

        if (keyword === 'new') {
          matchingHref = elementInfo?.find(elem => 
            elem?.innerText?.toLowerCase().includes(keyword) 
            && !elem?.innerText?.toLowerCase().includes('news')
          )?.href;
        } else if (keyword === 'all') {
          matchingHref = elementInfo?.find(elem => 
            elem?.innerText?.toLowerCase().includes(keyword) 
            && !elem?.innerText?.toLowerCase().includes('gallery')
          )?.href;
        } else { 
          matchingHref = elementInfo?.find(elem => elem?.innerText?.toLowerCase().includes(keyword))?.href;
        }
        if (matchingHref) {
          sortedHrefs[keyword] = getNewUrl(matchingHref,page);
        }
      } 
    // Search for keywords in the hrefs
    } else if (anchorContentSearch && keywords.length === 0) {
      const xpath = `//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${anchorContentSearch}")]`; 
      const elementHandles = await page.$x(xpath);
      
      if (elementHandles.length > 0) {
        // Pull the hrefs from the anchors
        const href = await page.evaluate(element => element.getAttribute('href'), elementHandles[0]);
        if (href) {
          sortedHrefs[anchorContentSearch] = getNewUrl(href,page);
        }
      }

    }
  }  catch (err) {
    console.log("Error getting sorted anchor hrefs:", err);
  } finally {
    return sortedHrefs;
  }
}

async function goToNewTab(url, browser) {
  let page;
  try {
    page = await browser.newPage();
    await page.goto(url,{ waitUntil: 'load' });
    return page;
  } catch(err) {
    console.log("Error going to new tab:", err);
    await page.close();
    return null;
  }
}


/**
 * Checks if the given inventory page set is valid.
 * @param {Object} hrefs - The inventory page set to be checked.
 * @returns {boolean} - Returns true if the inventory page set is valid, otherwise false.
 */
function isValidInventoryPageSet(hrefs) {
  if (JSON.stringify(hrefs) === '{}' || !hrefs) {
    return false;
  }

  if (hrefs['new'] && (hrefs['used'] || hrefs['owned'])) {
    return true;
  }

  if (hrefs['inventory'] || hrefs['all']) {
    return true;
  }

  return false;
}

/**
 * Retrieves the inventory pages for a given URL.
 * 
 * @param {string} url - The URL to navigate to.
 * @param {object} browser - The browser instance.
 * @returns {Map} - A Map containing the inventory pages.
 * @throws {err} - If there is an error getting the inventory pages.
 */
async function getInventoryPages (url, browser, makes) {
  let page, hrefs, forSaleUrl, forSaleHref;
  let inventoryPages = new Map();
  try {
    page = await goToNewTab(url,browser);
    if (!page) {
      return null;
    }
    const inventoryKeywords = ["new","used","all","owned","inventory"];
    const homeKeywords = ["home"];

    // First make sure we are on the home page
    hrefs = await sortedPageSearch(page,homeKeywords);
    if (hrefs["home"]) {
      console.log("Going to home page")
      const homeUrl = getNewUrl(hrefs["home"],page);
      await page.goto(homeUrl,{ waitUntil: 'networkidle2' });
    }
    
    // Search for links to inventory pages
    hrefs = await sortedPageSearch(page,inventoryKeywords);
    console.log("hrefs:", hrefs);
    let validInventoryPageSet = isValidInventoryPageSet(hrefs);

    // If there are no inventory pages, look for a for sale page.
    if (!validInventoryPageSet) {
      console.log("No inventory pages found");
      forSaleHref = await sortedPageSearch(page,[],"for sale");
      // Go to for sale page and check for inventory pages
      if (forSaleHref && forSaleHref["for sale"]) {
        console.log("Going to for sale page");
        forSaleUrl = getNewUrl(forSaleHref["for sale"],page);
        await page.goto(forSaleUrl,{ waitUntil: 'networkidle2' });
        // Search for links to inventory pages
        hrefs = await sortedPageSearch(page,inventoryKeywords);
        validInventoryPageSet = isValidInventoryPageSet(hrefs);
        console.log("hrefs:", hrefs);
      }
      

      // If there are still no inventory pages, look for the keywords in innerTexts rather than the hrefs.
      if (!validInventoryPageSet) {
        console.log("About to look for keywords in innerTexts");
        hrefs = await sortedPageSearch(page,inventoryKeywords,'',true);
        validInventoryPageSet = isValidInventoryPageSet(hrefs);
      }
    }

    

    // If there are no inventory pages, look for (a) make page(s).
    if (!validInventoryPageSet && !(forSaleHref || forSaleHref["for sale"])) {
      for (const make of makes) {
        console.log(`Searching for ${make} inventory page`);
        const makeHref = await sortedPageSearch(page,[],make);
        if (makeHref[make]) {
          
          const makeUrl = getNewUrl(makeHref[make],page);
          console.log(`Found ${make} inventory page: ${makeUrl}`);
          inventoryPages.set(make, await goToNewTab(makeUrl,browser));
        }
      }
      return inventoryPages;
    }

    // Inventory pages to return depending on what was found
    if (hrefs['new'] && hrefs['owned']) {
      inventoryPages.set("new", await goToNewTab(hrefs["new"],browser));
      inventoryPages.set("owned", await goToNewTab(hrefs["owned"],browser));
    } else if (hrefs['new'] && hrefs['used']) {
      inventoryPages.set("new", await goToNewTab(hrefs["new"],browser));
      inventoryPages.set("used", await goToNewTab(hrefs["used"],browser));
    } else if (hrefs["inventory"]){
      inventoryPages.set("inventory", await goToNewTab(hrefs["inventory"],browser));
    } else if (hrefs["all"]) {
      inventoryPages.set("all", await goToNewTab(hrefs["all"],browser));
    } else if (forSaleHref && forSaleHref["for sale"]) {
      inventoryPages.set("inventory", await goToNewTab(forSaleHref["for sale"],browser));
    } else {
      console.log("No suitable invetory groups found, returning any pages that were found.")
      for (const category in hrefs) {
        if (hrefs.hasOwnProperty(category)) {
          inventoryPages.set(category, await goToNewTab(hrefs[category],browser));
        }
      }
    }

  console.log("Inventory pages retrieved");
  return inventoryPages;
  } catch (err) {
    console.error('Error getting inventory pages:', err);
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
    
    return currentDomain == nextPageDomain;
  } catch (err) {
    console.log("Error validating href:", err)
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
        } catch(err) {
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
  } catch (err) {
    console.log("Error clicking next element", err);
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
    `//*[@aria-label[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")]]`,
    `//*[@title[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")]]`,
    `//span[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")]`,
    `//*[@class[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")]]`,
    `//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")]`,
    `//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), ">")]`
  ];
  try {
    console.log("getting next page");
    
    for (const xpath of xpaths) {
      const elementHandles = await page.$x(xpath);
      // Reverse the order so that we look from the bottom of the page up. This is to avoid false positives: for example, if there is a next element in an image carousel.
      elementHandles.reverse();
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
    
  } catch (err) {
    console.error('Error getting next page:', err);
    return null;
  }
}

function isNewListings(listingsData, newListings) {
  const urlSet = new Set(listingsData.map(listing => listing?.url));
  const newListingsUrls = newListings.map(listing => listing?.url);
  return newListingsUrls.some(url => !urlSet.has(url));

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

    // Add the listings to the accumulator array
    if (listings) {
      listingsData.push(...listings)
    }

    console.log(`Listings for page ${listingsData.length + 1}: ${url}`);
    logNestedObject(listings);
    
    // Retrieve the next page
    const nextPage = await getNextPage(page, inventoryType, makes);
    console.log("getNextPage returned");
    if (!nextPage) {
      console.log("No clickable next page elements found");
      return;
    }

    console.log("Next page loaded")
    const nextPageListings = await pageListings(nextPage, makes);
    let listingsDiff = isNewListings(listingsData, nextPageListings);
    // Compare the current page listings to the next page listings
    // Keep searching if they are different
    if (listingsDiff) {
      await allPageListings(nextPage, inventoryType, makes, listingsData);
    }

    console.log("End of inventory"); 
  } catch (err) {
    console.error('Error getting listings:', err);
  } finally {
    return listingsData;
  }
}

export default async function getInfo(urls) {
  const beginDate = new Date();
  const BeginDateTime = `${beginDate.getMonth()+1}-${beginDate.getDate()}_${beginDate.getHours()}-${beginDate.getMinutes()}-${beginDate.getSeconds()}`;
  let browser;
  const makes = ['agusta', 'aprilia', 'benelli', 'bmw', 'can-am', 'cf moto', 'ducati', 'greenger', 'guzzi', 'harley',  'hisun', 'honda', 'husqvarna', 'indian', 'karavan', 'kawasaki', 'ktm', 'kymco', 'mv agusta', 'polaris', 'royal enfield ', 'ssr', 'stacyc', 'suzuki', 'triumph', 'yamaha', 'beta', 'kayo', 'moke'];
  try {
    browser = await puppeteer.launch({headless: false});
    // Get the hrefs that link to inventory pages
    
    let inventoryUrl;
    for (const url of urls) {
      console.log(`Getting listings for ${url}`);
      const dealershipListings = {dealershipUrl: url};
      try {
        const inventoryPages = await getInventoryPages(url, browser, makes);

        // const page = await goToNewTab("https://www.indianmotorcycleorangecounty.com/new-motorcycles-for-sale--inventory?condition=new&pg=1&sortby=Price|desc",browser);
        // const inventoryPages = new Map([["new", page]]);
        const inventoryTypeListings = [];
        for (const  [inventoryType,page] of inventoryPages){
          inventoryUrl = page.url()
          console.log(`Getting '${inventoryType}' listings for ${inventoryUrl}`)
          await page.bringToFront();
          const tempListings = await allPageListings(page, inventoryType, makes);
          
          inventoryTypeListings.push(...tempListings);
          dealershipListings[inventoryType] = inventoryTypeListings;
          await page.close();
        }
        
      } catch(err) {
        console.log(`Error getting listings for ${inventoryUrl}`)
      }
      // try {
      //   const dealershipListingsJson = JSON.stringify(dealershipListings, null, 2);
      //   fs.appendFile(`./app/api/getBikeInfo/results/listingResults${BeginDateTime}.json`, `${dealershipListingsJson},\n`, 'utf-8');
      //   console.log(`All listings for ${url}: ${dealershipListingsJson}`)
      // } catch (err) {
      //   console.log("Error writing listings to file:", err);
      // }
    } 

    return "All the info";

  } catch (err) {
  console.error('Error:', err);
  } finally {
    await browser.close();
  }
}