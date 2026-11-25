import { useRef, useState } from 'react';
import { useStore } from '../store';
import { Field, Input, Modal, Textarea, confirmDelete } from '../components/ui';
import { downloadText, formatDate, readFileAsText } from '../lib/utils';
import type { Project } from '../types';

export function ProjectsView({ onOpen }: { onOpen: () => void }) {
  const { projects, currentProject, selectProject, addProject, removeProject, updateProject, exportProjects, importProjects } =
    useStore();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (file: File) => {
    try {
      const text = await readFileAsText(file);
      const r = await importProjects(text);
      setMessage(`成功导入 ${r.imported} 部作品${r.replaced ? `（覆盖 ${r.replaced} 部）` : ''}`);
    } catch (err) {
      setMessage(`导入失败：${(err as Error).message}`);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>我的作品</h1>
          <p className="muted">所有数据保存在本机浏览器中，建议定期导出 JSON 备份。</p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => fileRef.current?.click()}>
            导入 JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImport(f);
              e.target.value = '';
            }}
          />
          <button
            className="btn"
            disabled={!projects.length}
            onClick={() => downloadText(`全部作品-${new Date().toISOString().slice(0, 10)}.json`, exportProjects())}
          >
            导出全部
          </button>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            + 新建作品
          </button>
        </div>
      </div>

      {message && (
        <div className="banner" onClick={() => setMessage(null)}>
          {message}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="empty-state large">
          <div className="empty-icon">📚</div>
          <h3>还没有作品</h3>
          <p className="muted">新建一部作品，开始管理人物、世界观、势力、时间线与大纲。</p>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            + 新建作品
          </button>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((p) => (
            <article
              key={p.id}
              className={`project-card${currentProject?.id === p.id ? ' is-current' : ''}`}
              onClick={() => {
                selectProject(p.id);
                onOpen();
              }}
            >
              <header>
                <h3>{p.name}</h3>
                {p.genre && <span className="badge">{p.genre}</span>}
              </header>
              <p className="project-summary">{p.summary || '暂无简介'}</p>
              <ul className="project-stats">
                <li>人物 {p.characters.length}</li>
                <li>设定 {p.worldEntries.length}</li>
                <li>势力 {p.factions.length}</li>
                <li>事件 {p.events.length}</li>
                <li>章节 {p.chapters.length}</li>
              </ul>
              <footer>
                <small className="muted">更新于 {formatDate(p.updatedAt)}</small>
                <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="link-btn" onClick={() => setEditing(p)}>
                    编辑
                  </button>
                  <button
                    className="link-btn"
                    onClick={() => downloadText(`${p.name}.json`, exportProjects([p.id]))}
                  >
                    导出
                  </button>
                  <button
                    className="link-btn danger"
                    onClick={() => confirmDelete(p.name) && void removeProject(p.id)}
                  >
                    删除
                  </button>
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}

      {creating && (
        <ProjectForm
          title="新建作品"
          onClose={() => setCreating(false)}
          onSubmit={(v) => {
            addProject(v.name, v.genre, v.summary);
            setCreating(false);
            onOpen();
          }}
        />
      )}
      {editing && (
        <ProjectForm
          title="编辑作品信息"
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(v) => {
            updateProject(editing.id, v);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ProjectForm({
  title,
  initial,
  onClose,
  onSubmit,
}: {
  title: string;
  initial?: Pick<Project, 'name' | 'genre' | 'summary'>;
  onClose: () => void;
  onSubmit: (v: { name: string; genre: string; summary: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [genre, setGenre] = useState(initial?.genre ?? '');
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const valid = name.trim().length > 0;
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn-primary"
            disabled={!valid}
            onClick={() => onSubmit({ name: name.trim(), genre: genre.trim(), summary: summary.trim() })}
          >
            保存
          </button>
        </>
      }
    >
      <Field label="作品名称">
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：长夜将尽" />
      </Field>
      <Field label="题材 / 类型">
        <Input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="玄幻、悬疑、科幻…" />
      </Field>
      <Field label="一句话简介">
        <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </Field>
    </Modal>
  );
}
