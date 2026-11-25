import type {
  Chapter,
  Character,
  Faction,
  Project,
  TimelineEvent,
  Volume,
  WorldCategory,
  WorldEntry,
} from '../types';
import { uid } from './utils';

export const DEFAULT_WORLD_CATEGORIES = ['地点', '物品', '规则/体系', '种族/生物', '历史'];

export function createWorldCategories(): WorldCategory[] {
  return DEFAULT_WORLD_CATEGORIES.map((name) => ({ id: uid(), name, builtin: true }));
}

export function createProject(name: string, genre = '', summary = ''): Project {
  const now = Date.now();
  return {
    id: uid(),
    name,
    genre,
    summary,
    createdAt: now,
    updatedAt: now,
    characters: [],
    worldCategories: createWorldCategories(),
    worldEntries: [],
    factions: [],
    events: [],
    volumes: [],
    chapters: [],
  };
}

export function createCharacter(name = '新人物'): Character {
  return {
    id: uid(),
    name,
    aliases: [],
    age: '',
    gender: '',
    appearance: '',
    personality: '',
    background: '',
    factionIds: [],
    relations: [],
    tags: [],
    notes: '',
  };
}

export function createWorldEntry(categoryId: string, name = '新词条'): WorldEntry {
  return { id: uid(), categoryId, name, summary: '', content: '', tags: [] };
}

export function createFaction(name = '新势力'): Faction {
  return {
    id: uid(),
    name,
    type: '',
    description: '',
    leaderId: null,
    memberIds: [],
    goals: '',
    relations: [],
  };
}

export function createEvent(title = '新事件'): TimelineEvent {
  return {
    id: uid(),
    title,
    time: '',
    description: '',
    characterIds: [],
    locationIds: [],
    importance: 'normal',
  };
}

export function createVolume(title: string): Volume {
  return { id: uid(), title };
}

export function createChapter(volumeId: string, title: string): Chapter {
  return {
    id: uid(),
    volumeId,
    title,
    synopsis: '',
    characterIds: [],
    status: 'planned',
    wordCount: 0,
  };
}

/** 对导入的数据做宽松校验与字段补全，防止旧版本/手改 JSON 缺字段导致崩溃。 */
export function normalizeProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<Project> & Record<string, unknown>;
  if (typeof r.name !== 'string') return null;
  const now = Date.now();
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const categories = arr<WorldCategory>(r.worldCategories);
  return {
    id: typeof r.id === 'string' && r.id ? r.id : uid(),
    name: r.name,
    genre: typeof r.genre === 'string' ? r.genre : '',
    summary: typeof r.summary === 'string' ? r.summary : '',
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : now,
    characters: arr<Character>(r.characters).map((c) => ({ ...createCharacter(), ...c })),
    worldCategories: categories.length ? categories : createWorldCategories(),
    worldEntries: arr<WorldEntry>(r.worldEntries).map((e) => ({ ...createWorldEntry(''), ...e })),
    factions: arr<Faction>(r.factions).map((f) => ({ ...createFaction(), ...f })),
    events: arr<TimelineEvent>(r.events).map((e) => ({ ...createEvent(), ...e })),
    volumes: arr<Volume>(r.volumes),
    chapters: arr<Chapter>(r.chapters).map((c) => ({ ...createChapter('', ''), ...c })),
  };
}
