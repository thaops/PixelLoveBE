const { execSync } = require('child_process');

function randomN(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

async function testY2MateCurl() {
    const videoId = 'ZdsK5qbrhlg';
    const t = Math.floor(Date.now() / 1000);
    const n = 'EcdQOE7E52lLDbmSidSQQLKEddAVUyER';

    console.log(`🚀 Testing Y2Mate Flow using CURL command`);

    try {
        // STEP 1: Init
        console.log('\n--- STEP 1: Init ---');
        const initCmd = `curl.exe -s "https://eta.etacloud.org/api/v1/init?n=${n}&t=${t}" -H "accept: */*" -H "origin: https://v1.y2mate.nu" -H "referer: https://v1.y2mate.nu/" -H "user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"`;
        const initOut = execSync(initCmd).toString();
        console.log('Init Output:', initOut);
        const initData = JSON.parse(initOut);

        if (initData.error !== 0 && initData.error !== "0") {
            throw new Error(`Init failed: ${initData.error}`);
        }

        const convertURL = initData.convertURL;

        // STEP 2: Convert
        console.log('\n--- STEP 2: Convert ---');
        const convertCmd = `curl.exe -s "${convertURL}&v=${videoId}&f=mp3&t=${t}" -H "accept: */*" -H "origin: https://v1.y2mate.nu" -H "referer: https://v1.y2mate.nu/" -H "user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"`;
        const convertOut = execSync(convertCmd).toString();
        console.log('Convert Output:', convertOut);
        let convertData = JSON.parse(convertOut);

        // STEP 3: Redirect
        if (convertData.redirect === 1 || convertData.redirect === "1") {
            console.log('\n--- STEP 3: Redirect ---');
            const redirectURL = convertData.redirectURL;
            const redirectCmd = `curl.exe -s "${redirectURL}&v=${videoId}&f=mp3&t=${t}" -H "accept: */*" -H "origin: https://v1.y2mate.nu" -H "referer: https://v1.y2mate.nu/" -H "user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"`;
            const redirectOut = execSync(redirectCmd).toString();
            convertData = JSON.parse(redirectOut);
            console.log('Redirect Output:', redirectOut);
        }

        if (convertData.downloadURL) {
            console.log('\n✅ SUCCESS!');
            console.log('Download URL:', convertData.downloadURL);
        } else {
            console.log('\n❌ FAILED');
        }
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    }
}

testY2MateCurl();
