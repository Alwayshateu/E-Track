#!/usr/bin/env python3
"""Build a private, fail-closed CET trial snapshot from verified offline sources."""

import argparse
import hashlib
import importlib.util
import json
import re
import sqlite3
import subprocess
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

SETS = ('cet4-2024-06-set1', 'cet4-2024-06-set2',
        'cet6-2025-12-set1', 'cet6-2025-12-set2')
SET_COUNTS = dict(zip(SETS, (6, 6, 7, 7)))
OBJECTIVE = {'listening_choice', 'banked_cloze', 'paragraph_matching', 'reading_choice'}
UNIT_META = {'cetTask', 'sourcePaper', 'setNumber', 'options', 'allowOptionReuse', 'wordRange', 'groupId'}
QUESTION_META = {'cetTask', 'originalQuestionNumber', 'referenceAnswer', 'reviewChecklist', 'wordRange', 'groupId'}
HEX = re.compile(r'^[0-9a-f]{64}$')
MEDIA_ID = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
UTC_ISO = re.compile(r'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$')
MAX_SAFE_INTEGER = 9007199254740991
BLEED = re.compile(r'Questions?\s+\d+\s+to\s+\d+|�|\b(?:Directions|Answer Sheet)\s*:', re.I)


class SnapshotError(ValueError):
    """Missing evidence or an inconsistent, unsafe trial input."""


def require(condition, message):
    if not condition:
        raise SnapshotError(message)


def canonical_json(value):
    """Compact UTF-8 JSON with recursive ASCII-key ordering (no floats)."""
    def ordered(item):
        if isinstance(item, dict):
            require(all(isinstance(key, str) and key.isascii() for key in item),
                    'Canonical JSON requires ASCII keys')
            return {key: ordered(item[key]) for key in sorted(item)}
        if isinstance(item, list):
            return [ordered(entry) for entry in item]
        require(item is None or type(item) in (str, int, bool), 'Unsupported JSON value')
        if type(item) is int:
            require(abs(item) <= MAX_SAFE_INTEGER, 'JSON integer exceeds JavaScript safe range')
        return item
    return json.dumps(ordered(value), ensure_ascii=False, separators=(',', ':'), allow_nan=False)


def sha256(value):
    return hashlib.sha256(value).hexdigest()


