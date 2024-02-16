const axios = require('axios');
const fs = require('fs');

const url = 'https://cdn.dealerspike.com/imglib/v1/300x225/imglib/assets/inventory/AA/39/AA390855-122B-413C-B1D6-3C1E96DC9617.jpg';
async function main() {

  const response = await axios.get(url, { responseType: 'stream' })

  response.data.pipe(fs.createWriteStream(`./images/${url.split('/').pop()}`));

  // const response = await axios.get(url, { responseType: 'arraybuffer' })

  // const buffer = Buffer.from(response.data, 'binary');
  // fs.writeFileSync(`./images/${url.split('/').pop()}`, buffer);

} 
main();
