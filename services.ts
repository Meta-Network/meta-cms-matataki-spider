import type { MetaSpacePosts, NewPostInfo, PostInfo } from "./types.ts";

export function getMatatakiAuthTokens() {
    // TODO: UCenter BE API
    return Promise.resolve(new Array<string>());
}

export async function getMetaSpacePosts(userId: number) {
    const response = await fetch(`/migration/meta-space/posts?uid=${userId}`);

    return await response.json() as MetaSpacePosts;
}

// deno-lint-ignore no-unused-vars
export function getLatestTimestamp(userId: number) {
    // TODO: CMS BE API
    return Promise.resolve(new Date());
}

export async function getPostInfo(metadataHash: string) {
    const response = await fetch(`https://ipfs.fleek.co/ipfs/${metadataHash}`);

    return await response.json() as PostInfo;
}

// deno-lint-ignore no-unused-vars
export function addNewPosts(posts: Array<NewPostInfo>) {
    // TODO: CMD BE API
    return Promise.resolve();
}
