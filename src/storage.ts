type IStorage = {
    count: number;
};

const defaultStorage: IStorage = {
    count: 0,
};

export const storage = {
    get: (value: any): Promise<any> =>
        chrome.storage.sync.get(value) as unknown as Promise<any>,
    set: (value: any): Promise<void> => chrome.storage.sync.set(value),
};
