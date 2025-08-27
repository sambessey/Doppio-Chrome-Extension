
import { signInWithPopup, GoogleAuthProvider, getAuth } from'firebase/auth';
import { initializeApp } from 'firebase/app';
const firebaseConfig = {
    apiKey: "AIzaSyAJBewIPXFTznPOyUng9r57DhB2ZHFP0mI",
    authDomain: "doppio-workspace.firebaseapp.com",
    projectId: "doppio-workspace",
    storageBucket: "doppio-workspace.appspot.com",
    messagingSenderId: "349966800833",
    appId: "1:349966800833:web:5c54a7100a1baf0ff54140"
  };
  import Options from "../components/Options.svelte";
import { storage } from "../storage";

// Action popup
// https://developer.chrome.com/docs/extensions/reference/action/

function render() {
    const target = document.getElementById("app");

    if (target) {
        storage.get().then(({ count }) => {
            new Options({
                target,
                props: { count },
            });
        });
    }
}

document.addEventListener("DOMContentLoaded", render);


const app = initializeApp(firebaseConfig);
const auth = getAuth();

// This code runs inside of an iframe in the extension's offscreen document.
// This gives you a reference to the parent frame, i.e. the offscreen document.
// You will need this to assign the targetOrigin for postMessage.
const PARENT_FRAME = document.location.ancestorOrigins[0];

// This demo uses the Google auth provider, but any supported provider works.
// Make sure that you enable any provider you want to use in the Firebase Console.
// https://console.firebase.google.com/project/_/authentication/providers
const PROVIDER = new GoogleAuthProvider();

function sendResponse(result) {
  globalThis.parent.self.postMessage(JSON.stringify(result), PARENT_FRAME);
}

globalThis.addEventListener('message', function({data}) {
  if (data.initAuth) {
    // Opens the Google sign-in page in a popup, inside of an iframe in the
    // extension's offscreen document......!
    // To centralize logic, all respones are forwarded to the parent frame,
    // which goes on to forward them to the extension's service worker.
    signInWithPopup(auth, PROVIDER)
      .then(sendResponse)
      .catch(sendResponse)
  }
});
// This should be placed where you open the popup
navigator.serviceWorker.controller.postMessage({
    type: 'POPUP_OPENED'
  });
