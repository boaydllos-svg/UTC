import { useCallback, useMemo, useState } from 'react';
import { useCurrentProject, useStore } from '../store';
import {
  DetailHeader,
  ListDetailLayout,
  ListItem,
  ListToolbar,
} from '../components/ListDetailLayout';
import {
  EmptyState,
  Field,
  Input,
  MultiPicker,
  Select,
  TagInput,
  Textarea,
  confirmDelete,
} from '../components/ui';
import { createCharacter } from '../lib/factories';
import { includesQuery, readFileAsDataURL, shrinkImage } from '../lib/utils';
import type { Character, CharacterRelation } from '../types';

export function CharactersView({ initialId }: { initialId?: string | null }) {
  const project = useCurrentProject();
  const { updateCurrent } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? project.characters[0]?.id ?? null);
  const [query, setQuery] = useState('');

  const list = useMemo(
    () =>
      project.characters.filter(
        (c) =>
          !query ||
          includesQuery(c.name, query) ||
          c.aliases.some((a) => includesQuery(a, query)) ||
          c.tags.some((t) => includesQuery(t, query)),
      ),
    [project.characters, query],
  );
  const selected = project.characters.find((c) => c.id === selectedId) ?? null;

  const add = () => {
    const c = createCharacter();
    updateCurrent((p) => ({ characters: [...p.characters, c] }));
    setSelectedId(c.id);
  };

  const update = useCallback(
    (id: string, patch: Partial<Character>) =>
      updateCurrent((p) => ({
        characters: p.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        // 所属势力变动时同步势力页的成员列表
        factions:
          patch.factionIds === undefined
            ? p.factions
            : p.factions.map((f) => {
                const belongs = patch.factionIds!.includes(f.id);
                const has = f.memberIds.includes(id);
                if (belongs === has) return f;
                return { ...f, memberIds: belongs ? [...f.memberIds, id] : f.memberIds.filter((m) => m !== id) };
              }),
      })),
    [updateCurrent],
  );

  const remove = (c: Character) => {
    if (!confirmDelete(c.name)) return;
    updateCurrent((p) => ({
      characters: p.characters
        .filter((x) => x.id !== c.id)
        .map((x) => ({ ...x, relations: x.relations.filter((r) => r.targetId !== c.id) })),
      factions: p.factions.map((f) => ({
        ...f,
        memberIds: f.memberIds.filter((id) => id !== c.id),
        leaderId: f.leaderId === c.id ? null : f.leaderId,
      })),
      events: p.events.map((e) => ({ ...e, characterIds: e.characterIds.filter((id) => id !== c.id) })),
      chapters: p.chapters.map((ch) => ({ ...ch, characterIds: ch.characterIds.filter((id) => id !== c.id) })),
    }));
    if (selectedId === c.id) setSelectedId(null);
  };

  return (
    <ListDetailLayout
      list={
        <>
          <ListToolbar query={query} onQuery={setQuery} onAdd={add} addLabel="人物" />
          <div className="list-scroll">
            {list.length === 0 && <p className="muted pad">暂无人物</p>}
            {list.map((c) => (
              <ListItem
                key={c.id}
                active={c.id === selectedId}
                onClick={() => setSelectedId(c.id)}
                leading={<Avatar character={c} size={36} />}
                title={c.name}
                subtitle={[c.gender, c.age && `${c.age}岁`, ...c.aliases.slice(0, 2)].filter(Boolean).join(' · ')}
              />
            ))}
          </div>
        </>
      }
      detail={
        selected ? (
          <CharacterEditor
            key={selected.id}
            character={selected}
            onChange={(patch) => update(selected.id, patch)}
            onDelete={() => remove(selected)}
          />
        ) : (
          <EmptyState
            icon="🧑"
            title="选择或新建一个人物"
            description="人物卡用于记录姓名、别名、外貌、性格、背景以及与其他人物的关系。"
            action={
              <button className="btn btn-primary" onClick={add}>
                + 新建人物
              </button>
            }
          />
        )
      }
    />
  );
}

export function Avatar({ character, size = 40 }: { character: Character; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.42 };
  return character.avatar ? (
    <img className="avatar" src={character.avatar} alt={character.name} style={style} />
  ) : (
    <span className="avatar avatar-fallback" style={style}>
      {character.name.trim().slice(0, 1) || '?'}
    </span>
  );
}

const RELATION_PRESETS = ['父母', '子女', '兄弟姐妹', '配偶', '恋人', '挚友', '师徒', '同僚', '宿敌', '仇人', '上下级'];

