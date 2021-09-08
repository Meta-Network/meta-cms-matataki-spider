import { connectNats, StringCodec } from "./deps.ts";
import type { MetaSpacePosts, NewPostInfo, PostInfo } from "./types.ts";

const natsClient = await connectNats({

});

const stringCodec = StringCodec();

const userIdSubscription = natsClient.subscribe("spider.matataki.userIds");

for await (const message of userIdSubscription) {
    const userId = parseInt(stringCodec.decode(message.data));
    const newPosts = await getNewPostsOfUser(userId);

    // TODO: Post
}


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
function getLatestTimestamp(userId: number) {
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
