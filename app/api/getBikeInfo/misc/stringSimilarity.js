const Fuse = require('fuse.js');


const listing = 'ab';
const model = 'ab';

const options = {
    includeScore: true,
    includeMatches: true,
    threshold: 0.4,
    minMatchCharLength: 2
}


const fuse = new Fuse([],options);
fuse.setCollection([listing]);
const fuseResults = fuse.search(model);
if (!fuseResults) {
    console.log('no results')
}
const fuseModelIndexes = fuseResults[0]?.matches[0]?.indices;
console.log('fuse results', fuseResults);


console.log('fuse matches', fuseResults[0]?.matches[0]);


console.log('attempted match:', model);
if (fuseModelIndexes) {
    const fuseModel = listing.slice(fuseModelIndexes[0][0], fuseModelIndexes[0][1] + 1);
    console.log('fuse Model:', fuseModel);
}
