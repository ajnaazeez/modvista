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

        const mongoFilter = {};
        const operators = ['gt', 'gte', 'lt', 'lte', 'ne', 'in', 'nin', 'regex', 'options'];

        Object.keys(queryObj).forEach(key => {
            let field, operator, value;

            // Handle bracket notation: price[gte]=1000
            if (key.includes('[') && key.includes(']')) {
                const parts = key.split(/[\[\]]/).filter(Boolean);
                if (parts.length === 2) {
                    [field, operator] = parts;
                    value = queryObj[key];
                } else {
                    field = key;
                    value = queryObj[key];
                }
            } else {
                field = key;
                value = queryObj[key];
            }

            // If value is an object (already parsed by qs), process its operators
            if (typeof value === 'object' && value !== null) {
                if (!mongoFilter[field]) mongoFilter[field] = {};
                Object.keys(value).forEach(op => {
                    let opVal = value[op];
                    const cleanOp = op.startsWith('$') ? op.substring(1) : op;
                    if (operators.includes(cleanOp)) {
                        // Parse numbers for comparison operators
                        if (['gt', 'gte', 'lt', 'lte'].includes(cleanOp) && typeof opVal === 'string' && !isNaN(opVal) && opVal !== '') {
                            opVal = parseFloat(opVal);
                        }
                        mongoFilter[field][`$${cleanOp}`] = opVal;
                    } else {
                        mongoFilter[field][op] = opVal;
                    }
                });
            } else if (operator) {
                // Was flat bracket notation
                if (!mongoFilter[field]) mongoFilter[field] = {};
                const cleanOp = operator.startsWith('$') ? operator.substring(1) : operator;
                if (operators.includes(cleanOp)) {
                    if (['gt', 'gte', 'lt', 'lte'].includes(cleanOp) && typeof value === 'string' && !isNaN(value) && value !== '') {
                        value = parseFloat(value);
                    }
                    mongoFilter[field][`$${cleanOp}`] = value;
                } else {
                    mongoFilter[field][operator] = value;
                }
            } else {
                // Simple equality
                mongoFilter[field] = value;
            }
        });

        if (this.queryString.minPrice) {
            if (!mongoFilter.price) mongoFilter.price = {};
            mongoFilter.price.$gte = parseFloat(this.queryString.minPrice);
        }
        if (this.queryString.maxPrice) {
            if (!mongoFilter.price) mongoFilter.price = {};
            mongoFilter.price.$lte = parseFloat(this.queryString.maxPrice);
        }

        this.query = this.query.find(mongoFilter);
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
