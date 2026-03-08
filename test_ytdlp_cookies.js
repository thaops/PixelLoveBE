const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');

async function test() {
    const videoUrl = 'https://youtu.be/T7ksmtaVeOk';
    const cookiesPath = path.join(process.cwd(), 'cookies.txt');

    console.log('--- YT-DLP DEBUG TEST ---');
    console.log('Cookies path:', cookiesPath);
    console.log('Cookies exist:', fs.existsSync(cookiesPath));

    // Inject node path
    const nodePath = 'C:\\nvm4w\\nodejs';
    process.env.PATH = `${nodePath};${process.env.PATH}`;

    const options = {
        dumpSingleJson: true,
        noWarnings: true,
        forceIpv4: true,
        format: 'bestaudio',
        extractorArgs: 'youtube:player_client=web',
        noPlaylist: true,
        cookies: cookiesPath
    };

    try {
        console.log('Running yt-dlp...');
        const result = await youtubedl(videoUrl, options);
        console.log('SUCCESS!');
        console.log('Title:', result.title);
        console.log('URL found:', !!result.url);
    } catch (e) {
        console.error('FAILED!');
        console.error(e.message);
    }
}

test();
