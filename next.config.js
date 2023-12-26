/** @type {import('next').NextConfig} */
module.exports = {
    experimental: {
      serverActions: true,
      serverComponentsExternalPackages: [
        'puppeteer-extra', 
        'puppeteer-extra-plugin-stealth',
        'puppeteer-extra-plugin-recaptcha',
      ]
    }
  };

