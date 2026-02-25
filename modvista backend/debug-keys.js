const http = require('http');

function get(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.error("Parse error", e);
                    resolve(null);
                }
            });
        }).on('error', reject);
    });
}

async function debug() {
    console.log("Fetching...");
    const data = await get('http://localhost:5000/api/products');
    if (!data) return;

    let products = [];
    if (Array.isArray(data)) products = data;
    else if (data.data) products = data.data;
    else if (data.products) products = data.products;

    console.log("Count:", products.length);
    if (products.length > 0) {
        console.log("Keys of first product:", Object.keys(products[0]));
        console.log("Sample ID:", products[0]._id, products[0].id);
    }
}

debug();
