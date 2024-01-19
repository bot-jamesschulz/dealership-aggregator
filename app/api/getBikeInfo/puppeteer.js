const puppeteer = require('puppeteer-extra');

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// Search for anchor content that includes one of the makes from vehicleMakes
async function pageListings(page, vehicleMakes) {
  let vehicleInfo = {};
  const listingUrls = [];

  // Get all anchor elements
  const anchorHandles = await page.$$('a');

  // Get the content/attributes from the anchors
  const anchorData = await Promise.all(anchorHandles.map(async (anchorHandle) => {
    const innerText = await anchorHandle.evaluate(node => node.innerText);
    const href = await anchorHandle.evaluate(node => node.getAttribute("href"));
    
    return { innerText, href };
  }));
 
  console.log("Searching for anchor titles on:", page.url())
  // Look through anchorData for innerText that includes the make
  for (const make of vehicleMakes) {
    
    // Look through anchors that include the make and check if they are valid listings
    anchorData.forEach(({ innerText, href }) => {
      const trimmedText = innerText.trim().replace(/\r?\n|\r/,' ');
      
      // Split the string into an array of words
      // const words = trimmedText.split(/\s+/);

      if (!innerText || !trimmedText.toLowerCase().includes(make)) {
        return;
      };

      // First word should either be a 4 digit number or a keyword
      const yearPattern = /(\d{4})/g;
      const validFirstWords = ['owned', 'new', 'used'];
      const words = trimmedText.split(/\s+/);
      const firstWord = words[0];

      const isValidFirstWord = validFirstWords.some(validWord => firstWord.toLowerCase().includes(validWord)) ||  yearPattern.test(firstWord);

      if (!isValidFirstWord) {
        return;
      }

      // Look for substrings of 4 digits
      const matches = trimmedText.match(yearPattern);
      const lowerBound = 1950;
      const upperBound = new Date().getFullYear() + 2;
      
      // Check if any of the digit substrings are in the correct range
      const validMatches = matches?.find(match => {
          const year = parseInt(match);
          return year >= lowerBound && year <= upperBound;
        });

      // If we have a valid title then add it to vehicleInfo
      if (validMatches) {
        const validUrl = getNewUrl(href, page);

        if (!listingUrls.includes(validUrl)) {

          listingUrls.push(validUrl);

          if (vehicleInfo[make]) {   
              vehicleInfo[make].push({"title": trimmedText, "url": validUrl});
          } else {
            vehicleInfo[make] = [{"title": trimmedText, "url": validUrl}];
          }
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
  try {
    if (href.includes("http")) {
      newUrl = href;
    } else {
      const url = page.url();

      const domain = new URL(url).origin;

      if (domain) {
        newUrl = href[0] == '/' ? `${domain}${href}` : `${domain}/${href}`;
      } else {
        // If the page URL doesn't have a valid format, use the href as is
        newUrl = encodeURI(href);
      }
    }

    return encodeURI(newUrl)
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

  // Search for keywords in the text content of the anchors
  if (anchorContentSearch) {
    const xpath = `//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${anchorContentSearch}")]`; 
    const elementHandles = await page.$x(xpath);
    
    if (elementHandles.length > 0) {
      // Pull the hrefs from the anchors
      const hrefs = await Promise.all(elementHandles.map(async elem => await page.evaluate(element => element.getAttribute('href'), elem)));
      
      // Keywords to search for in the hrefs. Find the one for each and add them to matchHref if they exist
      for (const keyword of searchTexts) {
        const matchingHref = hrefs.find(href => href.toLowerCase().includes(keyword));
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
        const href = await page.evaluate(element => element.getAttribute('href'), elementHandles[0]);

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


/**
 * Retrieves the inventory pages for a given URL.
 * 
 * @param {string} url - The URL to navigate to.
 * @param {object} browser - The browser instance.
 * @returns {Map} - A Map containing the inventory pages.
 * @throws {Error} - If there is an error getting the inventory pages.
 */
async function getInventoryPages (url, browser) {
  let page, hrefs;
  let inventoryPages = new Map();
  try {
    page = await goToNewTab(url,browser);
    const inventoryKeywords = ["new","used","all","owned","inventory"];
    const homeKeywords = ["home"];

    // First make sure we are on the home page
    hrefs = await sortedAnchorHrefs(page,homeKeywords);
    if (hrefs["home"]) {
      console.log("Going to home page")
      const urlObject = new URL(hrefs["home"], page.url());
      await page.goto(urlObject.href,{ waitUntil: 'networkidle2' });
    }
    // Search for links to inventory pages
    hrefs = await sortedAnchorHrefs(page,inventoryKeywords,"inventory");
    console.log("hrefs:", hrefs);
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
  const maxUrlDifference = 25;

  try {
    const nextPageUrl = getNewUrl(href,page);
    console.log(`nextPageUrl: ${nextPageUrl} | url: ${url} | inventoryType: ${inventoryType}`)
    // if the next page's url is much longer than the current, we know it is not going to be valid
    if (nextPageUrl.length - maxUrlDifference > url.length) {
      console.log("new url is too long")
      return false
    }

    const includesType = href.toLowerCase().includes(inventoryType);
    
    if (!href.includes('http')) {
      if (includesType) {
        return true;
      }
      else {
        return false;
      }
    }

    const urlDomain = new URL(url)?.hostname;
    const hrefDomain = new URL(href)?.hostname;

    console.log(`urlDomain: ${urlDomain} | hrefDomain: ${hrefDomain} | inventoryType: ${inventoryType} | includesType: ${includesType}`)
    
    return urlDomain == hrefDomain && includesType
  } catch (error) {
    console.log("Error validating href:", error)
  }
}

async function delay(length) {
  await new Promise(resolve => setTimeout(resolve, length));
}

async function isElementInsideAnchor(page, element) {
  return page.evaluate((element) => {
    let currentElement = element;
    do {
      if (currentElement.tagName === "A") {
        return true;
      }
      currentElement = currentElement.parentElement;
    } while (currentElement);
    return false;
  }, element);
}


/**
 * Handles the click event on an anchor element.
 * 
 * @param {Page} page - The Puppeteer page object.
 * @param {ElementHandle} nextElement - The anchor element to click.
 * @param {string} inventoryType - The type of inventory.
 * @returns {Page|null} - The updated page object or null if an error occurred.
 */
async function handleAnchorElement(page, nextElement, inventoryType) {
  try {
    // Ensure the link is going to the next page and not to another site
    const url = await page.url();
    const href = await nextElement.evaluate(elem => elem.getAttribute('href'));
    console.log("Trying anchor:", href)
    if (!isValidNextHref(page, url, href, inventoryType)) {
      console.log("Invalid href", href)
      return null;
    }

    console.log(`Clicking anchor ${href}`)
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      nextElement.click() 
    ]);
    return page;
  } catch (error) {
    console.log("Error clicking anchor", error);
    return null
  } 
}


/**
 * Handles a non-anchor element by clicking on it and monitoring network activity.
 * @param {Page} page - The Puppeteer page object.
 * @param {ElementHandle} nextElement - The element to be clicked.
 * @returns {Promise<Page|null>} - The Puppeteer page object if the click is successful and network activity is monitored, or null if the element cannot be clicked.
 */
async function handleNonAnchorElement(page, nextElement) {
  const DELAY_MS = 500;
  const TIMEOUT_MS = 15000;

  // Element is not part of an anchor
  console.log(`Clicking non-anchor`)
  // const outerHTML = await nextElement.evaluate(node => node.outerHTML);
  // console.log(`OuterHTML of clicked element: ${outerHTML}`);

  try {

    // Get the cursor type
    const cursorType = await page.evaluate((nextElement) => {
      const computedStyle = window.getComputedStyle(nextElement);
      return computedStyle.cursor;
    }, nextElement);

    if (cursorType != "pointer") {
      return null
    }


    // Monitor requests and responses
    let requestCount = 0;
    let responseCount = 0;
    let loadEvent = false;
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

    await page.evaluate(() => {
      window.unloadHandler = () => window.onBeforeUnload();

      window.addEventListener('beforeunload', unloadHandler);
    });
    
    await nextElement.click();

    // Wait for the network to be idle
    const timeout = TIMEOUT_MS;
    const startTime = Date.now();
    let networkIdle, withinTimeout, navigationEventFinished;
    do {
        const prevRequestCount = requestCount;
        const prevResponseCount = responseCount;
      
        await delay(DELAY_MS);

        networkIdle = requestCount === prevRequestCount && responseCount === prevResponseCount && responseCount > 1;
        navigationEventFinished = loadEvent && responseCount > 1;
        withinTimeout = Date.now() - startTime < timeout;

        console.log("Request count:", requestCount);
        console.log("Response count:", responseCount);
        console.log(`navigationEvenFinished: ${navigationEventFinished}`);

        if (navigationEventFinished) {
          break;
        }
        if (networkIdle) {
          try {
            const pageLoaded = await page.evaluate(() => {
              return document.readyState === 'complete';
            });
            if (pageLoaded) {
              break;
            }
          } catch(error) {
            console.log("Error accessing document ready state:", error);
          }
        }
        // console.log(`networkIdle: ${networkIdle} | requestsFulfilled: ${requestsFulfilled} | withinTimeout: ${withinTimeout}`);
    } while (withinTimeout);
    
    // console.log("Request count after polling:", requestCount);
    // console.log("Response count after polling:", responseCount);
    // console.log(`Isnavigating after polling: ${isNavigating}`)
    return page;
  } catch (error) {
    console.log("Error clicking non-anchor", error);
  } finally {
    page?.off('request');
    page?.off('response');
  }
}


/**
 * Clicks on the next element based on the provided page, nextElement, and inventoryType.
 * If the element is inside an anchor, it waits for page navigation.
 * If the element is not inside an anchor, it handles the element directly.
 * @param {Page} page - The Puppeteer page object.
 * @param {ElementHandle} nextElement - The next page navigation element to click.
 * @param {string} inventoryType - The type of inventory (new, used, etc).
 * @returns {Page|null} - The updated page object or null if there was an error.
 */
async function clickNextElement(page, nextElement, inventoryType) {
  try {
    let nextPage;
    const isInsideAnchor = await isElementInsideAnchor(page, nextElement);

    // If the element is in an anchor, then wait for page navigation.
    if (isInsideAnchor) {
      console.log("element is inside anchor");
      nextPage = await handleAnchorElement(page, nextElement, inventoryType);
      
    } else {
      console.log("element is not inside anchor");
      nextPage = await handleNonAnchorElement(page, nextElement);
    }  
    if (!nextPage) return null;
    console.log("clicked next element");
    return nextPage;
  } catch (error) {
    console.log("Error clicking next page", error)
    return null;
  } 
}

// Find the next page navigation and return the navigated page
/**
 * Retrieves the next page of inventory based on the given page and inventory type.
 * @param {Page} page - The Puppeteer page object.
 * @param {string} inventoryType - The type of inventory (new, used, etc).
 * @returns {Promise<Page|null>} - A promise that resolves to the next page of inventory, or null if no next page is found.
 */
async function getNextPage(page, inventoryType) {
  const xpaths = [
    `//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")]`,
    `//*[@aria-label[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")]]`,
    `//span[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")]`
  ];
  try {
    console.log("getting next page");
    
    for (const xpath of xpaths) {
      const elementHandles = await page.$x(xpath);
      // Attempt to click each element
      for (const handle of elementHandles) {
        const nextPage = await clickNextElement(page, handle, inventoryType);
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
async function allPageListings(page, inventoryType, listingsData = []) {
  const makes = ['agusta', 'aprilia', 'benelli', 'bmw', 'can-am', 'cf moto', 'ducati', 'greenger', 'guzzi', 'harley',  'hisun', 'honda', 'husqvarna', 'indian', 'karavan', 'kawasaki', 'ktm', 'kymco', 'mv agusta', 'polaris', 'royal enfield ', 'ssr', 'stacyc', 'suzuki', 'triumph', 'yamaha', 'beta', 'kayo', 'moke'];
  try {
    // Search for listings on the current page
    const url= page.url();
    console.log("getting listings on:", url);
    const listings = await pageListings(page, makes);


    // Add the listings to the aggregate map
    if (listings) {
      const listingsCount = Object.values(listings).reduce((acc, arr) => acc + arr.length, 0);
      listingsData.push({
        pageCount: listingsData.length + 1,
        url,
        listingsCount
      })
    }

    console.log(`Listings for page ${listingsData.length + 1}: ${url}`);
    logNestedObject(listings);
    
    const currentPageContent = await page.content();
    
    // Retrieve the next page
    const nextPage = await getNextPage(page, inventoryType);
    console.log("getNextPage returned");
    if (!nextPage) {
      console.log("No clickable next page elements found");
      return;
    }

    console.log("Next page loaded")

    // Compare the HTML content of the old page with the new
    const nextPageContent = await nextPage.content();
    // Keep searching if they are different
    if (currentPageContent != nextPageContent) {
      
      await allPageListings(nextPage, inventoryType, listingsData);
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
  try {
    browser = await puppeteer.launch({headless: false});
    // Get the hrefs that link to inventory pages
    let allSitesListings = {};
    let inventoryUrl;
    for (const url of urls) {
      // const inventoryPages = await getInventoryPages(url, browser);

      const page = await goToNewTab("https://www.nextride.com/default.asp?page=inventory&condition=new",browser);
      const inventoryPages = new Map([["new", page]]);
      try {
        for (const  [inventoryType,page] of inventoryPages){
          inventoryUrl = page.url()
          console.log(`Getting '${inventoryType}' listings for ${inventoryUrl}`)
          await page.bringToFront();
          const listings = await allPageListings(page, inventoryType);
          allSitesListings[inventoryUrl] = listings;
          await page.close();
        }
      } catch(error) {
        console.log(`Error getting listings for ${inventoryUrl}`)
      }

      console.log(`All listings ${JSON.stringify(allSitesListings, null, 2)}`)
    }

    return "All the info";

  } catch (error) {
  console.error('Error:', error);
  } finally {
    await browser.close();
  }
}