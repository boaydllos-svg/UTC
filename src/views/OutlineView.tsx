import { useState } from 'react';
import { useCurrentProject, useStore } from '../store';
import { EmptyState, Field, Input, MultiPicker, Select, Textarea, confirmDelete } from '../components/ui';
import { createChapter, createVolume } from '../lib/factories';
import { CHAPTER_STATUS_LABEL, type Chapter, type ChapterStatus } from '../types';

function swap<T>(arr: T[], i: number, j: number): T[] {
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function OutlineView({ initialId }: { initialId?: string | null }) {
  const project = useCurrentProject();
  const { updateCurrent } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const selected = project.chapters.find((c) => c.id === selectedId) ?? null;
  const chaptersOf = (volumeId: string) => project.chapters.filter((c) => c.volumeId === volumeId);
  const totalWords = project.chapters.reduce((s, c) => s + (c.wordCount || 0), 0);
  const doneCount = project.chapters.filter((c) => c.status === 'done').length;

  const addVolume = () =>
    updateCurrent((p) => ({ volumes: [...p.volumes, createVolume(`第${p.volumes.length + 1}卷`)] }));
  const renameVolume = (id: string, title: string) =>
    updateCurrent((p) => ({ volumes: p.volumes.map((v) => (v.id === id ? { ...v, title } : v)) }));
  const removeVolume = (id: string) => {
    const vol = project.volumes.find((v) => v.id === id)!;
    const n = chaptersOf(id).length;
    if (!window.confirm(`删除「${vol.title}」${n ? `及其 ${n} 个章节` : ''}？`)) return;
    updateCurrent((p) => ({ volumes: p.volumes.filter((v) => v.id !== id), chapters: p.chapters.filter((c) => c.volumeId !== id) }));
  };
  const moveVolume = (id: string, dir: -1 | 1) =>
    updateCurrent((p) => {
      const i = p.volumes.findIndex((v) => v.id === id);
      return { volumes: swap(p.volumes, i, i + dir) };
    });

  const addChapter = (volumeId: string) => {
    const ch = createChapter(volumeId, `第${chaptersOf(volumeId).length + 1}章`);
    updateCurrent((p) => ({ chapters: [...p.chapters, ch] }));
    setSelectedId(ch.id);
  };
  const updateChapter = (id: string, patch: Partial<Chapter>) =>
    updateCurrent((p) => ({ chapters: p.chapters.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const removeChapter = (ch: Chapter) => {
    if (!confirmDelete(ch.title)) return;
    updateCurrent((p) => ({ chapters: p.chapters.filter((c) => c.id !== ch.id) }));
    if (selectedId === ch.id) setSelectedId(null);
  };
  /** 章节在整张表中按卷分组存放，仅在同卷内交换相邻两章。 */
  const moveChapter = (ch: Chapter, dir: -1 | 1) =>
    updateCurrent((p) => {
      const siblings = p.chapters.filter((c) => c.volumeId === ch.volumeId);
      const si = siblings.findIndex((c) => c.id === ch.id);
      const target = siblings[si + dir];
      if (!target) return {};
      const i = p.chapters.indexOf(ch);
      const j = p.chapters.indexOf(target);
      return { chapters: swap(p.chapters, i, j) };
    });

  const toggle = (id: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="list-detail outline">
      <aside className="list-pane outline-tree">
        <div className="list-toolbar outline-toolbar">
          <div className="muted small">
            共 {project.volumes.length} 卷 {project.chapters.length} 章 · 完成 {doneCount} 章 · 约 {totalWords.toLocaleString()} 字
          </div>
          <button className="btn btn-primary" onClick={addVolume}>
            + 新建卷
          </button>
        </div>
        <div className="list-scroll">
          {project.volumes.length === 0 && (
            <p className="muted pad">先新建一卷，再在卷下添加章节。</p>
          )}
          {project.volumes.map((v, vi) => {
            const chapters = chaptersOf(v.id);
            const isCollapsed = collapsed.has(v.id);
            return (
              <div key={v.id} className="volume">
                <div className="volume-head">
                  <button className="icon-btn" onClick={() => toggle(v.id)} aria-label="折叠">
                    {isCollapsed ? '▸' : '▾'}
                  </button>
                  <input className="volume-title" value={v.title} onChange={(e) => renameVolume(v.id, e.target.value)} />
                  <span className="muted small">{chapters.length} 章</span>
                  <button className="icon-btn" disabled={vi === 0} onClick={() => moveVolume(v.id, -1)} title="上移">
                    ↑
                  </button>
                  <button className="icon-btn" disabled={vi === project.volumes.length - 1} onClick={() => moveVolume(v.id, 1)} title="下移">
                    ↓
                  </button>
                  <button className="icon-btn" onClick={() => addChapter(v.id)} title="添加章节">
                    +
                  </button>
                  <button className="icon-btn danger" onClick={() => removeVolume(v.id)} title="删除卷">
                    ×
                  </button>
                </div>
                {!isCollapsed &&
                  chapters.map((ch, ci) => (
                    <button
                      key={ch.id}
                      className={`chapter-item${ch.id === selectedId ? ' is-active' : ''}`}
                      onClick={() => setSelectedId(ch.id)}
                    >
                      <span className={`status-dot status-${ch.status}`} title={CHAPTER_STATUS_LABEL[ch.status]} />
                      <span className="chapter-title">{ch.title || '（未命名）'}</span>
                      <span className="chapter-meta muted small">
                        {ch.characterIds.length ? `${ch.characterIds.length}人` : ''}
                        {ch.wordCount ? ` ${ch.wordCount}字` : ''}
                      </span>
                      <span className="chapter-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" disabled={ci === 0} onClick={() => moveChapter(ch, -1)}>
                          ↑
                        </button>
                        <button className="icon-btn" disabled={ci === chapters.length - 1} onClick={() => moveChapter(ch, 1)}>
                          ↓
                        </button>
                      </span>
                    </button>
                  ))}
                {!isCollapsed && chapters.length === 0 && (
                  <button className="link-btn chapter-add" onClick={() => addChapter(v.id)}>
                    + 添加章节
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      <section className="detail-pane">
        {selected ? (
          <div className="editor" key={selected.id}>
            <div className="detail-header">
              <input
                className="title-input"
                value={selected.title}
                onChange={(e) => updateChapter(selected.id, { title: e.target.value })}
                placeholder="章节标题"
              />
              <div className="detail-actions">
                <button className="btn btn-danger-ghost" onClick={() => removeChapter(selected)}>
                  删除
                </button>
              </div>
            </div>
            <div className="form-grid">
              <Field label="所属卷">
                <Select value={selected.volumeId} onChange={(e) => updateChapter(selected.id, { volumeId: e.target.value })}>
                  {project.volumes.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="状态">
                <Select value={selected.status} onChange={(e) => updateChapter(selected.id, { status: e.target.value as ChapterStatus })}>
                  {(Object.keys(CHAPTER_STATUS_LABEL) as ChapterStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {CHAPTER_STATUS_LABEL[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="字数（可选）">
                <Input
                  type="number"
                  min={0}
                  value={selected.wordCount || ''}
                  onChange={(e) => updateChapter(selected.id, { wordCount: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>
            <Field label="涉及人物">
              <MultiPicker
                options={project.characters.map((c) => ({ id: c.id, label: c.name }))}
                value={selected.characterIds}
                onChange={(characterIds) => updateChapter(selected.id, { characterIds })}
                emptyText="请先创建人物"
              />
            </Field>
            <Field label="本章梗概">
              <Textarea
                rows={14}
                value={selected.synopsis}
                onChange={(e) => updateChapter(selected.id, { synopsis: e.target.value })}
                placeholder="本章发生了什么、推动了哪些冲突、埋下或回收了哪些伏笔……"
              />
            </Field>
          </div>
        ) : (
          <EmptyState
            icon="📖"
            title="选择一个章节开始编辑"
            description="左侧以“卷 → 章”组织大纲，可记录每章梗概、涉及人物和写作状态。"
            action={
              project.volumes.length === 0 ? (
                <button className="btn btn-primary" onClick={addVolume}>
                  + 新建第一卷
                </button>
              ) : undefined
            }
          />
        )}
      </section>
    </div>
  );
}
