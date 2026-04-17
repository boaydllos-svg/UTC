# 简单日记软件

这是一个基于 Python 的命令行日记工具，支持：

- 新增日记
- 查看日记列表
- 查看单条日记详情
- 删除日记

数据默认保存在 `~/.simple_diary/entries.json`，也可以通过 `--db` 参数指定自定义路径。

## 环境要求

- Python 3.9+

## 使用方式

以下命令都在仓库根目录执行：

```bash
python diary.py add --title "今天" 今天天气很好
python diary.py list
python diary.py view 1
python diary.py delete 1
```

如果希望把数据写入当前目录的测试文件：

```bash
python diary.py --db ./demo_entries.json add --title "测试" 这是一条测试日记
```

## 运行测试

```bash
python -m unittest discover -s tests
```
