import {
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

/* ---------- 表单元素 ---------- */

export function Field({
  label,
  hint,
  children,
  inline,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  inline?: boolean;
}) {
  // 用 div 而非 label：子元素可能是含多个 checkbox 的选择器，label 的点击转发会误触第一个选项
  return (
    <div className={`field${inline ? ' field-inline' : ''}`}>
      <span className="field-label">
        {label}
        {hint && <small className="field-hint">{hint}</small>}
      </span>
      {children}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className ?? ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`input textarea ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`input select ${props.className ?? ''}`} />;
}

/* ---------- 标签输入 ---------- */

export function TagInput({
  value,
  onChange,
  placeholder = '输入后按回车添加',
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const commit = () => {
    const t = draft.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft('');
  };
  return (
    <div className="tag-input">
      {value.map((t) => (
        <span key={t} className="chip">
          {t}
          <button
            type="button"
            className="chip-remove"
            aria-label={`移除 ${t}`}
            onClick={() => onChange(value.filter((x) => x !== t))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="tag-input-field"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
      />
    </div>
  );
}

/* ---------- 多选实体选择器 ---------- */

export interface Option {
  id: string;
  label: string;
  group?: string;
}

export function MultiPicker({
  options,
  value,
  onChange,
  placeholder = '点击选择…',
  emptyText = '暂无可选项',
}: {
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const byId = new Map(options.map((o) => [o.id, o]));
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="picker" ref={ref}>
      <div className="picker-control" onClick={() => setOpen((v) => !v)}>
        {value.length === 0 && <span className="picker-placeholder">{placeholder}</span>}
        {value.map((id) => (
          <span key={id} className="chip chip-accent">
            {byId.get(id)?.label ?? '（已删除）'}
            <button
              type="button"
              className="chip-remove"
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((x) => x !== id));
              }}
            >
              ×
            </button>
          </span>
        ))}
        <span className="picker-caret">▾</span>
      </div>
      {open && (
        <div className="picker-menu">
          <input
            autoFocus
            className="picker-search"
            placeholder="搜索…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="picker-list">
            {filtered.length === 0 && <div className="picker-empty">{emptyText}</div>}
            {filtered.map((o) => {
              const checked = value.includes(o.id);
              return (
                <label key={o.id} className={`picker-item${checked ? ' is-checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange(checked ? value.filter((x) => x !== o.id) : [...value, o.id])
                    }
                  />
                  <span>{o.label}</span>
                  {o.group && <small className="muted">{o.group}</small>}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 弹窗 ---------- */

export function Modal({
  title,
  onClose,
  children,
  footer,
  width,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        // 只在点击遮罩本身时关闭，不拦截冒泡，以免弹窗内的“点击外部收起”逻辑失效
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={width ? { width } : undefined} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- 空状态 ---------- */

export function EmptyState({
  icon = '📄',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {description && <p className="muted">{description}</p>}
      {action}
    </div>
  );
}

/* ---------- 确认删除 ---------- */

export function confirmDelete(name: string): boolean {
  return window.confirm(`确定删除「${name}」吗？此操作不可撤销。`);
}