import { getAuth } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase'; // သင့် firebase.ts မှ functions instance ကို import လုပ်ပါ။

const auth = getAuth();
const setUserRoleCloudFunction = httpsCallable(functions, 'setUserRole');

async function assignUserRoleToNewUser(uid: string, role: string) {
  if (!auth.currentUser) {
    console.error("No authenticated user to perform this action.");
    return;
  }
  try {
    // Assume the current user (caller) is an Admin/Owner to set roles
    const result = await setUserRoleCloudFunction({ uid, role });
    console.log(result.data.message);

    // အရေးကြီး: Custom Claims အသစ်ရဖို့အတွက် User ရဲ့ ID Token ကို refresh လုပ်ရန်။
    // ဒါမှ Firestore Rules တွေမှာ အဲဒီ role ကို စစ်လို့ရပါလိမ့်မယ်။
    await auth.currentUser.getIdToken(true);
    console.log("User ID Token refreshed with new custom claims.");

    // UI ကို update လုပ်ရန် (လိုအပ်ပါက)
  } catch (error) {
    console.error("Error assigning role:", error);
    // Error handling
  }
}

// ဥပမာအားဖြင့်၊ User Signup ပြီးစီးပြီးနောက်:
// const userCredential = await createUserWithEmailAndPassword(auth, email, password);
// if (userCredential.user) {
//    // Default role ကို 'Employee' လို့ သတ်မှတ်
//    await assignUserRoleToNewUser(userCredential.user.uid, 'Employee');
//    // User Profile Data ကို Firestore မှာ သိမ်းဆည်းခြင်း (optional)
//    await setDoc(doc(db, "users", userCredential.user.uid), {
//        email: userCredential.user.email,
//        role: 'Employee', // Firestore မှာလည်း သိမ်းဆည်းထားနိုင်သည်
//        // ... other profile info
//    });
// }
