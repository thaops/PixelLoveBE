const axios = require('axios');

function randomN(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

async function testY2Mate() {
    const videoId = 'ZdsK5qbrhlg';
    const t = Math.floor(Date.now() / 1000);
    const n = randomN(32);

    const headers = {
        'accept': '*/*',
        'accept-language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'accept-encoding': 'gzip, deflate, br',
        'origin': 'https://v1.y2mate.nu',
        'referer': 'https://v1.y2mate.nu/',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    };

    console.log(`🚀 Testing FULL Y2Mate Flow with manual URL building`);
    console.log(`Video ID: ${videoId}, Timestamp: ${t}, N: ${n}`);

    try {
        // STEP 1: Init
        console.log('\n--- STEP 1: Init ---');
        const initRes = await axios.get('https://eta.etacloud.org/api/v1/init', {
            params: { n, t },
            headers,
        });
        console.log('Init Response:', JSON.stringify(initRes.data));

        if (initRes.data.error !== 0 && initRes.data.error !== "0") {
            throw new Error(`Init failed: ${initRes.data.error}`);
        }

        const convertURL = initRes.data.convertURL;
        console.log('Base Convert URL:', convertURL);

        // STEP 2: Convert
        console.log('\n--- STEP 2: Convert ---');
        const convertFullUrl = `${convertURL}&v=${videoId}&f=mp3&t=${t}`;
        console.log('Manual Convert URL:', convertFullUrl);

        let convertRes = await axios.get(convertFullUrl, {
            headers,
            maxRedirects: 0
        });
        console.log('Convert Response:', JSON.stringify(convertRes.data));

        // STEP 3: Follow redirect
        if (convertRes.data.redirect === 1 || convertRes.data.redirect === "1") {
            console.log('\n--- STEP 3: Follow Redirect ---');
            const redirectURL = convertRes.data.redirectURL;
            const redirectFullUrl = `${redirectURL}&v=${videoId}&f=mp3&t=${t}`;
            console.log('Manual Redirect URL:', redirectFullUrl);

            convertRes = await axios.get(redirectFullUrl, {
                headers,
                maxRedirects: 0
            });
            console.log('Redirect Response:', JSON.stringify(convertRes.data));
        }

        const data = convertRes.data;
        if (data.downloadURL) {
            console.log('\n✅ SUCCESS!');
            console.log('Title:', data.title);
            console.log('Download URL:', data.downloadURL);
        } else {
            console.log('\n❌ FAILED: No downloadURL found');
            console.log('Final Data:', JSON.stringify(data));
        }
    } catch (error) {
        if (error.response) {
            console.error('\n❌ ERROR Status:', error.response.status);
            console.error('❌ ERROR Response Data:', JSON.stringify(error.response.data));
        } else {
            console.error('\n❌ ERROR Message:', error.message);
        }
    }
}

testY2Mate();
