/**
 * Helper to build Mongoose query with pagination, sorting, and filtering
 * @param {Object} query - Mongoose query object
 * @param {Object} queryString - req.query object
 * @returns {Object} { query, metadata }
 */
const buildQueryFeatures = async (model, queryString) => {
    let query;
    const reqQuery = { ...queryString };

    // 1. Filtering
    const removeFields = ['select', 'sort', 'page', 'limit', 'search'];
    removeFields.forEach(param => delete reqQuery[param]);

    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Base filter
    let filter = JSON.parse(queryStr);

    // 2. Search (Case-insensitive)
    if (queryString.search) {
        // Customize this based on the model's indexed fields (name/title)
        filter.$or = [
            { name: { $regex: queryString.search, $options: 'i' } },
            { title: { $regex: queryString.search, $options: 'i' } },
            { code: { $regex: queryString.search, $options: 'i' } }
        ];
    }

    query = model.find(filter);

    // 3. Select Fields
    if (queryString.select) {
        const fields = queryString.select.split(',').join(' ');
        query = query.select(fields);
    }

    // 4. Sort
    if (queryString.sort) {
        const sortBy = queryString.sort.split(',').join(' ');
        query = query.sort(sortBy);
    } else {
        query = query.sort('-createdAt');
    }

    // 5. Pagination
    const page = parseInt(queryString.page, 10) || 1;
    const limit = parseInt(queryString.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const total = await model.countDocuments(filter);

    query = query.skip(startIndex).limit(limit);

    const pagination = {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    };

    return {
        query,
        pagination
    };
};

module.exports = buildQueryFeatures;
