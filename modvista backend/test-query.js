const QueryFeatures = require('./src/utils/QueryFeatures');

// Mock Mongoose Query
class MockQuery {
    constructor(results = []) {
        this.results = results;
        this.filters = [];
    }
    find(filter) {
        this.filters.push(filter);
        return this;
    }
    sort(sortBy) { return this; }
    select(fields) { return this; }
    skip(skip) { return this; }
    limit(limit) { return this; }
}

function test(queryString) {
    console.log('--- Testing Query:', queryString);
    const mockQuery = new MockQuery();
    const features = new QueryFeatures(mockQuery, queryString);
    features.filter();
    console.log('Resulting Filters:', JSON.stringify(mockQuery.filters, null, 2));
}

// Case 4: URLSearchParams.append results (flat keys)
test({ 'price[gte]': '1000', 'price[lte]': '2000' });

// Case 5: Empty search and other fields
test({ search: '', 'price[gte]': '1000' });
