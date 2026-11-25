import { useCallback, useState } from 'react';
import { useStore } from './store';
import { MODULES, type ModuleKey } from './navigation';
import { ProjectsView } from './views/ProjectsView';
import { CharactersView } from './views/CharactersView';
import { WorldView } from './views/WorldView';
import { FactionsView } from './views/FactionsView';
import { TimelineView } from './views/TimelineView';
import { OutlineView } from './views/OutlineView';
import { SearchView } from './views/SearchView';

interface Route {
  module: ModuleKey;
  /** 从搜索结果跳转时要定位到的条目 */
  focusId: string | null;
  /** 每次导航递增，保证模块视图重新挂载并读取 focusId */
  nonce: number;
}

export default function App() {
  const { loading, projects, currentProject, selectProject, saving, saveError, retrySave } = useStore();
  const [route, setRoute] = useState<Route>({ module: 'projects', focusId: null, nonce: 0 });

  const go = useCallback((module: ModuleKey, focusId: string | null = null) => {
    setRoute((r) => ({ module, focusId, nonce: r.nonce + 1 }));
  }, []);

  if (loading) {
    return <div className="app-loading">正在加载本地数据…</div>;
  }

  const active = currentProject ? route.module : 'projects';
  const viewKey = `${currentProject?.id ?? 'none'}-${active}-${route.nonce}`;

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">
          <span className="brand-icon">✒️</span>
          <div>
            <div className="brand-name">剧本设定管理</div>
            <small className="muted">本地优先 · 自动保存</small>
          </div>
        </div>

        <div className="project-switcher">
          <label className="muted small">当前作品</label>
          <select
            className="input select"
            value={currentProject?.id ?? ''}
            onChange={(e) => {
              selectProject(e.target.value || null);
              if (!e.target.value) go('projects');
            }}
          >
            {!projects.length && <option value="">（暂无作品）</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <ul className="nav">
          {MODULES.map((m) => {
            const disabled = m.needsProject && !currentProject;
            return (
              <li key={m.key}>
                <button
                  className={`nav-item${active === m.key ? ' is-active' : ''}`}
                  disabled={disabled}
                  title={disabled ? '请先创建或选择作品' : undefined}
                  onClick={() => go(m.key)}
                >
                  <span className="nav-icon">{m.icon}</span>
                  {m.label}
                  {currentProject && m.key !== 'projects' && m.key !== 'search' && (
                    <span className="nav-count">{countOf(m.key, currentProject)}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="sidebar-footer muted small">
          {saving ? '保存中…' : saveError ? <span className="danger">保存失败，有未落盘的修改</span> : '已保存到本机'}
        </div>
      </nav>

      <main className="content">
        {saveError && (
          <div className="banner banner-danger" role="alert">
            <span>{saveError}</span>
            <button className="btn btn-sm" onClick={retrySave}>
              立即重试
            </button>
          </div>
        )}
        {active === 'projects' && <ProjectsView onOpen={() => go('characters')} />}
        {currentProject && active === 'characters' && <CharactersView key={viewKey} initialId={route.focusId} />}
        {currentProject && active === 'world' && <WorldView key={viewKey} initialId={route.focusId} />}
        {currentProject && active === 'factions' && <FactionsView key={viewKey} initialId={route.focusId} />}
        {currentProject && active === 'timeline' && <TimelineView key={viewKey} initialId={route.focusId} />}
        {currentProject && active === 'outline' && <OutlineView key={viewKey} initialId={route.focusId} />}
        {currentProject && active === 'search' && <SearchView key={viewKey} onNavigate={go} />}
      </main>
    </div>
  );
}

function countOf(key: ModuleKey, p: NonNullable<ReturnType<typeof useStore>['currentProject']>): number {
  switch (key) {
    case 'characters':
      return p.characters.length;
    case 'world':
      return p.worldEntries.length;
    case 'factions':
      return p.factions.length;
    case 'timeline':
      return p.events.length;
    case 'outline':
      return p.chapters.length;
    default:
      return 0;
  }
}
