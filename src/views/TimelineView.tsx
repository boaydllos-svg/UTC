import { useState } from 'react';
import { useCurrentProject, useStore } from '../store';
import { EmptyState, Field, Input, Modal, MultiPicker, Select, Textarea, confirmDelete } from '../components/ui';
import { createEvent } from '../lib/factories';
import { includesQuery } from '../lib/utils';
import { IMPORTANCE_LABEL, type Importance, type TimelineEvent } from '../types';

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function TimelineView({ initialId }: { initialId?: string | null }) {
  const project = useCurrentProject();
  const { updateCurrent } = useStore();
  const [editingId, setEditingId] = useState<string | null>(initialId ?? null);
  const [query, setQuery] = useState('');
  const [filterChar, setFilterChar] = useState('');

  const events = project.events.filter(
    (e) =>
      (!query || includesQuery(e.title, query) || includesQuery(e.time, query) || includesQuery(e.description, query)) &&
      (!filterChar || e.characterIds.includes(filterChar)),
  );
  const editing = project.events.find((e) => e.id === editingId) ?? null;
  const nameOf = (id: string) => project.characters.find((c) => c.id === id)?.name;
  const placeOf = (id: string) => project.worldEntries.find((w) => w.id === id)?.name;

  const add = () => {
    const e = createEvent();
    updateCurrent((p) => ({ events: [...p.events, e] }));
    setEditingId(e.id);
  };
  const update = (id: string, patch: Partial<TimelineEvent>) =>
    updateCurrent((p) => ({ events: p.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const remove = (e: TimelineEvent) => {
    if (!confirmDelete(e.title)) return;
    updateCurrent((p) => ({ events: p.events.filter((x) => x.id !== e.id) }));
    setEditingId(null);
  };
  const reorder = (id: string, dir: -1 | 1) =>
    updateCurrent((p) => {
      const i = p.events.findIndex((e) => e.id === id);
      return { events: move(p.events, i, i + dir) };
    });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>时间线</h1>
          <p className="muted">按剧情先后顺序排列事件；“时间点”可以是任意文字（如“开国三年春”）。</p>
        </div>
        <div className="page-actions">
          <input className="input" placeholder="搜索事件…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select value={filterChar} onChange={(e) => setFilterChar(e.target.value)}>
            <option value="">全部人物</option>
            {project.characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <button className="btn btn-primary" onClick={add}>
            + 新建事件
          </button>
        </div>
      </div>

      {project.events.length === 0 ? (
        <EmptyState
          icon="🕰️"
          title="还没有事件"
          description="把关键事件按顺序放进时间线，并关联参与人物与发生地点。"
          action={
            <button className="btn btn-primary" onClick={add}>
              + 新建事件
            </button>
          }
        />
      ) : (
        <ol className="timeline">
          {events.map((e) => {
            const idx = project.events.indexOf(e);
            return (
              <li key={e.id} className={`timeline-item importance-${e.importance}`}>
                <div className="timeline-dot" />
                <div className="timeline-card" onClick={() => setEditingId(e.id)}>
                  <div className="timeline-card-head">
                    <span className="timeline-time">{e.time || '未设定时间'}</span>
                    <span className={`badge badge-${e.importance}`}>{IMPORTANCE_LABEL[e.importance]}</span>
                    <span className="spacer" />
                    <div className="card-actions" onClick={(ev) => ev.stopPropagation()}>
                      <button className="icon-btn" disabled={idx === 0 || !!query || !!filterChar} onClick={() => reorder(e.id, -1)} title="上移">
                        ↑
                      </button>
                      <button
                        className="icon-btn"
                        disabled={idx === project.events.length - 1 || !!query || !!filterChar}
                        onClick={() => reorder(e.id, 1)}
                        title="下移"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                  <h3>{e.title || '（未命名事件）'}</h3>
                  {e.description && <p className="clamp-3">{e.description}</p>}
                  <div className="chip-row">
                    {e.characterIds.map((id) => (
                      <span key={id} className="chip">
                        🧑 {nameOf(id) ?? '（已删除）'}
                      </span>
                    ))}
                    {e.locationIds.map((id) => (
                      <span key={id} className="chip">
                        📍 {placeOf(id) ?? '（已删除）'}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
          {events.length === 0 && <p className="muted pad">没有符合筛选条件的事件</p>}
        </ol>
      )}

      {editing && (
        <Modal title="编辑事件" onClose={() => setEditingId(null)} width={640}
          footer={
            <>
              <button className="btn btn-danger-ghost" onClick={() => remove(editing)}>
                删除
              </button>
              <span className="spacer" />
              <button className="btn btn-primary" onClick={() => setEditingId(null)}>
                完成
              </button>
            </>
          }
        >
          <Field label="事件标题">
            <Input autoFocus value={editing.title} onChange={(e) => update(editing.id, { title: e.target.value })} />
          </Field>
          <div className="form-grid">
            <Field label="时间点">
              <Input value={editing.time} placeholder="如：第三纪 1024 年 / 故事开始前十年" onChange={(e) => update(editing.id, { time: e.target.value })} />
            </Field>
            <Field label="重要程度">
              <Select value={editing.importance} onChange={(e) => update(editing.id, { importance: e.target.value as Importance })}>
                {(Object.keys(IMPORTANCE_LABEL) as Importance[]).map((k) => (
                  <option key={k} value={k}>
                    {IMPORTANCE_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="关联人物">
            <MultiPicker
              options={project.characters.map((c) => ({ id: c.id, label: c.name }))}
              value={editing.characterIds}
              onChange={(characterIds) => update(editing.id, { characterIds })}
              emptyText="请先创建人物"
            />
          </Field>
          <Field label="关联地点 / 设定">
            <MultiPicker
              options={project.worldEntries.map((w) => ({
                id: w.id,
                label: w.name,
                group: project.worldCategories.find((c) => c.id === w.categoryId)?.name,
              }))}
              value={editing.locationIds}
              onChange={(locationIds) => update(editing.id, { locationIds })}
              emptyText="请先在世界观中创建词条"
            />
          </Field>
          <Field label="事件描述">
            <Textarea rows={6} value={editing.description} onChange={(e) => update(editing.id, { description: e.target.value })} />
          </Field>
        </Modal>
      )}
    </div>
  );
}
