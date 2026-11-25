import type { ReactNode } from 'react';

/** 左侧列表 + 右侧详情的通用布局，人物 / 世界观 / 势力 等模块共用。 */
export function ListDetailLayout({
  list,
  detail,
}: {
  list: ReactNode;
  detail: ReactNode;
}) {
  return (
    <div className="list-detail">
      <aside className="list-pane">{list}</aside>
      <section className="detail-pane">{detail}</section>
    </div>
  );
}

export function ListToolbar({
  query,
  onQuery,
  onAdd,
  addLabel = '新建',
  children,
}: {
  query: string;
  onQuery: (q: string) => void;
  onAdd: () => void;
  addLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="list-toolbar">
      <input
        className="input"
        placeholder="筛选…"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
      <button className="btn btn-primary" onClick={onAdd}>
        + {addLabel}
      </button>
      {children}
    </div>
  );
}

export function ListItem({
  active,
  onClick,
  title,
  subtitle,
  leading,
  trailing,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <button className={`list-item${active ? ' is-active' : ''}`} onClick={onClick}>
      {leading}
      <span className="list-item-text">
        <span className="list-item-title">{title || '（未命名）'}</span>
        {subtitle && <span className="list-item-subtitle">{subtitle}</span>}
      </span>
      {trailing}
    </button>
  );
}

export function DetailHeader({
  title,
  onDelete,
  children,
}: {
  title: ReactNode;
  onDelete?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="detail-header">
      <div className="detail-title">{title}</div>
      <div className="detail-actions">
        {children}
        {onDelete && (
          <button className="btn btn-danger-ghost" onClick={onDelete}>
            删除
          </button>
        )}
      </div>
    </div>
  );
}
