const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const adminId = '69a56da2ddc0ac30fd1855efe';
const token = jwt.sign({ id: adminId }, process.env.JWT_SECRET, { expiresIn: '1h' });

async function testUpload() {
    try {
        const formData = new FormData();
        const dummyPath = path.join(__dirname, 'dummy.png');
        if (!fs.existsSync(dummyPath)) {
            fs.writeFileSync(dummyPath, 'fake image data');
        }

        formData.append('images', fs.createReadStream(dummyPath));

        console.log('Sending upload request to http://localhost:5000/api/admin/upload');
        const response = await axios.post('http://localhost:5000/api/admin/upload', formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Response:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('Error status:', error.response.status);
            console.error('Error data:', error.response.data);
        } else {
            console.error('Error message:', error.message);
        }
    }
}

testUpload();
