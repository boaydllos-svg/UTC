import tempfile
import unittest
from pathlib import Path

from diary import add_entry, delete_entry, find_entry, list_entries


class DiaryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "entries.json"

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_add_and_list_entries(self) -> None:
        first = add_entry("第一天", "今天学了 Python。", self.db_path)
        second = add_entry("第二天", "继续写代码。", self.db_path)

        entries = list_entries(self.db_path)
        self.assertEqual([entry.id for entry in entries], [first.id, second.id])
        self.assertEqual(entries[0].title, "第一天")
        self.assertEqual(entries[1].content, "继续写代码。")

    def test_find_entry(self) -> None:
        created = add_entry("", "无标题内容", self.db_path)

        found = find_entry(created.id, self.db_path)
        self.assertIsNotNone(found)
        assert found is not None
        self.assertEqual(found.title, "无标题")

    def test_delete_entry(self) -> None:
        created = add_entry("要删除", "测试删除", self.db_path)

        ok = delete_entry(created.id, self.db_path)
        self.assertTrue(ok)
        self.assertIsNone(find_entry(created.id, self.db_path))
        self.assertFalse(delete_entry(999, self.db_path))


if __name__ == "__main__":
    unittest.main()
