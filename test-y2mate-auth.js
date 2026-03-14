const axios = require('axios');

async function getAuthToken() {
    const res = await axios.get('https://v1.y2mate.nu/', {
        headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
        }
    });
    const html = res.data;
    const match = html.match(/var json = JSON\.parse\('([^']+)'\)/);
    if (!match) throw new Error("Could not find json variable in HTML");

    const json = JSON.parse(match[1]);
    console.log('JSON from HTML:', JSON.stringify(json));

    let e = "";
    // Logic: json[0] is data, json[2] is mask
    const data = json[0];
    const mask = json[2];
    const reverse = json[1];
    const paramNameCode = json[6];

    for (let t = 0; t < data.length; t++) {
        // e += String.fromCharCode(json[0][t] - json[2][json[2].length - (t + 1)]);
        e += String.fromCharCode(data[t] - mask[mask.length - (t + 1)]);
    }

    if (reverse) {
        e = e.split("").reverse().join("");
    }

    const token = e.length > 32 ? e.substring(0, 32) : e;
    const paramName = String.fromCharCode(paramNameCode);

    return { paramName, token, t: Math.floor(Date.now() / 1000) };
}

async function testFlow() {
    try {
        const { paramName, token, t } = await getAuthToken();
        console.log(`Generated Auth: ${paramName}=${token}, t=${t}`);

        const videoId = 'dQw4w9WgXcQ';
        const headers = {
            'accept': '*/*',
            'accept-language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'origin': 'https://v1.y2mate.nu',
            'referer': 'https://v1.y2mate.nu/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        };

        // STEP 1: Init
        console.log('\n--- STEP 1: Init ---');
        const initRes = await axios.get('https://eta.etacloud.org/api/v1/init', {
            params: { [paramName]: token, t },
            headers,
        });
        console.log('Init Response:', JSON.stringify(initRes.data));

        if (initRes.data.error !== 0 && initRes.data.error !== "0") {
            throw new Error(`Init failed: ${initRes.data.error}`);
        }

        const convertURL = initRes.data.convertURL;

        // STEP 2: Convert
        console.log('\n--- STEP 2: Convert ---');
        const convertFullUrl = `${convertURL}&v=${videoId}&f=mp3&t=${t}`;
        let convertRes = await axios.get(convertFullUrl, { headers });
        console.log('Convert Response:', JSON.stringify(convertRes.data));

        if (convertRes.data.redirect) {
            console.log('\n--- STEP 3: Redirect ---');
            const redirectUrl = `${convertRes.data.redirectURL}&v=${videoId}&f=mp3&t=${t}`;
            console.log('Redirect Full URL:', redirectUrl);
            convertRes = await axios.get(redirectUrl, { headers });
            console.log('Redirect Response:', JSON.stringify(convertRes.data));
        }

        if (convertRes.data.downloadURL) {
            console.log('\n✅ SUCCESS!');
            console.log('Download URL:', convertRes.data.downloadURL);
        }

    } catch (err) {
        console.error('ERROR:', err.response ? err.response.status : err.message);
        if (err.response) console.error('Response Data:', JSON.stringify(err.response.data));
    }
}

testFlow();
