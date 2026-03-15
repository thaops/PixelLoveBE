const mongoose = require('mongoose');
const Redis = require('ioredis');

const MONGODB_URI = 'mongodb+srv://nguyenpham0666_db_user:rIOG1Sr0rwIZrjZ2@cluster0.0p5ql7b.mongodb.net/pixel-love?appName=Cluster0';

async function reset() {
    try {
        // 1. Reset MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        const Track = mongoose.model('Track', new mongoose.Schema({}, { strict: false }));
        const dbRes = await Track.deleteMany({ status: 'processing' });
        console.log(`🗑️ Deleted ${dbRes.deletedCount} stuck jobs in MongoDB.`);
        await mongoose.disconnect();

        // 2. Reset Redis Queue
        const redis = new Redis({ host: '127.0.0.1', port: 6379 });
        console.log('✅ Connected to Redis');

        // Xóa sạch hàng chờ audio-convert
        const keys = await redis.keys('bull:audio-convert:*');
        if (keys.length > 0) {
            await redis.del(...keys);
            console.log(`🗑️ Cleared ${keys.length} BullMQ keys for audio-convert.`);
        } else {
            console.log('✨ Redis Queue is already empty.');
        }

        await redis.quit();
        console.log('🚀 Reset complete! Now start NestJS and try again.');
    } catch (err) {
        console.error('❌ Error during reset:', err.message);
        process.exit(1);
    }
}

reset();
