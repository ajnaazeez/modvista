class QueryFeatures {
    constructor(query, queryString) {
        this.query = query; // Original Mongoose query
        this.queryString = queryString; // req.query
    }

    // 1. Filtering
    filter() {
        const queryObj = { ...this.queryString };
        const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
        excludedFields.forEach(el => delete queryObj[el]);

        // Advanced filtering (gt, gte, lt, lte, regex)
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|regex|options)\b/g, match => `$${match}`);

        this.query = this.query.find(JSON.parse(queryStr));
        return this;
    }

    // 2. Sorting
    sort() {
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        } else {
            this.query = this.query.sort('-createdAt'); // Default sort
        }
        return this;
    }

    // 3. Field Limiting
    limitFields() {
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        } else {
            this.query = this.query.select('-__v'); // Exclude mongoose internal field
        }
        return this;
    }

    // 4. Searching
    search(fields = []) {
        if (this.queryString.search && fields.length > 0) {
            const searchObj = {
                $or: fields.map(field => ({
                    [field]: { $regex: this.queryString.search, $options: 'i' }
                }))
            };
            this.query = this.query.find(searchObj);
        }
        return this;
    }

    // 5. Pagination
    paginate() {
        const page = parseInt(this.queryString.page, 10) || 1;
        const limit = parseInt(this.queryString.limit, 10) || 10;
        const skip = (page - 1) * limit;

        this.query = this.query.skip(skip).limit(limit);
        return this;
    }
}

module.exports = QueryFeatures;
