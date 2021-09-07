interface MetaSpacePostMetadata {
    metadataHash: string;
    createdAt: string;
}

export interface MetaSpacePosts {
    latestMetadata: Record<number, MetaSpacePostMetadata>;
}

export interface PostInfo {
    title: string;
    author: string;
    content: string;
}

export interface NewPostInfo {
    id: number;
    hash: string;
    timestamp: string;
    title: string;
    author: string;
    content: string;
}
