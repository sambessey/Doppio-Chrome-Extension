import { storage } from "../storage";
import { signOutUser, updateCursor } from './firebase-helpers';
import {restUpdateCursor, restStartStopPresentation, restRefreshEventId} from './api-helpers';
type cursor = {
    cursor: string;
    slidesId: string;

}

// Background service workers
// https://developer.chrome.com/docs/extensions/mv3/service_workers/

chrome.runtime.onInstalled.addListener(() => {
    storage.get().then(console.log);
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log('Tab activated:', activeInfo);
  console.log('CALLING GET EVENT - TA');
  getEvent()
  .then((result) => {
    console.log(result);
  })
});

/*chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status && changeInfo.status === 'complete')
  {
    console.log('CALLING GET EVENT - AL');
    getEvent()
  .then((result) => {
    console.log('SAW THIS',result.meta.eventId);
    console.log(tab)
  })
  }
});*/

//chrome.tabs.onUpdated.addListener(handleUpdated, filter);
/* None of the below works because SW is stateless and it takes time for chrome storage to set
chrome.tabs.onUpdated.addListener(() => {
  let currentTime = new Date().getTime();
      chrome.storage.local.get(['lastPingSlideChange'], function(result) {
        console.log('cur',currentTime)
        console.log('ret',result.lastPingSlideChange)
        if(result.lastPingSlideChange && result.lastPingSlideChange < new Date().getTime()-500){
          console.log('THIS WOULD REFRESH');
          chrome.storage.local.set({ lastPingSlideChange: currentTime });
        }
      });
});
*/




async function getEvent(mediaId?: string) {
  try {
    console.log('GET EVENT IS CALLED,', mediaId)
    const response = await restRefreshEventId({
      url: 'https://localdev.doppio.us/findeventusingmediaid',
      uid: 'sam@doppio.live',
      mediaId: mediaId
    });
    //console.log(response,'event');
    return response;
  } catch (error) {
    console.error('Error fetching event:', error);
    return undefined;
  }
}

// NOTE: If you want to toggle the side panel from the extension's action button,
// you can use the following code:
// chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
//    .catch((error) => console.error(error));
const OFFSCREEN_DOCUMENT_PATH = '/src/public/offscreen.html';

// A global promise to avoid concurrency issues
let creatingOffscreenDocument;

// Chrome only allows for a single offscreenDocument. This is a helper function
// that returns a boolean indicating if a document is already active.
async function hasDocument() {
  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  const matchedClients = await clients.matchAll();
  console.log('TESTING FOR OFFSCREEN')
  console.log(chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH))
  return matchedClients.some(
    (c) => c.url === chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)
  );
}

async function setupOffscreenDocument(path) {
  // If we do not have a document, we are already setup and can skip
  if (!(await hasDocument())) {
    // create offscreen document
    let creating = null
    if (creating) {
      await creating;
    } else {
      creating = chrome.offscreen.createDocument({
        url: path,
        reasons: [
            chrome.offscreen.Reason.DOM_SCRAPING
        ],
        justification: 'authentication'
      });
      await creating;
      creating = null;
    }
  }
}

async function closeOffscreenDocument() {
  if (!(await hasDocument())) {
    return;
  }
  await chrome.offscreen.closeDocument();
}

function getAuth() {
  return new Promise(async (resolve, reject) => {
    const auth = await chrome.runtime.sendMessage({
      type: 'firebase-auth',
      target: 'offscreen'
    });
    auth?.name !== 'FirebaseError' ? resolve(auth) : reject(auth);
  })
}

async function firebaseAuth() {
  await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);

  const auth = await getAuth()
    .then((auth) => {
      console.log('User Authenticated', auth);
      storage.set({ auth: auth });
      storage.get('auth').then (r => (console.log(r,'auth from storage on SET'))); 
      return auth;
    })
    .catch(err => {
      if (err.code === 'auth/operation-not-allowed') {
        console.error('You must enable an OAuth provider in the Firebase' +
                      ' console in order to use signInWithPopup. This sample' +
                      ' uses Google by default.');
      } else {
        console.error(err);
        return err;
      }
    })
    .finally(closeOffscreenDocument)

  return auth;
}

/*async function signOut() {
    console.log('Signing out');
    try {
      await firebase.auth().signOut();
      console.log('User signed out');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  }*/
  
  // Listen for messages from the popup
  
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'POPUP_OPENED') {
      firebaseAuth();
    }
    if (event.data && event.data.type === 'SIGNOUT_CLICKED') {
        signOutUser();
      }
  });

  // Listen for messages from the content script

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request && request.type === 'START_STOP_PRESENTING') {
      (async () => {
        try {
          console.log('in startstop presenting', request.payload);
          let startStop = request.payload.command;
          let response = await restStartStopPresentation({
            url: `https://localdev.doppio.us/${startStop}`,
            uid: "sam@doppio.live",
            currentSlide: request.payload.currentSlide,
            mediaId: request.payload.mediaId
          });
          console.log('RESPONSE FROM START_STOP_PRESENTING:', response);
          sendResponse({ message: response }); // Send the response after the async operation completes
        } catch (error) {
          console.error('Error in START_STOP_PRESENTING:', error);
          sendResponse({ error: 'Error in START_STOP_PRESENTING' }); // Send an error response
        }
      })();
      return true; // Indicate that the response will be sent asynchronously
    }
  
    if (request && request.type === 'CHANGE_CURSOR_EDIT') {
      (async () => {
        try {
          console.log('CALLING GET EVENT - CCE');
          let eventId = await getEvent(request.payload.slidesId);
          console.log('in change cursor edit', request.payload);
          console.log('event id', eventId);
          updateCursor({
            cursor: request.payload.cursor,
            slidesId: request.payload.slidesId
          });
          const result = await restUpdateCursor({
            url: "https://localdev.doppio.us/moveslide",
            uid: "sam@doppio.live",
            eventId: eventId.meta.eventId,
            prevSlide: request.payload.oldSlideId,
            nextSlide: request.payload.cursor
          });
          sendResponse({ message: result }); // Send the response after the async operation completes
        } catch (error) {
          console.error('Error in CHANGE_CURSOR_EDIT:', error);
          sendResponse({ error: 'Error in CHANGE_CURSOR_EDIT' }); // Send an error response
        }
      })();
      return true; // Indicate that the response will be sent asynchronously
    }
  });