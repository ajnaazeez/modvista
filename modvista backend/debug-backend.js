const http = require('http');

function get(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        json: () => JSON.parse(data),
                        text: () => data
                    });
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function debugBackend() {
    const API_BASE = "http://localhost:5000/api";

    console.log("1. Fetching all products...");
    try {
        const res = await get(`${API_BASE}/products`);
        if (!res.ok) {
            console.error(`Status: ${res.status}`);
            console.error("Body:", res.text());
            return;
        }

        const data = res.json();

        // Normalize products array
        let products = [];
        if (Array.isArray(data)) products = data;
        else if (data.data && Array.isArray(data.data)) products = data.data;
        else if (data.products && Array.isArray(data.products)) products = data.products;

        console.log(`Found ${products.length} products.`);

        if (products.length > 0) {
            const first = products[0];
            console.log("\nFirst Product Sample:");
            console.log(JSON.stringify(first, null, 2));

            const id = first._id || first.id;
            console.log(`\nTesting fetch for ID: ${id}`);

            if (!id) {
                console.error("CRITICAL: Product has no _id or id field!");
            } else {
                const res2 = await get(`${API_BASE}/products/${id}`);
                if (res2.ok) {
                    const p2 = res2.json();
                    console.log("Success! Fetched single product.");
                    console.log("Single product ID:", p2._id || p2.id);
                } else {
                    console.error(`Failed to fetch single product. Status: ${res2.status}`);
                    console.error(res2.text());
                }
            }
        } else {
            console.log("No products found in the database. This explains why details fails (invalid ID or empty list).");
        }
    } catch (err) {
        console.error("Fetch error:", err.message);
    }
}

debugBackend();