function CharacterEditor({
  character: c,
  onChange,
  onDelete,
}: {
  character: Character;
  onChange: (patch: Partial<Character>) => void;
  onDelete: () => void;
}) {
  const project = useCurrentProject();
  const others = project.characters.filter((x) => x.id !== c.id);
  const factionOptions = project.factions.map((f) => ({ id: f.id, label: f.name }));

  const setRelation = (idx: number, patch: Partial<CharacterRelation>) =>
    onChange({ relations: c.relations.map((r, i) => (i === idx ? { ...r, ...patch } : r)) });

  const handleAvatar = async (file: File) => {
    const raw = await readFileAsDataURL(file);
    onChange({ avatar: await shrinkImage(raw) });
  };

  return (
    <div className="editor">
      <DetailHeader
        title={
          <div className="editor-hero">
            <label className="avatar-upload" title="点击上传头像">
              <Avatar character={c} size={72} />
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleAvatar(f);
                  e.target.value = '';
                }}
              />
            </label>
            <div className="editor-hero-text">
              <input
                className="title-input"
                value={c.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="人物姓名"
              />
              {c.avatar && (
                <button className="link-btn" onClick={() => onChange({ avatar: undefined })}>
                  移除头像
                </button>
              )}
            </div>
          </div>
        }
        onDelete={onDelete}
      />

      <div className="form-grid">
        <Field label="别名 / 称号">
          <TagInput value={c.aliases} onChange={(aliases) => onChange({ aliases })} placeholder="回车添加别名" />
        </Field>
        <Field label="标签">
          <TagInput value={c.tags} onChange={(tags) => onChange({ tags })} placeholder="主角、反派、配角…" />
        </Field>
        <Field label="年龄">
          <Input value={c.age} onChange={(e) => onChange({ age: e.target.value })} placeholder="如 24 或 “三十出头”" />
        </Field>
        <Field label="性别">
          <Input list="gender-list" value={c.gender} onChange={(e) => onChange({ gender: e.target.value })} />
          <datalist id="gender-list">
            <option value="男" />
            <option value="女" />
            <option value="其他" />
          </datalist>
        </Field>
        <Field label="所属势力">
          <MultiPicker
            options={factionOptions}
            value={c.factionIds}
            onChange={(factionIds) => onChange({ factionIds })}
            emptyText="请先在“势力”模块中创建"
          />
        </Field>
      </div>

      <Field label="外貌">
        <Textarea rows={3} value={c.appearance} onChange={(e) => onChange({ appearance: e.target.value })} />
      </Field>
      <Field label="性格">
        <Textarea rows={3} value={c.personality} onChange={(e) => onChange({ personality: e.target.value })} />
      </Field>
      <Field label="背景 / 经历">
        <Textarea rows={6} value={c.background} onChange={(e) => onChange({ background: e.target.value })} />
      </Field>

      <section className="subsection">
        <div className="subsection-header">
          <h4>人物关系</h4>
          <button
            className="btn btn-sm"
            disabled={!others.length}
            onClick={() =>
              onChange({ relations: [...c.relations, { targetId: others[0].id, type: '', note: '' }] })
            }
          >
            + 添加关系
          </button>
        </div>
        {!others.length && <p className="muted">至少需要两位人物才能建立关系。</p>}
        {c.relations.map((r, i) => (
          <div key={i} className="relation-row">
            <Select value={r.targetId} onChange={(e) => setRelation(i, { targetId: e.target.value })}>
              {others.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
            <Input
              list="relation-presets"
              value={r.type}
              placeholder="关系类型"
              onChange={(e) => setRelation(i, { type: e.target.value })}
            />
            <Input value={r.note} placeholder="备注" onChange={(e) => setRelation(i, { note: e.target.value })} />
            <button
              className="icon-btn"
              aria-label="删除关系"
              onClick={() => onChange({ relations: c.relations.filter((_, j) => j !== i) })}
            >
              ×
            </button>
          </div>
        ))}
        <datalist id="relation-presets">
          {RELATION_PRESETS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <IncomingRelations characterId={c.id} />
      </section>

      <Field label="备注">
        <Textarea rows={3} value={c.notes} onChange={(e) => onChange({ notes: e.target.value })} />
      </Field>
    </div>
  );
}

function IncomingRelations({ characterId }: { characterId: string }) {
  const project = useCurrentProject();
  const incoming = project.characters.flatMap((o) =>
    o.relations.filter((r) => r.targetId === characterId).map((r) => ({ from: o, r })),
  );
  if (!incoming.length) return null;
  return (
    <div className="incoming">
      <small className="muted">其他人物对此人的关系：</small>
      <ul>
        {incoming.map(({ from, r }, i) => (
          <li key={i}>
            <strong>{from.name}</strong> → {r.type || '未命名关系'}
            {r.note && <span className="muted">（{r.note}）</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
