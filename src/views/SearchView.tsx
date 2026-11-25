import { useMemo, useState } from 'react';
import { useCurrentProject } from '../store';
import { includesQuery } from '../lib/utils';
import type { ModuleKey } from '../navigation';
import { MODULES } from '../navigation';

interface Hit {
  module: ModuleKey;
  id: string;
  title: string;
  snippet: string;
  matchedField: string;
}

const SNIPPET_LEN = 80;

function snippetOf(text: string, q: string): string {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text.slice(0, SNIPPET_LEN);
  const start = Math.max(0, i - 30);
  return (start > 0 ? '…' : '') + text.slice(start, start + SNIPPET_LEN) + (start + SNIPPET_LEN < text.length ? '…' : '');
}

export function SearchView({ onNavigate }: { onNavigate: (module: ModuleKey, id: string) => void }) {
  const project = useCurrentProject();
  const [q, setQ] = useState('');

  const hits = useMemo<Hit[]>(() => {
    const query = q.trim();
    if (!query) return [];
    const out: Hit[] = [];
    const check = (module: ModuleKey, id: string, title: string, fields: Record<string, string | string[] | undefined>) => {
      for (const [field, value] of Object.entries(fields)) {
        const text = Array.isArray(value) ? value.join('、') : value;
        if (includesQuery(text, query)) {
          out.push({ module, id, title, snippet: snippetOf(text!, query), matchedField: field });
          return;
        }
      }
    };
    project.characters.forEach((c) =>
      check('characters', c.id, c.name, {
        姓名: c.name,
        别名: c.aliases,
        标签: c.tags,
        外貌: c.appearance,
        性格: c.personality,
        背景: c.background,
        备注: c.notes,
      }),
    );
    project.worldEntries.forEach((w) =>
      check('world', w.id, w.name, { 名称: w.name, 概述: w.summary, 详细设定: w.content, 标签: w.tags }),
    );
    project.factions.forEach((f) =>
      check('factions', f.id, f.name, { 名称: f.name, 类型: f.type, 简介: f.description, 目标: f.goals }),
    );
    project.events.forEach((e) =>
      check('timeline', e.id, e.title, { 标题: e.title, 时间点: e.time, 描述: e.description }),
    );
    project.chapters.forEach((ch) => check('outline', ch.id, ch.title, { 标题: ch.title, 梗概: ch.synopsis }));
    return out;
  }, [project, q]);

  const grouped = useMemo(() => {
    const m = new Map<ModuleKey, Hit[]>();
    hits.forEach((h) => m.set(h.module, [...(m.get(h.module) ?? []), h]));
    return m;
  }, [hits]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>全局搜索</h1>
          <p className="muted">在当前作品的人物、世界观、势力、时间线与大纲中查找。</p>
        </div>
      </div>
      <input
        autoFocus
        className="input search-input"
        placeholder="输入关键字，例如人物名、地名、伏笔…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {q.trim() && hits.length === 0 && <p className="muted pad">没有找到「{q}」相关内容。</p>}
      {[...grouped.entries()].map(([module, list]) => {
        const meta = MODULES.find((m) => m.key === module)!;
        return (
          <section key={module} className="search-group">
            <h3>
              {meta.icon} {meta.label} <span className="count">{list.length}</span>
            </h3>
            {list.map((h) => (
              <button key={h.id} className="search-hit" onClick={() => onNavigate(h.module, h.id)}>
                <span className="search-hit-title">{h.title || '（未命名）'}</span>
                <span className="search-hit-snippet">
                  <span className="badge">{h.matchedField}</span> {h.snippet}
                </span>
              </button>
            ))}
          </section>
        );
      })}
    </div>
  );
}
