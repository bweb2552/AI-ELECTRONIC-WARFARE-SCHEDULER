// Firebase type declarations for TypeScript
declare module 'firebase/app' {
  export interface FirebaseApp {
    name: string;
    options: FirebaseOptions;
  }

  export interface FirebaseOptions {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  }

  export function initializeApp(options: FirebaseOptions, name?: string): FirebaseApp;
  export function getApps(): FirebaseApp[];
  export function getApp(name?: string): FirebaseApp;
}

declare module 'firebase/auth' {
  export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    emailVerified: boolean;
    isAnonymous: boolean;
    metadata: UserMetadata;
    providerData: UserInfo[];
    refreshToken: string;
    tenantId: string | null;
    delete(): Promise<void>;
    getIdToken(forceRefresh?: boolean): Promise<string>;
    getIdTokenResult(forceRefresh?: boolean): Promise<IdTokenResult>;
    reload(): Promise<void>;
    toJSON(): object;
  }

  export interface UserMetadata {
    creationTime: string;
    lastSignInTime: string;
  }

  export interface UserInfo {
    uid: string;
    displayName: string | null;
    email: string | null;
    phoneNumber: string | null;
    photoURL: string | null;
    providerId: string;
  }

  export interface IdTokenResult {
    token: string;
    expirationTime: string;
    authTime: string;
    issuedAtTime: string;
    signInProvider: string | null;
    claims: { [key: string]: any };
  }

  export interface Auth {
    app: FirebaseApp;
    currentUser: User | null;
    languageCode: string | null;
    settings: { appVerificationDisabledForTesting: boolean };
    tenantId: string | null;
    signInWithPopup(provider: AuthProvider): Promise<UserCredential>;
    signInWithEmailAndPassword(email: string, password: string): Promise<UserCredential>;
    createUserWithEmailAndPassword(email: string, password: string): Promise<UserCredential>;
    signOut(): Promise<void>;
    onAuthStateChanged(nextOrObserver: User | null | ((user: User | null) => void), error?: (error: Error) => void, completed?: () => void): () => void;
    setPersistence(persistence: Persistence): Promise<void>;
  }

  export interface UserCredential {
    user: User;
    providerId: string | null;
    operationType: string;
  }

  export interface AuthProvider {
    providerId: string;
  }

  export class GoogleAuthProvider implements AuthProvider {
    providerId: string;
    constructor();
    setCustomParameters(customOAuthParameters: Object): GoogleAuthProvider;
  }

  export type Persistence = 'local' | 'session' | 'none';
  export const browserLocalPersistence: Persistence;
  export const browserSessionPersistence: Persistence;
  export const inMemoryPersistence: Persistence;

  export function getAuth(app?: FirebaseApp): Auth;
  export function setPersistence(auth: Auth, persistence: Persistence): Promise<void>;
  export function signInWithPopup(auth: Auth, provider: AuthProvider): Promise<UserCredential>;
  export function signInWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<UserCredential>;
  export function createUserWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<UserCredential>;
  export function signOut(auth: Auth): Promise<void>;
  export function onAuthStateChanged(auth: Auth, nextOrObserver: User | null | ((user: User | null) => void), error?: (error: Error) => void, completed?: () => void): () => void;
}