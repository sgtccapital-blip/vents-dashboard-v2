import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

// Generic CRUD helpers
export async function getAll(collectionName, orderField = 'createdAt', direction = 'desc') {
    try {
        const q = query(collection(db, collectionName), orderBy(orderField, direction));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
        // Fallback: no orderBy if index doesn't exist
        const snapshot = await getDocs(collection(db, collectionName));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }
}

export async function getFiltered(collectionName, field, value) {
    const q = query(collection(db, collectionName), where(field, '==', value));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getOne(collectionName, id) {
    const snap = await getDoc(doc(db, collectionName, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

export async function create(collectionName, data) {
    const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return docRef.id;
}

export async function update(collectionName, id, data) {
    await updateDoc(doc(db, collectionName, id), {
        ...data,
        updatedAt: serverTimestamp()
    });
}

export async function remove(collectionName, id) {
    await deleteDoc(doc(db, collectionName, id));
}
