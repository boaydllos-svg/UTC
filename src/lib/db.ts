import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Project } from '../types';

interface NovelDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: { updatedAt: number };
  };
}

const DB_NAME = 'novel-setting-manager';
const DB_VERSION = 1;
const CURRENT_PROJECT_KEY = 'nsm:currentProjectId';

let dbPromise: Promise<IDBPDatabase<NovelDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<NovelDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('projects', { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      },
    });
  }
  return dbPromise;
}

export async function loadAllProjects(): Promise<Project[]> {
  const db = await getDB();
  const all = await db.getAll('projects');
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveProject(project: Project): Promise<void> {
  const db = await getDB();
  await db.put('projects', project);
}

export async function saveProjects(projects: Project[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('projects', 'readwrite');
  await Promise.all([...projects.map((p) => tx.store.put(p)), tx.done]);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('projects', id);
}

export function getCurrentProjectId(): string | null {
  try {
    return localStorage.getItem(CURRENT_PROJECT_KEY);
  } catch {
    return null;
  }
}

export function setCurrentProjectId(id: string | null) {
  try {
    if (id) localStorage.setItem(CURRENT_PROJECT_KEY, id);
    else localStorage.removeItem(CURRENT_PROJECT_KEY);
  } catch {
    /* ignore */
  }
}
