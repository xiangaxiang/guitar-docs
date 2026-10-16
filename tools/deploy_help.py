#!/usr/bin/env python3
"""在现有 D15 服务器部署本仓库帮助页面。仅更新 /help/ 与首页帮助链接。"""
from pathlib import Path
import hashlib, json, shutil, subprocess, tempfile, datetime, os
source=Path(__file__).resolve().parent.parent
manifest=json.loads((source/'help-files.json').read_text())
for name,digest in manifest.items():
 assert hashlib.sha256((source/name).read_bytes()).hexdigest()==digest, name
root=Path('/var/www/d15-home')
configs=[Path('/etc/nginx/sites-available')/n for n in ('d15-home-https','d15-download-https')]
block='''    # D15 help: shared public guides, no App binary change.
    location = /help { return 301 /help/; }
    location ^~ /help/ {
        root /var/www/d15-home;
        index index.html;
        try_files $uri $uri/ =404;
        charset utf-8;
        add_header Cache-Control "no-cache";
    }

'''
updated={}
for p in configs:
 s=p.read_text()
 if 'location ^~ /help/' not in s:
  assert s.count('    location = / {')==1, str(p)
  s=s.replace('    location = / {',block+'    location = / {',1)
 updated[p]=s
home=root/'index.html';html=home.read_text()
old='https://xiangaxiang.github.io/guitar-docs/usage-guide.html'
assert old in html or 'https://d15cyber.com/help/' in html, 'Homepage changed: review help links first'
html=html.replace(old,'https://d15cyber.com/help/').replace('查看现有使用说明（V4.5）','查看使用说明').replace('使用说明（V4.5）','使用说明')
backup=Path('/root/d15-home-backups')/('help-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
backup.mkdir(parents=True)
for p in configs+[home]:shutil.copy2(p,backup/p.name)
stage=Path(tempfile.mkdtemp(prefix='.help-stage-',dir=root))
for name in manifest:
 dest=stage/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source/name,dest)
# The server's nginx worker must be able to traverse the new public directory.
os.chmod(stage,0o755)
for p in stage.rglob('*'):os.chmod(p,0o755 if p.is_dir() else 0o644)
had_help=(root/'help').exists();installed=False
try:
 for p,s in updated.items():p.write_text(s)
 subprocess.run(['nginx','-t'],check=True)
 if had_help:shutil.move(str(root/'help'),str(backup/'help'))
 stage.replace(root/'help');installed=True
 home.write_text(html)
 subprocess.run(['systemctl','reload','nginx'],check=True)
except Exception:
 for p in configs+[home]:shutil.copy2(backup/p.name,p)
 if installed:shutil.move(str(root/'help'),str(backup/'failed-help'))
 if (backup/'help').exists():shutil.move(str(backup/'help'),str(root/'help'))
 subprocess.run(['nginx','-t'],check=True);subprocess.run(['systemctl','reload','nginx'],check=True)
 raise
print('HELP_DEPLOY_OK',len(manifest),'files; backup:',backup)
