#!/usr/bin/env python3
"""发型目录交付校验：数量 / ID 唯一性 / 字段完整性 / 枚举合法性 / 提示词规范约束。只读校验，不修改数据。"""
import json
import sys
from collections import Counter

REQUIRED = {'id','genderFilter','nameZh','nameEn','category','length','texture','densityFit','bangs','silhouette','keyCutFeatures','maintenance','dailyStylingMinutes','realisticFor','notIdealFor','stylistInstruction','frontImagePrompt','leftImagePrompt','rightImagePrompt'}
LENGTHS = {'buzz','short','medium','long'}
TEXTURES = {'straight','wavy','curly','coily'}
DENSITIES = {'fine','medium','thick'}
BANGS = {'none','curtain','blunt','side','micro','textured'}
MAINT = {'low','medium','high'}
PROMPT_KW = ('preserve natural facial proportions','no beauty filter','no skin smoothing','realistic hair density','visible individual hair strands')

def check(path, expected_count, expected_gender):
    data = json.load(open(path, encoding='utf-8'))
    errors = []
    if len(data) != expected_count:
        errors.append(f'count={len(data)} expected={expected_count}')
    ids = [x['id'] for x in data]
    dup = sorted({i for i in ids if ids.count(i) > 1})
    if dup:
        errors.append(f'duplicate ids: {dup}')
    for x in data:
        eid = x.get('id', '<missing>')
        if set(x.keys()) != REQUIRED:
            errors.append(f'{eid}: field set mismatch')
            continue
        if x['genderFilter'] != expected_gender:
            errors.append(f'{eid}: genderFilter={x["genderFilter"]}')
        if x['length'] not in LENGTHS:
            errors.append(f'{eid}: length={x["length"]}')
        for t in x['texture']:
            if t not in TEXTURES:
                errors.append(f'{eid}: texture={t}')
        for d in x['densityFit']:
            if d not in DENSITIES:
                errors.append(f'{eid}: densityFit={d}')
        if x['bangs'] not in BANGS:
            errors.append(f'{eid}: bangs={x["bangs"]}')
        if x['maintenance'] not in MAINT:
            errors.append(f'{eid}: maintenance={x["maintenance"]}')
        for f in ('silhouette','nameZh','nameEn','stylistInstruction','frontImagePrompt','leftImagePrompt','rightImagePrompt','realisticFor','notIdealFor','dailyStylingMinutes'):
            if not isinstance(x[f], str) or not x[f].strip():
                errors.append(f'{eid}: empty field {f}')
        for f in ('texture','densityFit','keyCutFeatures'):
            if not isinstance(x[f], list) or not x[f]:
                errors.append(f'{eid}: empty list {f}')
        for f in ('frontImagePrompt','leftImagePrompt','rightImagePrompt'):
            p = x[f]
            for kw in PROMPT_KW:
                if kw not in p:
                    errors.append(f'{eid}: {f} missing "{kw}"')
    return data, errors

def main():
    all_data = []
    failed = False
    for path, n, g in (('women-50.json', 50, 'female'), ('men-50.json', 50, 'male')):
        data, errors = check(path, n, g)
        all_data.extend(data)
        ok = 'PASS' if not errors else 'FAIL'
        print(f'{ok}  {path}: entries={len(data)} unique_ids={len(set(x["id"] for x in data))} errors={len(errors)}')
        for e in errors:
            print('   -', e)
        failed = failed or bool(errors)
    ids = [x['id'] for x in all_data]
    if len(ids) != len(set(ids)):
        print('FAIL  cross-file duplicate ids')
        failed = True
    print(f'TOTAL entries = {len(all_data)} | expected 100 | unique ids = {len(set(ids))}')
    if not failed:
        print('ALL CHECKS PASSED')
    return 1 if failed else 0

if __name__ == '__main__':
    sys.exit(main())
