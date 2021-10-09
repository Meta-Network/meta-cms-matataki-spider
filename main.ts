import { connectNats, jwtDecode, jwtValidate, MySqlClient, JSONCodec, connectRedis } from "./deps.ts";
import type { MySqlConnection } from "./deps.ts";
import * as env from "./env.ts";
import type { MetaSpacePosts, MicroserviceMessage, NewPostInfo } from "./types.ts";

const natsClient = await connectNats({
    servers: env.NATS_SERVER,
});
const redis = await connectRedis({
    hostname: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
});

const natsCodec = JSONCodec<MicroserviceMessage<number>>();
const userIdSubscription = natsClient.subscribe("cms.post.sync.matataki");

for await (const message of userIdSubscription) {
    try {
        const { data: userId } = natsCodec.decode(message.data);

        let client: MySqlClient | undefined;

        try {
            client = await new MySqlClient().connect({
                hostname: env.DB_HOST,
                username: env.DB_USER,
                password: env.DB_PASSWORD,
                db: env.DB_DATABASE,
            });

            await client.transaction((connection: MySqlConnection) => doJob(connection, userId));
        } catch (e) {
            await redis.set(`cms:post:sync_state:matataki:${userId}`, "error");
            throw e;
        } finally {
            if (client)
                await client.close();
        }
    } catch (e) {
        console.error(new Date(), "Unhandled exception:", e);
    }
}

type AccessTokenRecord = { userId: number, accessToken: string }

async function doJob(connection: MySqlConnection, userId: number) {
    console.log(new Date(), `Job started (userId: ${userId})`);

    const [{ accessToken }] = await connection.query("SELECT accessToken FROM access_token_entity WHERE userId = ? AND platform = 'matataki' AND active = 1;", [userId]) as Array<AccessTokenRecord>;
    const { payload } = jwtValidate(jwtDecode(accessToken));
    const matatakiId = payload.id as number;
    const newPosts = await getNewPostsOfUser(connection, userId, matatakiId);

    await saveNewPosts(connection, userId, newPosts);

    console.log(new Date(), "Job completed");
}

async function getNewPostsOfUser(connection: MySqlConnection, ucenterId: number, matatakiId: number) {
    try {
        let latestTimestamp = await getLatestTimestamp(connection, matatakiId);
        const { posts, latestMetadata } = await getMetaSpacePosts(matatakiId);

        const newPosts = new Array<NewPostInfo>();

        for (const [postId, { createdAt, metadataHash }] of Object.entries(latestMetadata)) {
            const timestamp = new Date(createdAt);
            if (timestamp <= latestTimestamp)
                continue;

            const postInfo = posts.find(post => post.id === Number(postId))!;

            newPosts.push({
                ucenterId,
                id: Number(postId),
                hash: metadataHash,
                timestamp: createdAt,
                title: postInfo.title,
                cover: postInfo.cover,
            });

            if (latestTimestamp < timestamp)
                latestTimestamp = timestamp;
        }

        await recordLatestTime(connection, matatakiId, latestTimestamp);

        return newPosts;
    } catch (error) {
        console.error(new Date(), `Unexpected error to ucenter id ${ucenterId}:`, error);
        throw error;
    }
}
async function getLatestTimestamp(connection: MySqlConnection, matatakiId: number) {
    const rows = await connection.query("SELECT latestTime FROM matataki_sync_entity WHERE userId = ?;", [matatakiId]) as Array<{ latestTime: Date }>;

    return rows[0]?.latestTime ?? new Date(0);
}
async function getMetaSpacePosts(userId: number) {
    const response = await fetch(`${env.MATATAKI_API_PREFIX}/migration/meta-space/posts?uid=${userId}`);

    return await response.json() as MetaSpacePosts;
}

async function saveNewPosts(connection: MySqlConnection, userId: number, newPosts: Array<NewPostInfo>) {
    for (const newPost of newPosts) {
        await connection.query("INSERT INTO post_entity(`userId`, `title`, `cover`, `platform`, `source`, `state`) VALUES(?, ?, ?, ?, ?, ?);", [
            newPost.ucenterId, newPost.title, `${env.MATATAKI_COVER_PREFIX}${newPost.cover}`, "matataki", newPost.hash, "pending",
        ]);
    }

    await redis.set(`cms:post:sync_state:matataki:${userId}`, newPosts.length);
    console.log(new Date(), `Saved ${newPosts.length} posts`);
}

async function recordLatestTime(connection: MySqlConnection, matatakiId: number, timestamp: Date) {
    await connection.query("REPLACE INTO matataki_sync_entity VALUES(?, ?);", [matatakiId, timestamp]);
}
