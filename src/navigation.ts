export type ModuleKey = 'projects' | 'characters' | 'world' | 'factions' | 'timeline' | 'outline' | 'search';

export interface ModuleMeta {
  key: ModuleKey;
  label: string;
  icon: string;
  /** 是否需要先选中一部作品 */
  needsProject: boolean;
}

export const MODULES: ModuleMeta[] = [
  { key: 'projects', label: '作品', icon: '📚', needsProject: false },
  { key: 'characters', label: '人物', icon: '🧑', needsProject: true },
  { key: 'world', label: '世界观', icon: '🌍', needsProject: true },
  { key: 'factions', label: '势力', icon: '🏰', needsProject: true },
  { key: 'timeline', label: '时间线', icon: '🕰️', needsProject: true },
  { key: 'outline', label: '大纲', icon: '📖', needsProject: true },
  { key: 'search', label: '搜索', icon: '🔍', needsProject: true },
];
