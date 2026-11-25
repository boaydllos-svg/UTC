import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { ExportFile, Project } from './types';
import { EXPORT_FORMAT, EXPORT_VERSION } from './types';
import {
  deleteProject as dbDeleteProject,
  getCurrentProjectId,
  loadAllProjects,
  saveProject,
  saveProjects,
  setCurrentProjectId,
} from './lib/db';
import { createProject, normalizeProject } from './lib/factories';
import { uid } from './lib/utils';

export type ProjectPatch = Partial<Project> | ((p: Project) => Partial<Project>);

interface StoreValue {
  loading: boolean;
  projects: Project[];
  currentProject: Project | null;
  selectProject: (id: string | null) => void;
  addProject: (name: string, genre?: string, summary?: string) => Project;
  removeProject: (id: string) => Promise<void>;
  updateProject: (id: string, patch: ProjectPatch) => void;
  /** 更新当前作品；绝大多数模块都用它。 */
  updateCurrent: (patch: ProjectPatch) => void;
  exportProjects: (ids?: string[]) => string;
  importProjects: (json: string) => Promise<{ imported: number; replaced: number }>;
  saving: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

const SAVE_DEBOUNCE_MS = 400;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const dirty = useRef<Map<string, Project>>(new Map());
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAllProjects()
      .then((list) => {
        if (cancelled) return;
        setProjects(list);
        const saved = getCurrentProjectId();
        setCurrentId(saved && list.some((p) => p.id === saved) ? saved : (list[0]?.id ?? null));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const flush = useCallback(async () => {
    timer.current = null;
    const batch = [...dirty.current.values()];
    dirty.current.clear();
    if (!batch.length) return;
    setSaving(true);
    try {
      await saveProjects(batch);
    } catch (err) {
      console.error('保存失败', err);
    } finally {
      setSaving(false);
    }
  }, []);

  const scheduleSave = useCallback(
    (project: Project) => {
      dirty.current.set(project.id, project);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, SAVE_DEBOUNCE_MS);
    },
    [flush],
  );

  useEffect(() => {
    const handler = () => {
      if (dirty.current.size) void flush();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [flush]);

  const selectProject = useCallback((id: string | null) => {
    setCurrentId(id);
    setCurrentProjectId(id);
  }, []);

  const updateProject = useCallback(
    (id: string, patch: ProjectPatch) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const partial = typeof patch === 'function' ? patch(p) : patch;
          const next = { ...p, ...partial, updatedAt: Date.now() };
          scheduleSave(next);
          return next;
        }),
      );
    },
    [scheduleSave],
  );

  const updateCurrent = useCallback(
    (patch: ProjectPatch) => {
      if (currentId) updateProject(currentId, patch);
    },
    [currentId, updateProject],
  );

  const addProject = useCallback(
    (name: string, genre = '', summary = '') => {
      const p = createProject(name, genre, summary);
      setProjects((prev) => [p, ...prev]);
      void saveProject(p);
      selectProject(p.id);
      return p;
    },
    [selectProject],
  );

  const removeProject = useCallback(
    async (id: string) => {
      dirty.current.delete(id);
      await dbDeleteProject(id);
      setProjects((prev) => {
        const next = prev.filter((p) => p.id !== id);
        if (currentId === id) selectProject(next[0]?.id ?? null);
        return next;
      });
    },
    [currentId, selectProject],
  );

  const exportProjects = useCallback(
    (ids?: string[]) => {
      const list = ids ? projects.filter((p) => ids.includes(p.id)) : projects;
      const file: ExportFile = {
        format: EXPORT_FORMAT,
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        projects: list,
      };
      return JSON.stringify(file, null, 2);
    },
    [projects],
  );

  const importProjects = useCallback(
    async (json: string) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(json);
      } catch {
        throw new Error('文件不是合法的 JSON');
      }
      const rawList: unknown[] = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray((parsed as ExportFile).projects)
          ? (parsed as ExportFile).projects
          : parsed && typeof parsed === 'object' && 'name' in (parsed as object)
            ? [parsed]
            : [];
      const incoming = rawList.map(normalizeProject).filter((p): p is Project => !!p);
      if (!incoming.length) throw new Error('文件中没有可识别的作品数据');

      let replaced = 0;
      const existingIds = new Set(projects.map((p) => p.id));
      const toSave = incoming.map((p) => {
        if (existingIds.has(p.id)) {
          const ok = window.confirm(`已存在同 ID 的作品「${p.name}」，是否覆盖？\n选择“取消”将作为副本导入。`);
          if (ok) {
            replaced += 1;
            return p;
          }
          return { ...p, id: uid(), name: `${p.name}（导入副本）` };
        }
        return p;
      });
      await saveProjects(toSave);
      setProjects((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        toSave.forEach((p) => map.set(p.id, p));
        return [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt);
      });
      if (!currentId) selectProject(toSave[0].id);
      return { imported: toSave.length, replaced };
    },
    [projects, currentId, selectProject],
  );

  const currentProject = useMemo(
    () => projects.find((p) => p.id === currentId) ?? null,
    [projects, currentId],
  );

  const value: StoreValue = {
    loading,
    projects,
    currentProject,
    selectProject,
    addProject,
    removeProject,
    updateProject,
    updateCurrent,
    exportProjects,
    importProjects,
    saving,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore 必须在 StoreProvider 内使用');
  return ctx;
}

/** 在模块视图中使用：保证当前作品存在。 */
export function useCurrentProject(): Project {
  const { currentProject } = useStore();
  if (!currentProject) throw new Error('当前没有选中的作品');
  return currentProject;
}
