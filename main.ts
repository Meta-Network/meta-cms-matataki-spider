import { cron, jwtDecode, jwtValidate, MySqlClient } from "./deps.ts";
import type { MySqlConnection } from "./deps.ts";
import * as env from "./env.ts";
import type { MetaSpacePosts, NewPostInfo } from "./types.ts";

const everyTenMinutes = "0 */10 * * * *";

cron(everyTenMinutes, async () => {
    const client = await new MySqlClient().connect({
        hostname: env.DB_HOST,
        username: env.DB_USER,
        password: env.DB_PASSWORD,
        db: env.DB_DATABASE,
    });

    try {
        await client.transaction(cronJob);
    } finally {
        await client.close();
    }
});

type AccessTokenRecord = { userId: number, accessToken: string }

async function cronJob(connection: MySqlConnection) {
    console.log(new Date(), "Job started");

    const rows = await connection.query("SELECT userId, accessToken FROM access_token_entity WHERE platform = 'matataki' AND active = 1;") as Array<AccessTokenRecord>;
    const promises = new Array<Promise<Array<NewPostInfo>>>();

    for (const { userId, accessToken } of rows) {
        const { payload } = jwtValidate(jwtDecode(accessToken));
        const matatakiId = payload.id as number;
        promises.push(getNewPostsOfUser(connection, userId, matatakiId));
    }

    const promiseResults = await Promise.allSettled(promises);
    const newPosts = new Array<NewPostInfo>();

    for (const promiseResult of promiseResults) {
        if (promiseResult.status === "rejected") {
            continue;
        }

        newPosts.push(...promiseResult.value);
    }

    await saveNewPosts(connection, newPosts);

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

async function saveNewPosts(connection: MySqlConnection, newPosts: Array<NewPostInfo>) {
    for (const newPost of newPosts) {
        await connection.query("INSERT INTO post_entity(`userId`, `title`, `cover`, `platform`, `source`, `state`) VALUES(?, ?, ?, ?, ?, ?);", [
            newPost.ucenterId, newPost.title, newPost.cover, newPost.hash, "matataki", "pending",
        ]);
    }

    console.log(new Date(), `Saved ${newPosts.length} posts`);
}

async function recordLatestTime(connection: MySqlConnection, matatakiId: number, timestamp: Date) {
    await connection.query("REPLACE INTO matataki_sync_entity VALUES(?, ?);", [matatakiId, timestamp]);
}
