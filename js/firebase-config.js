// js/firebase-config.js - Firebase Web SDK configuration
//
// 🔴 ต้องแก้ 2 จุด:
//
// 1) วาง firebaseConfig ของโปรเจกต์คุณด้านล่าง
//    วิธีหา: Firebase Console -> Project settings (⚙️) -> General -> Your apps
//            -> Web app (</>) -> Copy "firebaseConfig"
//
// 2) เปิดใช้งาน Cloud Firestore ที่ Firebase Console ->
//    Build -> Firestore Database -> Create database
//
// หมายเหตุ: เพื่อให้ custom auth + seed ทำงานต้องเปิด Specific rules ชั่วคราว
// (ดูคำแนะนำท้ายไฟล์) หรือตั้ง rules ให้ client เขียน/อ่านได้ตามสิทธิ์
//
// firebaseConfig ของโปรเจกต์จริง (pae123-dd327)
const firebaseConfig = {
  apiKey: "AIzaSyCCVJ9EEV3JoWkyp4QFumtiicSiunOwwEY",
  authDomain: "pae123-dd327.firebaseapp.com",
  projectId: "pae123-dd327",
  storageBucket: "pae123-dd327.firebasestorage.app",
  messagingSenderId: "177442912949",
  appId: "1:177442912949:web:291f3edabffcd0889edcfc",
  measurementId: "G-ZR1D1MP8L9"
};

// Initialize Firebase
const firebaseApp = firebase.initializeApp(firebaseConfig);
const firestoreDb = firebase.firestore();

window.firebaseApp = firebaseApp;
window.firestoreDb = firestoreDb;

/*
  🔒 Cloud Firestore Rules (Firebase Console -> Firestore -> Rules)
  ---------------------------------------------------------------
  เพื่อให้เว็บทำงานได้ (dev ระยะแรก) ใช้ rules เปิดอ่าน/เขียนทั้งหมด:

    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /{document=**} {
          allow read, write: if true;
        }
      }
    }

  ⚠️ เมื่อพร้อมขึ้น Production ควรจำกัดให้แอดมินเขียน users/roles และ
     จำกัดการเขียนเฉพาะคอลเลคชันที่ผู้ใช้เป็นเจ้าของ
*/
