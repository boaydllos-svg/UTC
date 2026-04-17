#!/usr/bin/env python3
"""Simple CLI diary app with JSON persistence."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import List, Optional


DEFAULT_DB_PATH = Path.home() / ".simple_diary" / "entries.json"


@dataclass
class Entry:
    id: int
    title: str
    content: str
    created_at: str


def ensure_db_file(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    if not db_path.exists():
        db_path.write_text("[]", encoding="utf-8")


def load_entries(db_path: Path) -> List[Entry]:
    ensure_db_file(db_path)
    raw = json.loads(db_path.read_text(encoding="utf-8"))
    return [Entry(**item) for item in raw]


def save_entries(entries: List[Entry], db_path: Path) -> None:
    ensure_db_file(db_path)
    serialized = [asdict(entry) for entry in entries]
    db_path.write_text(
        json.dumps(serialized, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def get_next_id(entries: List[Entry]) -> int:
    return max((entry.id for entry in entries), default=0) + 1


def add_entry(title: str, content: str, db_path: Path) -> Entry:
    entries = load_entries(db_path)
    entry = Entry(
        id=get_next_id(entries),
        title=title.strip() or "无标题",
        content=content.strip(),
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    )
    entries.append(entry)
    save_entries(entries, db_path)
    return entry


def list_entries(db_path: Path) -> List[Entry]:
    return sorted(load_entries(db_path), key=lambda item: item.id)


def find_entry(entry_id: int, db_path: Path) -> Optional[Entry]:
    entries = load_entries(db_path)
    for entry in entries:
        if entry.id == entry_id:
            return entry
    return None


def delete_entry(entry_id: int, db_path: Path) -> bool:
    entries = load_entries(db_path)
    remain = [entry for entry in entries if entry.id != entry_id]
    if len(remain) == len(entries):
        return False
    save_entries(remain, db_path)
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="一个简单的命令行日记软件")
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB_PATH,
        help=f"数据文件路径（默认: {DEFAULT_DB_PATH}）",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    add_parser = subparsers.add_parser("add", help="新增一条日记")
    add_parser.add_argument("--title", default="", help="日记标题")
    add_parser.add_argument("content", nargs="+", help="日记内容")

    subparsers.add_parser("list", help="查看所有日记")

    view_parser = subparsers.add_parser("view", help="查看指定日记详情")
    view_parser.add_argument("id", type=int, help="日记 ID")

    delete_parser = subparsers.add_parser("delete", help="删除指定日记")
    delete_parser.add_argument("id", type=int, help="日记 ID")

    return parser.parse_args()


def cmd_add(args: argparse.Namespace) -> int:
    content = " ".join(args.content).strip()
    if not content:
        print("内容不能为空。")
        return 1
    entry = add_entry(args.title, content, args.db)
    print(f"已保存日记 #{entry.id}。")
    return 0


def cmd_list(args: argparse.Namespace) -> int:
    entries = list_entries(args.db)
    if not entries:
        print("还没有日记，先写一条吧。")
        return 0
    for entry in entries:
        print(f"[{entry.id}] {entry.created_at} | {entry.title}")
    return 0


def cmd_view(args: argparse.Namespace) -> int:
    entry = find_entry(args.id, args.db)
    if entry is None:
        print(f"未找到 ID 为 {args.id} 的日记。")
        return 1
    print(f"ID: {entry.id}")
    print(f"时间: {entry.created_at}")
    print(f"标题: {entry.title}")
    print("内容:")
    print(entry.content)
    return 0


def cmd_delete(args: argparse.Namespace) -> int:
    ok = delete_entry(args.id, args.db)
    if not ok:
        print(f"未找到 ID 为 {args.id} 的日记。")
        return 1
    print(f"已删除日记 #{args.id}。")
    return 0


def main() -> int:
    args = parse_args()
    if args.command == "add":
        return cmd_add(args)
    if args.command == "list":
        return cmd_list(args)
    if args.command == "view":
        return cmd_view(args)
    if args.command == "delete":
        return cmd_delete(args)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
