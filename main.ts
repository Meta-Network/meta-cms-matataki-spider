import { cron, jwtDecode, jwtValidate, MySqlClient } from "./deps.ts";
import type { MySqlConnection } from "./deps.ts";
import * as env from "./env.ts";
import type { MetaSpacePosts, NewPostInfo, PostInfo } from "./types.ts";

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

async function cronJob(connection: MySqlConnection) {
    const accessTokens = await connection.query("SELECT accessToken FROM access_token_entity WHERE platform = 'matataki';") as Array<string>;

    for (const token of accessTokens) {
        const { payload } = jwtValidate(jwtDecode(token));
        const userId = payload.id as number;
        const latestTimestamp = await getLatestTimestamp(connection, userId);
        const newPosts = await getNewPostsOfUser(latestTimestamp, userId);

        await saveNewPosts(connection, newPosts);
    }
}

async function getNewPostsOfUser(latestTimestamp: Date, userId: number) {
    const { latestMetadata } = await getMetaSpacePosts(userId);

    const newPosts = new Array<NewPostInfo>();

    for (const [postId, { createdAt, metadataHash }] of Object.entries(latestMetadata)) {
        const timestamp = new Date(createdAt);
        if (timestamp <= latestTimestamp)
            continue;

        const postInfo = await getPostInfo(metadataHash);

        newPosts.push({
            id: Number(postId),
            hash: metadataHash,
            timestamp: createdAt,
            ...postInfo,
        });
    }

    return newPosts;
}
function getLatestTimestamp(connection: MySqlConnection, userId: number) {
    return Promise.resolve(new Date());
}
async function getMetaSpacePosts(userId: number) {
    const response = await fetch(`/migration/meta-space/posts?uid=${userId}`);

    return await response.json() as MetaSpacePosts;
}
async function getPostInfo(metadataHash: string) {
    const response = await fetch(`https://ipfs.fleek.co/ipfs/${metadataHash}`);

    return await response.json() as PostInfo;
}

function saveNewPosts(connection: MySqlConnection, newPosts: Array<NewPostInfo>) {
    return Promise.resolve();
}
