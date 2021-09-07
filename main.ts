import { cron, jwtDecode, jwtValidate } from "./deps.ts";
import { getMatatakiAuthTokens, getLatestTimestamp, getMetaSpacePosts, getPostInfo, addNewPosts } from "./services.ts";
import type { NewPostInfo } from "./types.ts";

const everyTenMinutes = "*/10 * * * *";

cron(everyTenMinutes, async () => {
    const tokens = await getMatatakiAuthTokens();

    const promises = new Array<Promise<Array<NewPostInfo>>>();

    for (const token of tokens) {
        const { payload } = jwtValidate(jwtDecode(token));
        const userId = payload.id as number;

        promises.push(getNewPostsOfUser(userId));
    }

    const promiseResults = await Promise.allSettled(promises);
    const newPosts = promiseResults.filter(assertFulfilled).map(result => result.value).flat();

    await addNewPosts(newPosts);
});

async function getNewPostsOfUser(userId: number) {
    const latestTimestamp = await getLatestTimestamp(userId);
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

function assertFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
    return result.status === "fulfilled";
}
