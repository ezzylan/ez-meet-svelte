import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
	apiKey: 'AIzaSyDB092-F-b-Vowll0eJ-KUoxbt5c64xMAk',
	authDomain: 'web-rtc-2022.firebaseapp.com',
	projectId: 'web-rtc-2022',
	storageBucket: 'web-rtc-2022.appspot.com',
	messagingSenderId: '1032290264556',
	appId: '1:1032290264556:web:682e6a701b0d8293e40cc9',
	measurementId: 'G-ZCKWVP2123'
};

initializeApp(firebaseConfig);
export const db = getFirestore();
