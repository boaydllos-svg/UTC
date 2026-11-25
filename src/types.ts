export type ID = string;

export interface CharacterRelation {
  targetId: ID;
  type: string;
  note: string;
}

export interface Character {
  id: ID;
  name: string;
  aliases: string[];
  age: string;
  gender: string;
  appearance: string;
  personality: string;
  background: string;
  avatar?: string;
  factionIds: ID[];
  relations: CharacterRelation[];
  tags: string[];
  notes: string;
}

export interface WorldCategory {
  id: ID;
  name: string;
  builtin?: boolean;
}

export interface WorldEntry {
  id: ID;
  categoryId: ID;
  name: string;
  summary: string;
  content: string;
  tags: string[];
}

export interface FactionRelation {
  targetId: ID;
  type: string;
}

export interface Faction {
  id: ID;
  name: string;
  type: string;
  description: string;
  leaderId: ID | null;
  memberIds: ID[];
  goals: string;
  relations: FactionRelation[];
}

export type Importance = 'low' | 'normal' | 'high';

export interface TimelineEvent {
  id: ID;
  title: string;
  time: string;
  description: string;
  characterIds: ID[];
  locationIds: ID[];
  importance: Importance;
}

export interface Volume {
  id: ID;
  title: string;
}

export type ChapterStatus = 'planned' | 'drafting' | 'revising' | 'done';

export interface Chapter {
  id: ID;
  volumeId: ID;
  title: string;
  synopsis: string;
  characterIds: ID[];
  status: ChapterStatus;
  wordCount: number;
}

export interface Project {
  id: ID;
  name: string;
  genre: string;
  summary: string;
  createdAt: number;
  updatedAt: number;
  characters: Character[];
  worldCategories: WorldCategory[];
  worldEntries: WorldEntry[];
  factions: Faction[];
  events: TimelineEvent[];
  volumes: Volume[];
  chapters: Chapter[];
}

export const CHAPTER_STATUS_LABEL: Record<ChapterStatus, string> = {
  planned: '计划中',
  drafting: '写作中',
  revising: '修改中',
  done: '已完成',
};

export const IMPORTANCE_LABEL: Record<Importance, string> = {
  low: '次要',
  normal: '普通',
  high: '关键',
};

export const EXPORT_FORMAT = 'novel-setting-manager';
export const EXPORT_VERSION = 1;

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  projects: Project[];
}
