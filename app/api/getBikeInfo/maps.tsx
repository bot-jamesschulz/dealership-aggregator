import axios from 'axios';

export default async function getDealerships() {

    const mapsKey = process.env.MAPS_API_KEY;

    const Ids = [
        'ChIJ4_mXwtwzw4ARzPaldkRtbho',
        'ChIJmdDB_cgz3YAR51Txhfxq22g',
        'ChIJ1z5WGxi3woAR_x3jrbHrkHA',
        'ChIJL2x36aky3YARx9tB8s4zgx8',
        'ChIJ47LxDA4ow4ARi8k1zZRjgRY',
        'ChIJkROCaH_TwoARhgBA-FjxPSY',
        'ChIJe3p2bA7BwoAR_FcXxo1V2h4',
        'ChIJmR0npkC0woARd7dLh9pNX6E',
        'ChIJrY5CJPXf3IARoT-E61OyMSc',
        'ChIJyxIsvvTNwoARPNAGIhIjpmo',
        'ChIJKRXkCL4q3YAREkCS7uhhCXs',
        'ChIJvxswj922woARlHf5o4cnl1E',
        'ChIJk37Tyvc03YAR1eOa8szDLQE',
        'ChIJe25VOpzf3IARZVUwzbOwMYs',
        'ChIJNU7OlWrV3IARQsXlAdhscxw',
        'ChIJIeqZ42vX3IARB2FxsNTNQMQ',
        'ChIJnVMbbWLJ3IARof3-x-pjTqM',
        'ChIJcyxhTpXIwoARnSDVrUkJ74s',
        'ChIJMSCsK-wm3YARWvrVxuGnO7Q',
        'ChIJizuuc-fbwoARVx0JpHVA9g8'
    ];

    let websites;   

    websites = [
        'http://www.mtnride.com/?utm_source=google&utm_medium=organic&utm_campaign=GMB-service',
        'https://longbeach.delamomotorsports.com/?utm_source=google&utm_medium=organic&utm_campaign=GMB-service',
        'http://www.lacyclesports.com/',
        'https://www.motounitedbellflower.com/?utm_source=GMBlisting&utm_medium=organic',
        'http://www.bertsmegamall.com/?utm_source=google&utm_medium=organic&utm_campaign=GMB-service',
        'https://www.motounitedwhittier.com/',
        'http://hondaofglendale.com/',
        'https://redondobeach.delamomotorsports.com/?utm_source=google&utm_medium=organic&utm_campaign=GMB-service',
        'https://orangecounty.delamomotorsports.com/?utm_source=google&utm_medium=organic&utm_campaign=GMB-service',
        'https://losangeles.delamomotorsports.com/',
        
        'http://www.motounitedlahabra.com/',
        'http://www.nextmotorcycle.com/',
        'http://socalhondapowersports.com/',
        'http://www.ocmotorcycle.com/',
        'http://www.socalmotorcycles.com/',
        'https://orangehonda.com/?utm_source=google&utm_medium=organic&utm_campaign=google_my_business&utm_content=website_button',
        'http://www.maalimotorsports.com/',
        'https://www.farhanenterprises.net/',
        'http://hbhonda.com/',
        'http://www.arcadiamotorcycleco.com/'
    ];

    const testingWebsites = [
        'http://www.mtnride.com/?utm_source=google&utm_medium=organic&utm_campaign=GMB-service',
        'http://www.lacyclesports.com/',
        'https://www.motounitedbellflower.com/?utm_source=GMBlisting&utm_medium=organic',
        'http://www.bertsmegamall.com/?utm_source=google&utm_medium=organic&utm_campaign=GMB-service',

        'http://hondaofglendale.com/',
        'https://redondobeach.delamomotorsports.com/?utm_source=google&utm_medium=organic&utm_campaign=GMB-service',
        'http://www.nextmotorcycle.com/',
        'http://socalhondapowersports.com/',

        'http://www.ocmotorcycle.com/',
        'http://www.socalmotorcycles.com/',
        'https://orangehonda.com/?utm_source=google&utm_medium=organic&utm_campaign=google_my_business&utm_content=website_button',
        'http://www.maalimotorsports.com/',

        'https://www.farhanenterprises.net/',
        'http://hbhonda.com/',
        'http://www.arcadiamotorcycleco.com/'
    ];

    const placesNearbyConfig = {
        method: 'get',
        url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=34%2C-118&radius=50000&keyword=motorcycle dealership&key=${mapsKey}`,
        headers: { }
    };

    try {
        const placesNearbyRes = await axios(placesNearbyConfig);
        const placeIds = placesNearbyRes.data.results.map(r => r.place_id);
        
        // websites = await Promise.all(Ids.map(async (Id) => {
        //     let placeId = Id
        //     const placeDetailsConfig = {
        //         ...placesNearbyConfig,
        //         url: `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=website&key=${mapsKey}`
        //     }
            
        //     const placeDetailsRes = await axios(placeDetailsConfig);
        //     const website = placeDetailsRes.data.result.website;
        //     return website;
        // }));
        
        //console.log(websites);
    } catch(err) {
        console.log(err.message);
    };
    //return [websites[0],websites[1],websites[3],websites[4],websites[5],websites[6],websites[7],websites[8],websites[9]];
    //return [websites[9]]
    //return websites.slice(0,20)
    return testingWebsites.slice(3,4);
};