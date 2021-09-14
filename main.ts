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

    const latestTimestamp = await getLatestTimestamp(connection);
    if (latestTimestamp === null) {
        await recordLatestTime(connection);
        return;
    }

    const rows = await connection.query("SELECT userId, accessToken FROM access_token_entity WHERE platform = 'matataki' AND active = 1;") as Array<AccessTokenRecord>;

    const promises = new Array<Promise<Array<NewPostInfo>>>();

    for (const { userId, accessToken } of rows) {
        const { payload } = jwtValidate(jwtDecode(accessToken));
        const matatakiId = payload.id as number;
        promises.push(getNewPostsOfUser(latestTimestamp, userId, matatakiId));
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
    await recordLatestTime(connection);

    console.log(new Date(), "Job completed");
}

async function getNewPostsOfUser(latestTimestamp: Date, ucenterId: number, matatakiId: number) {
    try {
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
        }

        return newPosts;
    } catch (error) {
        console.error(new Date(), `Unexpected error to ucenter id ${ucenterId}:`, error);
        throw error;
    }
}
async function getLatestTimestamp(connection: MySqlConnection) {
    const rows = await connection.query("SELECT latestTime FROM synchronizer_entity WHERE name = 'matataki';") as Array<{ latestTime: Date }>;

    if (rows.length === 0)
        return null;

    return rows[0].latestTime;
}
async function getMetaSpacePosts(userId: number) {
    const response = await fetch(`${env.MATATAKI_API_PREFIX}/migration/meta-space/posts?uid=${userId}`);

    return await response.json() as MetaSpacePosts;
}

async function saveNewPosts(connection: MySqlConnection, newPosts: Array<NewPostInfo>) {
    for (const newPost of newPosts) {
        await connection.query("INSERT INTO post_entity(`userId`, `title`, `cover`, `platform`, `source`, `state`) VALUES(?, ?, ?, 'matataki', ?, 'pending');", [
            newPost.ucenterId, newPost.title, newPost.cover, newPost.hash,
        ]);
    }

    console.log(new Date(), `Saved ${newPosts.length} posts`);
}

async function recordLatestTime(connection: MySqlConnection) {
    await connection.query("REPLACE INTO synchronizer_entity VALUES('matataki', NOW());");
}
