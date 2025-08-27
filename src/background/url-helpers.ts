export async function getMediaId(): Promise<string> {
    return new Promise((resolve, reject) => {
        console.log('AFFF Fetching media ID from the active tab URL...');
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) {
                console.error('AFFF Error querying tabs:', chrome.runtime.lastError.message);
                reject(chrome.runtime.lastError.message);
                return;
            }

            if (tabs.length > 0) {
                const url = tabs[0].url;
                console.log('AFFF Active tab URL:', url);

                if (url) {
                    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
                    if (match && match[1]) {
                        console.log('AFFF Media ID found:', match[1]);
                        resolve(match[1]);
                    } else {
                        console.error('AFFF Media ID not found in the URL:', url);
                        reject('Media ID not found in the URL.');
                    }
                } else {
                    console.error('AFFF No URL found for the active tab.');
                    reject('No URL found for the active tab.');
                }
            } else {
                console.error('AFFF No active tab found.');
                reject('No active tab found.');
            }
        });
    });
}