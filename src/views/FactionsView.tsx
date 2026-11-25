import { useMemo, useState } from 'react';
import { useCurrentProject, useStore } from '../store';
import { DetailHeader, ListDetailLayout, ListItem, ListToolbar } from '../components/ListDetailLayout';
import { EmptyState, Field, Input, MultiPicker, Select, Textarea, confirmDelete } from '../components/ui';
import { createFaction } from '../lib/factories';
import { includesQuery } from '../lib/utils';
import type { Faction } from '../types';

const FACTION_RELATIONS = ['同盟', '附庸', '中立', '竞争', '敌对', '战争'];

export function FactionsView({ initialId }: { initialId?: string | null }) {
  const project = useCurrentProject();
  const { updateCurrent } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? project.factions[0]?.id ?? null);
  const [query, setQuery] = useState('');

  const list = useMemo(
    () => project.factions.filter((f) => !query || includesQuery(f.name, query) || includesQuery(f.type, query)),
    [project.factions, query],
  );
  const selected = project.factions.find((f) => f.id === selectedId) ?? null;
  const charOptions = project.characters.map((c) => ({ id: c.id, label: c.name }));

  const add = () => {
    const f = createFaction();
    updateCurrent((p) => ({ factions: [...p.factions, f] }));
    setSelectedId(f.id);
  };
  const update = (id: string, patch: Partial<Faction>) =>
    updateCurrent((p) => ({
      factions: p.factions.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      // 成员变动时同步人物卡上的“所属势力”
      characters:
        patch.memberIds === undefined
          ? p.characters
          : p.characters.map((c) => {
              const member = patch.memberIds!.includes(c.id);
              const has = c.factionIds.includes(id);
              if (member === has) return c;
              return { ...c, factionIds: member ? [...c.factionIds, id] : c.factionIds.filter((x) => x !== id) };
            }),
    }));
  const remove = (f: Faction) => {
    if (!confirmDelete(f.name)) return;
    updateCurrent((p) => ({
      factions: p.factions.filter((x) => x.id !== f.id).map((x) => ({ ...x, relations: x.relations.filter((r) => r.targetId !== f.id) })),
      characters: p.characters.map((c) => ({ ...c, factionIds: c.factionIds.filter((id) => id !== f.id) })),
    }));
    if (selectedId === f.id) setSelectedId(null);
  };

  return (
    <ListDetailLayout
      list={
        <>
          <ListToolbar query={query} onQuery={setQuery} onAdd={add} addLabel="势力" />
          <div className="list-scroll">
            {list.length === 0 && <p className="muted pad">暂无势力</p>}
            {list.map((f) => (
              <ListItem
                key={f.id}
                active={f.id === selectedId}
                onClick={() => setSelectedId(f.id)}
                title={f.name}
                subtitle={[f.type, `${f.memberIds.length} 名成员`].filter(Boolean).join(' · ')}
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
                  placeholder="势力名称"
                />
              }
              onDelete={() => remove(selected)}
            />
            <div className="form-grid">
              <Field label="类型">
                <Input
                  value={selected.type}
                  onChange={(e) => update(selected.id, { type: e.target.value })}
                  placeholder="国家、宗门、公司、家族、教会…"
                />
              </Field>
              <Field label="领袖">
                <Select
                  value={selected.leaderId ?? ''}
                  onChange={(e) => update(selected.id, { leaderId: e.target.value || null })}
                >
                  <option value="">（无）</option>
                  {project.characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="成员">
              <MultiPicker
                options={charOptions}
                value={selected.memberIds}
                onChange={(memberIds) => update(selected.id, { memberIds })}
                emptyText="请先创建人物"
              />
            </Field>
            <Field label="简介">
              <Textarea rows={5} value={selected.description} onChange={(e) => update(selected.id, { description: e.target.value })} />
            </Field>
            <Field label="目标 / 诉求">
              <Textarea rows={3} value={selected.goals} onChange={(e) => update(selected.id, { goals: e.target.value })} />
            </Field>

            <section className="subsection">
              <div className="subsection-header">
                <h4>势力关系</h4>
                <button
                  className="btn btn-sm"
                  disabled={project.factions.length < 2}
                  onClick={() => {
                    const other = project.factions.find((f) => f.id !== selected.id)!;
                    update(selected.id, { relations: [...selected.relations, { targetId: other.id, type: '中立' }] });
                  }}
                >
                  + 添加关系
                </button>
              </div>
              {selected.relations.map((r, i) => (
                <div key={i} className="relation-row relation-row-2">
                  <Select
                    value={r.targetId}
                    onChange={(e) =>
                      update(selected.id, {
                        relations: selected.relations.map((x, j) => (j === i ? { ...x, targetId: e.target.value } : x)),
                      })
                    }
                  >
                    {project.factions
                      .filter((f) => f.id !== selected.id)
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                  </Select>
                  <Input
                    list="faction-relations"
                    value={r.type}
                    onChange={(e) =>
                      update(selected.id, {
                        relations: selected.relations.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)),
                      })
                    }
                  />
                  <button
                    className="icon-btn"
                    aria-label="删除"
                    onClick={() => update(selected.id, { relations: selected.relations.filter((_, j) => j !== i) })}
                  >
                    ×
                  </button>
                </div>
              ))}
              <datalist id="faction-relations">
                {FACTION_RELATIONS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </section>
          </div>
        ) : (
          <EmptyState
            icon="🏰"
            title="选择或新建一个势力"
            description="记录国家、宗门、组织的类型、领袖、成员、目标与相互关系。"
            action={
              <button className="btn btn-primary" onClick={add}>
                + 新建势力
              </button>
            }
          />
        )
      }
    />
  );
}