def file_hash(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def utc_datetime(value):
    require(isinstance(value, str) and UTC_ISO.fullmatch(value), 'Expiry must be UTC ISO with Z')
    try:
        date = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError as error:
        raise SnapshotError('Invalid expiry timestamp') from error
    require(date > datetime.now(timezone.utc), 'Trial has expired')
    return date


def private_file(path, repository):
    require(isinstance(path, str) and Path(path).is_absolute(), 'Evidence path must be absolute')
    file = Path(path)
    require(file.is_file() and not file.is_symlink(), 'Evidence file is missing or symlinked')
    resolved = file.resolve(strict=True)
    require(not resolved.is_relative_to(repository), 'Evidence must remain outside repository')
    return resolved


def verified_document(record, status, repository):
    require(isinstance(record, dict) and record.get('status') == status, 'Missing formal evidence status')
    path = private_file(record.get('file'), repository)
    require(isinstance(record.get('sha256'), str) and HEX.fullmatch(record['sha256'])
            and file_hash(path) == record['sha256'], 'Evidence digest mismatch')
    return path


def verified_signed_review(evidence, repository, trusted_key, trusted_key_sha256):
    """The reviewer signs the entire manifest; a self-declared verified flag is insufficient."""
    require(isinstance(evidence, dict) and evidence.get('schemaVersion') == 1,
            'Evidence schema must be version 1')
    signature = private_file(evidence.get('reviewSignature'), repository)
    key = private_file(str(trusted_key), repository)
    require(signature != key, 'Review signature and trusted key must differ')
    require_hash(trusted_key_sha256, 'Trusted reviewer key digest')
    require(file_hash(key) == trusted_key_sha256, 'Untrusted reviewer key')
    payload = dict(evidence)
    payload.pop('reviewSignature')
    # No sensitive manifest text is printed or written to the repository.
    try:
        check = subprocess.run(
            ['openssl', 'dgst', '-sha256', '-verify', str(key), '-signature', str(signature)],
            input=canonical_json(payload).encode('utf-8'), capture_output=True, check=False)
    except OSError as error:
        raise SnapshotError('Review signature verification unavailable') from error
    require(check.returncode == 0, 'Independent review signature is invalid')
    return file_hash(key)


def load_exporter(path):
    spec = importlib.util.spec_from_file_location('cet_review_exporter', path)
    require(spec is not None and spec.loader is not None, 'Exporter unavailable')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def audit_only(units, questions):
    counts = Counter(set_key(unit) for unit in units)
    require(len(units) == 26 and len(questions) == 228 and counts == SET_COUNTS,
            'Four-set source is incomplete or contains extra material')
    return {'schemaVersion': 1, 'sets': list(SETS), 'unitCount': len(units),
            'questionCount': len(questions), 'setUnitCounts': dict(sorted(counts.items())),
            'blockedUnits': len(units), 'blockedQuestions': len(questions),
            'runnableSnapshotEmitted': False}


def require_hash(value, label):
    require(isinstance(value, str) and HEX.fullmatch(value), f'{label} must be lowercase SHA-256')


def text_hash(value):
    require(isinstance(value, str), 'Expected text')
    return sha256(value.encode('utf-8'))


def options_hash(value):
    return text_hash(canonical_json(value))


def set_key(unit):
    metadata = unit.get('metadata') or {}
    paper = metadata.get('sourcePaper')
    number = metadata.get('setNumber')
    require(isinstance(paper, str) and type(number) is int, 'Missing unit set identity')
    key = f'{paper}-set{number}'
    require(key in SETS, f'Unexpected CET set: {key}')
    return key


def checked_record(records, key, label):
    require(isinstance(records, dict) and key in records, f'Missing {label}: {key}')
    record = records[key]
    require(isinstance(record, dict), f'Malformed {label}: {key}')
    return record


def safe_metadata(metadata, allowed):
    require(isinstance(metadata, dict), 'Missing row metadata')
    return {key: metadata[key] for key in allowed if key in metadata}


def read_document(record, status, repository):
    path = verified_document(record, status, repository)
    try:
        document = json.loads(path.read_text(encoding='utf-8'))
    except (UnicodeError, ValueError) as error:
        raise SnapshotError('Verified evidence must be structured JSON') from error
    require(isinstance(document, dict), 'Verified evidence must be an object')
    return document


def check_authorization(evidence, repository):
    authorization = checked_record(evidence, 'authorization', 'authorization')
    document = read_document(authorization, 'verified', repository)
    for item in (authorization, document):
        require(isinstance(item.get('sets'), list) and set(item['sets']) == set(SETS)
                and len(item['sets']) == len(SETS), 'Authorization set scope mismatch')
        require(isinstance(item.get('materials'), list)
                and set(item['materials']) >= {'questions', 'answers', 'audio', 'references'},
                'Authorization does not cover required materials')
        require(isinstance(item.get('uses'), list) and set(item['uses']) >= {
            'local-build', 'local-cache', 'restricted-playback', 'limited-participants'
        }, 'Authorization does not cover local trial uses')
        require(isinstance(item.get('takedown'), str) and item['takedown'].strip(),
                'Authorization takedown procedure is missing')
        utc_datetime(item.get('expiresAt'))
    require(all(authorization.get(field) == document.get(field) for field in (
        'expiresAt', 'sets', 'materials', 'uses', 'takedown', 'authorizedMedia')),
        'Authorization document and manifest disagree')
    authorized_media = document.get('authorizedMedia')
    require(isinstance(authorized_media, dict) and len(authorized_media) == 4,
            'Authorization must identify exactly four recordings')
    for unit_id, item in authorized_media.items():
        require(isinstance(unit_id, str) and isinstance(item, dict)
                and isinstance(item.get('id'), str) and MEDIA_ID.fullmatch(item['id']),
                'Authorized media identity is invalid')
        require_hash(item.get('sha256'), 'Authorized media hash')
    return authorization['expiresAt'], utc_datetime(document['expiresAt'])


def check_sources(evidence, repository):
    official = checked_record(evidence, 'answerSource', 'official answer source')
    reviewed = checked_record(evidence, 'sourceReview', 'human source review')
    official_doc = read_document(official, 'verified-official', repository)
    reviewed_doc = read_document(reviewed, 'human-verified', repository)
    require(official_doc.get('schemaVersion') == 1 and official_doc.get('sets') == list(SETS)
            and isinstance(official_doc.get('answers'), dict), 'Formal answer document is incomplete')
    require(reviewed_doc.get('schemaVersion') == 1 and reviewed_doc.get('sets') == list(SETS)
            and all(isinstance(reviewed_doc.get(field), dict) for field in
                    ('reviewedUnits', 'reviewedQuestions', 'references', 'media')),
            'Independent source review document is incomplete')
    for field in ('reviewedUnits', 'reviewedQuestions', 'references', 'media'):
        require(evidence.get(field) == reviewed_doc[field],
                f'Review manifest differs from signed source review: {field}')
    require(evidence.get('answers') == official_doc['answers'],
            'Answer manifest differs from formal answer document')
    return official['sha256'], reviewed['sha256']


def check_question(question, task, evidence):
    key = question['external_key']
    number = question['metadata']['originalQuestionNumber']
    require(type(number) is int and number > 0, f'Invalid original question number: {key}')
    review = checked_record(evidence.get('reviewedQuestions'), key, 'human question review')
    require(review.get('status') == 'human-verified'
            and review.get('originalQuestionNumber') == number
            and review.get('questionSha256') == text_hash(question['question_text'])
            and review.get('optionsSha256') == options_hash(question['options']),
            f'Question text, options or number not independently verified: {key}')
    require(not question['metadata'].get('spokenQuestionUnavailable')
            and isinstance(question['question_text'], str)
            and question['question_text'].strip()
            and not BLEED.search(question['question_text']), f'Unusable question prompt: {key}')
    sanitized = {field: question[field] for field in (
        'id', 'unit_id', 'external_key', 'question_number', 'question_type',
        'question_text', 'options')}
    sanitized['metadata'] = safe_metadata(question['metadata'], QUESTION_META)
    sanitized['explanation'] = None
    sanitized['is_active'] = True
    if task in OBJECTIVE:
        answer = checked_record(evidence.get('answers'), key, 'official answer')
        options = question['options']
        require(answer.get('status') == 'verified-official'
                and answer.get('originalQuestionNumber') == number
                and isinstance(options, list) and len(options) >= 2
                and all(isinstance(option, str) and option.strip() for option in options),
                f'Answer evidence is not independently verified: {key}')
        require(all(not BLEED.search(option) for option in options),
                f'Option appears contaminated by OCR: {key}')
        selected = answer.get('option')
        require(isinstance(selected, str) and selected in options,
                f'Official answer is not an exact current option: {key}')
        sanitized['answer_key'] = {'answers': [selected], 'caseSensitive': False}
    else:
        reference = checked_record(evidence.get('references'), key, 'reference material')
        require(reference.get('status') == 'human-verified'
                and isinstance(reference.get('referenceAnswer'), str)
                and reference['referenceAnswer'].strip()
                and isinstance(reference.get('reviewChecklist'), list)
                and reference['reviewChecklist']
                and all(isinstance(item, str) and item.strip() for item in reference['reviewChecklist']),
                f'Reference material is not independently reviewed: {key}')
        sanitized['options'] = None
        sanitized['answer_key'] = {'answers': []}
        sanitized['metadata']['referenceAnswer'] = reference['referenceAnswer']
        sanitized['metadata']['reviewChecklist'] = reference['reviewChecklist']
    return sanitized


def check_audio(unit, questions, evidence, media_root, repository):
    entry = checked_record(evidence.get('media'), unit['id'], 'audio mapping')
    identifier = entry.get('id')
    require(isinstance(identifier, str) and MEDIA_ID.fullmatch(identifier),
            'Media ID must be a lowercase UUIDv4')
    file = private_file(entry.get('path'), repository)
    require(file.is_relative_to(media_root) and entry.get('mimeType') == 'audio/mpeg'
            and file.suffix.lower() == '.mp3', 'Audio must be an external MP3 under media root')
    original = Path(entry['path'])
    require(original.is_relative_to(media_root), 'Audio path must start inside media root')
    current = original
    while current != media_root:
        require(not current.is_symlink(), 'Audio path contains a symlink')
        current = current.parent
    require(entry.get('status') == 'verified-authorized'
            and entry.get('spokenPromptsStatus') == 'human-verified',
            'Audio rights or spoken question mapping is unverified')
    numbers = [q['metadata']['originalQuestionNumber'] for q in questions]
    require(entry.get('questions') == sorted(numbers), 'Audio question-to-unit mapping is incomplete')
    require(type(entry.get('bytes')) is int and entry['bytes'] > 0
            and entry['bytes'] == file.stat().st_size, 'Audio size mismatch')
    require_hash(entry.get('sha256'), 'Audio hash')
    grant = checked_record(evidence['authorization']['authorizedMedia'], unit['id'], 'authorized recording')
    require(grant.get('id') == identifier and grant.get('sha256') == entry['sha256'],
            'Recording is not covered by the authorization')
    require(file_hash(file) == entry['sha256'], 'Audio digest mismatch')
    return {'id': identifier, 'unitId': unit['id'], 'path': str(file),
            'mimeType': 'audio/mpeg', 'bytes': entry['bytes'], 'sha256': entry['sha256']}


def check_unit(unit, questions, evidence, media_root, repository):
    key = set_key(unit)
    task = unit['metadata']['cetTask']
    require(len(questions) in (1, 5, 10, 25), f'Invalid unit question count: {unit["id"]}')
    require(all(q['unit_id'] == unit['id'] and q['metadata']['cetTask'] == task for q in questions),
            f'Invalid parent reference or task: {unit["id"]}')
    display_numbers = [q['question_number'] for q in questions]
    require(all(type(number) is int and 1 <= number <= len(questions) for number in display_numbers)
            and set(display_numbers) == set(range(1, len(questions) + 1)),
            f'Invalid or duplicate displayed question number: {unit["id"]}')
    require(all(q['metadata'].get('sourcePaper') in (None, unit['metadata']['sourcePaper'])
                and q['metadata'].get('setNumber') in (None, unit['metadata']['setNumber'])
                for q in questions), 'Question set identity mismatch')
    unit_review = checked_record(evidence.get('reviewedUnits'), unit['id'], 'unit source review')
    require(unit_review.get('status') == 'human-verified'
            and unit_review.get('passageSha256') == text_hash(unit['passage_text'] or '')
            and unit_review.get('titleSha256') == text_hash(unit['title']),
            f'Unit source/prompt is not verified: {unit["id"]}')
    if task != 'listening_choice':
        require(isinstance(unit['passage_text'], str) and unit['passage_text'].strip(),
                f'Unit material is missing: {unit["id"]}')
    safe_unit = {field: unit[field] for field in (
        'id', 'slug', 'exam', 'skill', 'mode', 'title', 'description',
        'difficulty', 'material_type', 'passage_text', 'audio_url',
        'transcript', 'asset_url', 'time_limit_seconds')}
    safe_unit['metadata'] = safe_metadata(unit['metadata'], UNIT_META)
    safe_unit['transcript'] = None
    safe_unit['asset_url'] = None
    safe_unit['audio_url'] = None
    safe_unit['is_active'] = True
    checked = [check_question(question, task, evidence) for question in questions]
    media = None
    if task == 'listening_choice':
        media = check_audio(unit, questions, evidence, media_root, repository)
        safe_unit['audio_url'] = '/api/cet-trial/media/' + media['id']
    return {'setKey': key, 'unit': safe_unit, 'questions': checked}, media


def build_snapshot(units, questions, evidence, repository, media_root, trusted_key, trusted_key_sha256):
    """Require complete four-set data and independently reviewed evidence."""
    require(len(units) == 26 and len(questions) == 228, 'Four-set baseline must be 26/228')
    keys = [set_key(unit) for unit in units]
    require(Counter(keys) == SET_COUNTS, 'Four-set unit allocation does not match baseline')
    ids = [unit['id'] for unit in units]
    question_ids = [question['id'] for question in questions]
    external_keys = [question['external_key'] for question in questions]
    require(len(set(ids)) == len(ids) and len(set(question_ids)) == len(question_ids)
            and len(set(external_keys)) == len(external_keys)
            and not set(ids).intersection(question_ids), 'Duplicate source identity')
    require(all(isinstance(key, str) and key for key in external_keys), 'Missing external question key')
    require(all(question['unit_id'] in ids for question in questions), 'Unknown question parent')
    require(isinstance(evidence, dict) and evidence.get('schemaVersion') == 1,
            'Evidence schema must be version 1')
    verified_signed_review(evidence, repository, trusted_key, trusted_key_sha256)
    _, authorization_expires = check_authorization(evidence, repository)
    manifest_expires = utc_datetime(evidence.get('expiresAt'))
    expires = min(manifest_expires, authorization_expires)
    expires_at = expires.strftime('%Y-%m-%dT%H:%M:%SZ')
    official_hash, review_hash = check_sources(evidence, repository)
    by_unit = {unit_id: [] for unit_id in ids}
    for question in questions:
        by_unit[question['unit_id']].append(question)
    entries, media = [], []
    objective_by_set = {key: set() for key in SETS}
    tasks_by_set = {key: Counter() for key in SETS}
    for unit in units:
        key = set_key(unit)
        task = unit['metadata']['cetTask']
        rows = by_unit[unit['id']]
        require(task in OBJECTIVE or task in ('essay', 'translation'), 'Unknown CET task')
        if task == 'listening_choice':
            expected_count = 25
        elif task in ('banked_cloze', 'paragraph_matching'):
            expected_count = 10
        elif task == 'reading_choice':
            expected_count = 5 if key.startswith('cet6') else 10
        else:
            expected_count = 1
        require(len(rows) == expected_count, 'Incomplete task unit')
        checked, audio = check_unit(unit, rows, evidence, media_root, repository)
        entries.append(checked)
        tasks_by_set[key][task] += 1
        if audio:
            media.append(audio)
        for row in rows:
            original = row['metadata']['originalQuestionNumber']
            if task in OBJECTIVE:
                require(type(original) is int and 1 <= original <= 55, 'Invalid objective numbering')
                require(original not in objective_by_set[key], 'Duplicate objective numbering')
                objective_by_set[key].add(original)
    for key in SETS:
        expected_tasks = Counter(dict(listening_choice=1, banked_cloze=1, paragraph_matching=1, reading_choice=2 if key.startswith('cet6') else 1, essay=1, translation=1))
        require(tasks_by_set[key] == expected_tasks, 'Incomplete set task distribution')
        require(objective_by_set[key] == set(range(1, 56)), 'Incomplete objective question numbering')
    require(len(media) == 4 and len({item['id'] for item in media}) == 4, 'Incomplete or duplicate audio mapping')
    require(set(evidence['authorization']['authorizedMedia']) == {item['unitId'] for item in media},
            'Authorization recording scope differs from the four listening units')
    require(set(evidence['answers']) == {q['external_key'] for q in questions if q['metadata']['cetTask'] in OBJECTIVE}
            and set(evidence['reviewedQuestions']) == set(external_keys)
            and set(evidence['references']) == {q['external_key'] for q in questions if q['metadata']['cetTask'] not in OBJECTIVE}
            and set(evidence['reviewedUnits']) == set(ids)
            and set(evidence['media']) == {item['unitId'] for item in media},
            'Evidence coverage or allowlist mismatch')
    snapshot = {'schemaVersion': 1, 'expiresAt': expires_at, 'sets': list(SETS), 'units': entries, 'media': media, 'evidenceSha256': {'authorization': evidence['authorization']['sha256'], 'answerSource': official_hash, 'sourceReview': review_hash}}
    snapshot['integritySha256'] = text_hash(canonical_json(snapshot))
    return snapshot


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', type=Path, required=True)
    parser.add_argument('--audit-output', type=Path)
    parser.add_argument('--evidence', type=Path)
    parser.add_argument('--media-root', type=Path)
    parser.add_argument('--reviewer-public-key', type=Path)
    parser.add_argument('--reviewer-key-sha256')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args(argv)
    repository = Path(__file__).resolve().parent.parent
    require(args.database.is_file() and not args.database.is_symlink(), 'Missing private source database')
    private_file(str(args.database.resolve()), repository)
    require(not args.audit_output or not args.audit_output.exists(), 'Refusing to replace audit output')
    require(not args.output or not args.output.exists(), 'Refusing to replace snapshot output')
    exporter = load_exporter(repository / 'scripts' / 'export-cet-supabase-review.py')
    with sqlite3.connect(args.database) as connection:
        units, questions = exporter.normalize_rows(connection)
        exporter.validate_rows(units, questions)
    report = audit_only(units, questions)
    if args.output:
        require(all((args.evidence, args.media_root, args.reviewer_public_key, args.reviewer_key_sha256)),
                'Runnable snapshot requires evidence, media root and trusted reviewer key')
        media_root = args.media_root
        require(media_root.is_dir() and not media_root.is_symlink(), 'Media root must be a regular directory')
        media_root = media_root.resolve(strict=True)
        require(not media_root.is_relative_to(repository), 'Media root must be outside repository')
        evidence_file = private_file(str(args.evidence), repository)
        try:
            evidence = json.loads(evidence_file.read_text(encoding='utf-8'))
        except (ValueError, UnicodeError) as error:
            raise SnapshotError('Evidence manifest is invalid') from error
        snapshot = build_snapshot(units, questions, evidence, repository, media_root, args.reviewer_public_key, args.reviewer_key_sha256)
        output = args.output.absolute()
        require(not output.is_relative_to(repository), 'Snapshot must be outside repository')
        snapshot_bytes = canonical_json(snapshot).encode('utf-8')
        with output.open('xb') as stream:
            stream.write(snapshot_bytes)
        report['snapshotSha256'] = sha256(snapshot_bytes)
        report['runnableSnapshotEmitted'] = True
        report['blockedUnits'] = 0
        report['blockedQuestions'] = 0
    if args.audit_output:
        audit_path = args.audit_output.absolute()
        require(not audit_path.is_relative_to(repository), 'Audit report must be outside repository')
        with audit_path.open('x', encoding='utf-8') as stream:
            stream.write(canonical_json(report) + '\n')
    print(canonical_json(report))
    return report


if __name__ == '__main__':
    try:
        main()
    except (SnapshotError, ValueError, OSError, sqlite3.Error) as error:
        print(f'CET trial build blocked: {error}', file=sys.stderr)
        sys.exit(1)
