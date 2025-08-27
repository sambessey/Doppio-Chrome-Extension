import { initializeApp } from 'firebase/app';
import { getAuth, signOut } from 'firebase/auth';
import {getFirestore, setDoc, doc} from 'firebase/firestore';
import {storage} from '../storage';
type cursor = {
    cursor: string;
    slidesId: string;

}
type startStop = {
  currentSlide: string;
  mediaId: string;

}

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAJBewIPXFTznPOyUng9r57DhB2ZHFP0mI",
  authDomain: "doppio-workspace.firebaseapp.com",
  projectId: "doppio-workspace",
  storageBucket: "doppio-workspace.appspot.com",
  messagingSenderId: "349966800833",
  appId: "1:349966800833:web:5c54a7100a1baf0ff54140"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, 'doppio-dev');

export async function signOutUser() {
  console.log('Signing out');
  try {
    await signOut(auth);
    console.log('User signed out');
  } catch (error) {
    console.error('Error signing out: ', error);
  }
}

export async function updateCursor(cursor:cursor) {
    storage.get('auth').then (async (r) => {
        console.log(r,'auth from storage')
        console.log('Updating cursor to ',cursor);
        const docRef = doc(db, r.auth.user.email, cursor.slidesId);  
        await setDoc(docRef, {slide: cursor.cursor}); 
})  
/*
export async function startPresenting(startStop:startStop) {
  storage.get('auth').then (async (r) => {
      const docRef = doc(db, r.auth.user.email, startStop.slidesId);  
      await setDoc(docRef, {slide: cursor.cursor}); 
}) */
/*try { 
    
catch(e) {
    console.error('Error updating doc with cursor: ', e);    
  }*/
}