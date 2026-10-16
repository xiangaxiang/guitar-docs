#!/usr/bin/env python3
"""刷新帮助发布清单；在提交前运行。App 固定的两个 HTML 文件名不要修改。"""
from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parent.parent
files=[r/n for n in ('index.html','connection-guide.html','usage-guide.html')]
files += [p for d in ('legacy','print') for p in (r/d).rglob('*') if p.is_file()]
for name,title in [('connection-guide.html','D15吉他 连接说明'),('usage-guide.html','D15吉他 使用说明')]:
 assert '<title>'+title+'</title>' in (r/name).read_text(),name
(r/'help-files.json').write_text(json.dumps({str(p.relative_to(r)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)},indent=2)+'\n')
print('Ready:',len(files),'public help files')
