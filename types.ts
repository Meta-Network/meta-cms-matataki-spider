interface MetaSpacePostInfo {
    id: number;
    title: string;
    cover: string;
}
interface MetaSpacePostMetadata {
    metadataHash: string;
    createdAt: string;
}

export interface MetaSpacePosts {
    posts: Array<MetaSpacePostInfo>,
    latestMetadata: Record<number, MetaSpacePostMetadata>;
}

export interface NewPostInfo {
    ucenterId: number;
    id: number;
    hash: string;
    timestamp: string;
    title: string;
    cover: string;
    tags: Array<string>;
}

export interface MicroserviceMessage<T> {
    data: T;
    pattern: string;
}

export interface ApiWrapper<T> {
    data: T;
}
export interface MatatakiPostInfo {
    tags: Array<{ id: number, name: string }>;
}
