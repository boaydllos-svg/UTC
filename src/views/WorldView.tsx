import { useMemo, useState } from 'react';
import { useCurrentProject, useStore } from '../store';
import { DetailHeader, ListDetailLayout, ListItem } from '../components/ListDetailLayout';
import { EmptyState, Field, Input, Modal, Select, TagInput, Textarea, confirmDelete } from '../components/ui';
import { createWorldEntry } from '../lib/factories';
import { includesQuery, uid } from '../lib/utils';
import type { WorldEntry } from '../types';

export function WorldView({ initialId }: { initialId?: string | null }) {
  const project = useCurrentProject();
  const { updateCurrent } = useStore();
  const initialEntry = project.worldEntries.find((e) => e.id === initialId);
  const [categoryId, setCategoryId] = useState<string>(initialEntry?.categoryId ?? 'all');
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? null);
  const [query, setQuery] = useState('');
  const [managing, setManaging] = useState(false);

  const entries = useMemo(
    () =>
      project.worldEntries.filter(
        (e) =>
          (categoryId === 'all' || e.categoryId === categoryId) &&
          (!query || includesQuery(e.name, query) || includesQuery(e.summary, query) || e.tags.some((t) => includesQuery(t, query))),
      ),
    [project.worldEntries, categoryId, query],
  );
  const selected = project.worldEntries.find((e) => e.id === selectedId) ?? null;
  const categoryName = (id: string) => project.worldCategories.find((c) => c.id === id)?.name ?? '未分类';

  const add = () => {
    const cat = categoryId !== 'all' ? categoryId : project.worldCategories[0]?.id;
    if (!cat) {
      setManaging(true);
      return;
    }
    const e = createWorldEntry(cat);
    updateCurrent((p) => ({ worldEntries: [...p.worldEntries, e] }));
    setSelectedId(e.id);
  };
  const update = (id: string, patch: Partial<WorldEntry>) =>
    updateCurrent((p) => ({ worldEntries: p.worldEntries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const remove = (e: WorldEntry) => {
    if (!confirmDelete(e.name)) return;
    updateCurrent((p) => ({
      worldEntries: p.worldEntries.filter((x) => x.id !== e.id),
      events: p.events.map((ev) => ({ ...ev, locationIds: ev.locationIds.filter((id) => id !== e.id) })),
    }));
    if (selectedId === e.id) setSelectedId(null);
  };

  return (
    <>
      <div className="category-bar">
        <button className={`pill${categoryId === 'all' ? ' is-active' : ''}`} onClick={() => setCategoryId('all')}>
          全部 <span className="count">{project.worldEntries.length}</span>
        </button>
        {project.worldCategories.map((c) => (
          <button
            key={c.id}
            className={`pill${categoryId === c.id ? ' is-active' : ''}`}
            onClick={() => setCategoryId(c.id)}
          >
            {c.name} <span className="count">{project.worldEntries.filter((e) => e.categoryId === c.id).length}</span>
          </button>
        ))}
        <button className="pill pill-ghost" onClick={() => setManaging(true)}>
          ⚙ 管理分类
        </button>
      </div>
      <ListDetailLayout
        list={
          <>
            <div className="list-toolbar">
              <input className="input" placeholder="筛选…" value={query} onChange={(e) => setQuery(e.target.value)} />
              <button className="btn btn-primary" onClick={add}>
                + 词条
              </button>
            </div>
            <div className="list-scroll">
              {entries.length === 0 && <p className="muted pad">暂无词条</p>}
              {entries.map((e) => (
                <ListItem
                  key={e.id}
                  active={e.id === selectedId}
                  onClick={() => setSelectedId(e.id)}
                  title={e.name}
                  subtitle={`${categoryName(e.categoryId)}${e.summary ? ' · ' + e.summary : ''}`}
                />
              ))}
            </div>
          </>
        }
        detail={
          selected ? (
            <div className="editor" key={selected.id}>
              <DetailHeader
                title={
                  <input
                    className="title-input"
                    value={selected.name}
                    onChange={(e) => update(selected.id, { name: e.target.value })}
                    placeholder="词条名称"
                  />
                }
                onDelete={() => remove(selected)}
              />
              <div className="form-grid">
                <Field label="分类">
                  <Select value={selected.categoryId} onChange={(e) => update(selected.id, { categoryId: e.target.value })}>
                    {project.worldCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="标签">
                  <TagInput value={selected.tags} onChange={(tags) => update(selected.id, { tags })} />
                </Field>
              </div>
              <Field label="一句话概述">
                <Input value={selected.summary} onChange={(e) => update(selected.id, { summary: e.target.value })} />
              </Field>
              <Field label="详细设定">
                <Textarea
                  rows={16}
                  value={selected.content}
                  onChange={(e) => update(selected.id, { content: e.target.value })}
                  placeholder="在这里展开描述：地理、历史、运作规则、限制与代价……"
                />
              </Field>
            </div>
          ) : (
            <EmptyState
              icon="🌍"
              title="选择或新建一个设定词条"
              description="按地点、物品、规则/体系等分类管理世界观，分类可自定义。"
              action={
                <button className="btn btn-primary" onClick={add}>
                  + 新建词条
                </button>
              }
            />
          )
        }
      />
      {managing && <CategoryManager onClose={() => setManaging(false)} />}
    </>
  );
}

function CategoryManager({ onClose }: { onClose: () => void }) {
  const project = useCurrentProject();
  const { updateCurrent } = useStore();
  const [name, setName] = useState('');

  const add = () => {
    const n = name.trim();
    if (!n || project.worldCategories.some((c) => c.name === n)) return;
    updateCurrent((p) => ({ worldCategories: [...p.worldCategories, { id: uid(), name: n }] }));
    setName('');
  };
  const rename = (id: string, n: string) =>
    updateCurrent((p) => ({ worldCategories: p.worldCategories.map((c) => (c.id === id ? { ...c, name: n } : c)) }));
  const remove = (id: string) => {
    const count = project.worldEntries.filter((e) => e.categoryId === id).length;
    if (count && !window.confirm(`该分类下有 ${count} 个词条，删除后它们将移动到第一个分类。继续？`)) return;
    updateCurrent((p) => {
      const rest = p.worldCategories.filter((c) => c.id !== id);
      const fallback = rest[0]?.id ?? '';
      return {
        worldCategories: rest,
        worldEntries: p.worldEntries.map((e) => (e.categoryId === id ? { ...e, categoryId: fallback } : e)),
      };
    });
  };

  return (
    <Modal title="管理设定分类" onClose={onClose}>
      <div className="category-list">
        {project.worldCategories.map((c) => (
          <div key={c.id} className="category-row">
            <Input value={c.name} onChange={(e) => rename(c.id, e.target.value)} />
            <button
              className="icon-btn"
              disabled={project.worldCategories.length <= 1}
              onClick={() => remove(c.id)}
              aria-label="删除分类"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="category-row">
        <Input
          value={name}
          placeholder="新分类名称，如：魔法体系、货币"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="btn btn-primary" onClick={add} disabled={!name.trim()}>
          添加
        </button>
      </div>
    </Modal>
  );
}
