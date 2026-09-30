"""Offline CET trial release-gate tests with synthetic evidence only."""

import copy
import importlib.util
import json
import shutil
import subprocess
import tempfile
import unittest
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'build-cet-trial-snapshot.py'
REPOSITORY = SCRIPT.parent.parent
spec = importlib.util.spec_from_file_location('cet_trial_builder', SCRIPT)
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


def utc_after(delta):
    return (datetime.now(timezone.utc) + delta).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    return builder.file_hash(path)


def sign_manifest(evidence, private_key, signature):
    payload = dict(evidence)
    payload.pop('reviewSignature', None)
    result = subprocess.run(
        ['openssl', 'dgst', '-sha256', '-sign', str(private_key), '-out', str(signature)],
        input=builder.canonical_json(payload).encode('utf-8'), capture_output=True, check=False)
    if result.returncode:
        raise RuntimeError(result.stderr.decode('utf-8', errors='replace'))
    evidence['reviewSignature'] = str(signature)


@contextmanager
def synthetic_fixture():
    """Create a complete four-set fixture entirely outside the repository."""
    if not shutil.which('openssl'):
        raise unittest.SkipTest('OpenSSL unavailable')
    with tempfile.TemporaryDirectory() as name:
        root = Path(name).resolve()
        media_root = root / 'media'
        media_root.mkdir()
        private_key = root / 'reviewer-private.pem'
        public_key = root / 'reviewer-public.pem'
        subprocess.run(['openssl', 'genrsa', '-out', str(private_key), '2048'],
                       capture_output=True, check=True)
        subprocess.run(['openssl', 'rsa', '-in', str(private_key), '-pubout', '-out', str(public_key)],
                       capture_output=True, check=True)

        units = []
        questions = []
        answers = {}
        reviewed_units = {}
        reviewed_questions = {}
        references = {}
        media = {}
        authorized_media = {}
        question_index = 0
        unit_index = 0
        for set_key in builder.SETS:
            paper, set_number = set_key.rsplit('-set', 1)
            set_number = int(set_number)
            task_layout = [
                ('listening_choice', 25),
                ('banked_cloze', 10),
                ('paragraph_matching', 10),
            ]
            reading_count = 5 if paper.startswith('cet6') else 10
            task_layout.append(('reading_choice', reading_count))
            if paper.startswith('cet6'):
                task_layout.append(('reading_choice', 5))
            task_layout.extend([('essay', 1), ('translation', 1)])
            objective_number = 1
            for task, count in task_layout:
                unit_index += 1
                unit_id = f'unit-{unit_index:02d}'
                title = f'Synthetic {set_key} {task} {unit_index}'
                passage = '' if task == 'listening_choice' else f'Synthetic passage for {unit_id}.'
                unit_metadata = {
                    'cetTask': task,
                    'sourcePaper': paper,
                    'setNumber': set_number,
                }
                unit = {
                    'id': unit_id,
                    'slug': unit_id,
                    'exam': 'cet',
                    'skill': 'listening' if task == 'listening_choice' else 'reading',
                    'mode': task,
                    'title': title,
                    'description': f'Synthetic {task} unit.',
                    'difficulty': 'medium',
                    'material_type': 'passage',
                    'passage_text': passage,
                    'audio_url': None,
                    'transcript': None,
                    'asset_url': None,
                    'time_limit_seconds': 60,
                    'metadata': unit_metadata,
                }
                units.append(unit)
                reviewed_units[unit_id] = {
                    'status': 'human-verified',
                    'passageSha256': builder.text_hash(passage),
                    'titleSha256': builder.text_hash(title),
                }
                original_numbers = []
                for display_number in range(1, count + 1):
                    question_index += 1
                    question_id = f'question-{question_index:03d}'
                    external_key = f'q-{question_index:03d}'
                    if task in builder.OBJECTIVE:
                        original_number = objective_number
                        objective_number += 1
                        question_type = 'multiple_choice'
                        options = ['A', 'B', 'C', 'D']
                    else:
                        original_number = display_number
                        question_type = 'essay' if task == 'essay' else 'translation'
                        options = []
                    question_text = f'Synthetic question {external_key}?'
                    question = {
                        'id': question_id,
                        'unit_id': unit_id,
                        'external_key': external_key,
                        'question_number': display_number,
                        'question_type': question_type,
                        'question_text': question_text,
                        'options': options,
                        'metadata': {
                            'cetTask': task,
                            'originalQuestionNumber': original_number,
                        },
                    }
                    questions.append(question)
                    original_numbers.append(original_number)
                    reviewed_questions[external_key] = {
                        'status': 'human-verified',
                        'sourceSha256': builder.text_hash(f'synthetic source {external_key}'),
                        'originalQuestionNumber': original_number,
                        'questionSha256': builder.text_hash(question_text),
                        'optionsSha256': builder.options_hash(options),
                    }
                    if task in builder.OBJECTIVE:
                        answers[external_key] = {
                            'status': 'verified-official',
                            'originalQuestionNumber': original_number,
                            'option': 'A',
                        }
                    else:
                        references[external_key] = {
                            'status': 'human-verified',
                            'referenceAnswer': f'Reference answer for {external_key}.',
                            'reviewChecklist': ['Prompt checked', 'Reference checked'],
                        }
                if task == 'listening_choice':
                    media_path = media_root / f'{unit_id}.mp3'
                    media_path.write_bytes(f'synthetic audio for {unit_id}'.encode('ascii'))
                    media_id = f'00000000-0000-4000-8000-{unit_index:012d}'
                    media_entry = {
                        'id': media_id,
                        'path': str(media_path),
                        'mimeType': 'audio/mpeg',
                        'status': 'verified-authorized',
                        'spokenPromptsStatus': 'human-verified',
                        'questions': sorted(original_numbers),
                        'bytes': media_path.stat().st_size,
                        'sha256': builder.file_hash(media_path),
                    }
                    media[unit_id] = media_entry
                    authorized_media[unit_id] = {
                        'id': media_id,
                        'sha256': media_entry['sha256'],
                    }

        sets = list(builder.SETS)
        review_document = {
            'schemaVersion': 1,
            'sets': sets,
            'reviewedUnits': reviewed_units,
            'reviewedQuestions': reviewed_questions,
            'references': references,
            'media': media,
        }
        answer_document = {
            'schemaVersion': 1,
            'sets': sets,
            'answers': answers,
        }
        authorization_expires = utc_after(timedelta(days=4))
        manifest_expires = utc_after(timedelta(days=1))
        authorization_document = {
            'schemaVersion': 1,
            'sets': sets,
            'materials': ['questions', 'answers', 'audio', 'references'],
            'uses': ['local-build', 'local-cache', 'restricted-playback', 'limited-participants'],
            'takedown': 'Synthetic test takedown procedure.',
            'expiresAt': authorization_expires,
            'authorizedMedia': authorized_media,
        }

        review_path = root / 'source-review.json'
        answer_path = root / 'answer-source.json'
        authorization_path = root / 'authorization.json'
        review_hash = write_json(review_path, review_document)
        answer_hash = write_json(answer_path, answer_document)
        authorization_hash = write_json(authorization_path, authorization_document)
        evidence = {
            'schemaVersion': 1,
            'expiresAt': manifest_expires,
            'authorization': {
                'status': 'verified',
                'file': str(authorization_path),
                'sha256': authorization_hash,
                'sets': sets,
                'materials': authorization_document['materials'],
                'uses': authorization_document['uses'],
                'takedown': authorization_document['takedown'],
                'expiresAt': authorization_expires,
                'authorizedMedia': copy.deepcopy(authorized_media),
            },
            'answerSource': {
                'status': 'verified-official',
                'file': str(answer_path),
                'sha256': answer_hash,
            },
            'sourceReview': {
                'status': 'human-verified',
                'file': str(review_path),
                'sha256': review_hash,
            },
            'answers': copy.deepcopy(answers),
            'reviewedUnits': copy.deepcopy(reviewed_units),
            'reviewedQuestions': copy.deepcopy(reviewed_questions),
            'references': copy.deepcopy(references),
            'media': copy.deepcopy(media),
            'authorizedMedia': copy.deepcopy(authorized_media),
        }
        signature_path = root / 'review.sig'
        sign_manifest(evidence, private_key, signature_path)
        yield {
            'root': root,
            'media_root': media_root,
            'private_key': private_key,
            'public_key': public_key,
            'units': units,
            'questions': questions,
            'evidence': evidence,
            'trusted_key_sha256': builder.file_hash(public_key),
            'authorization_expires': authorization_expires,
            'manifest_expires': manifest_expires,
        }


class BuilderGateTests(unittest.TestCase):
    def test_audit_requires_exact_four_set_counts(self):
        units = []
        for set_key, count in builder.SET_COUNTS.items():
            paper, number = set_key.rsplit('-set', 1)
            units.extend({'metadata': {'sourcePaper': paper, 'setNumber': int(number)}} for _ in range(count))
        report = builder.audit_only(units, [{}] * 228)
        self.assertEqual(report['blockedUnits'], 26)
        self.assertFalse(report['runnableSnapshotEmitted'])
        with self.assertRaisesRegex(builder.SnapshotError, 'Four-set source'):
            builder.audit_only(units, [{}] * 227)
        units[0]['metadata']['sourcePaper'] = 'cet4-2025-06'
        with self.assertRaisesRegex(builder.SnapshotError, 'Unexpected CET set'):
            builder.audit_only(units, [{}] * 228)

    def test_declared_status_cannot_replace_trusted_signature(self):
        if not shutil.which('openssl'):
            self.skipTest('OpenSSL unavailable')
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            key = root / 'reviewer.pem'
            signature = root / 'review.sig'
            key.write_text('not a real public key', encoding='utf-8')
            signature.write_bytes(b'self-declared verified')
            evidence = {'schemaVersion': 1, 'status': 'verified', 'reviewSignature': str(signature)}
            with self.assertRaisesRegex(builder.SnapshotError, 'signature is invalid'):
                builder.verified_signed_review(evidence, REPOSITORY, key, builder.file_hash(key))
            with self.assertRaisesRegex(builder.SnapshotError, 'Untrusted reviewer key'):
                builder.verified_signed_review(evidence, REPOSITORY, key, '0' * 64)

    def test_real_synthetic_fixture_builds_and_uses_earlier_signed_expiry(self):
        with synthetic_fixture() as fixture:
            snapshot = builder.build_snapshot(
                fixture['units'], fixture['questions'], fixture['evidence'], REPOSITORY,
                fixture['media_root'], fixture['public_key'], fixture['trusted_key_sha256'])
            self.assertEqual(snapshot['schemaVersion'], 1)
            self.assertEqual(snapshot['sets'], list(builder.SETS))
            self.assertEqual(len(snapshot['units']), 26)
            self.assertEqual(sum(len(entry['questions']) for entry in snapshot['units']), 228)
            self.assertEqual(len(snapshot['media']), 4)
            self.assertEqual(snapshot['expiresAt'], fixture['manifest_expires'])
            self.assertLess(snapshot['expiresAt'], fixture['authorization_expires'])
            self.assertEqual(snapshot['integritySha256'], builder.text_hash(builder.canonical_json({
                key: value for key, value in snapshot.items() if key != 'integritySha256'
            })))

    def test_authorization_expiry_shortens_later_signed_manifest_expiry(self):
        with synthetic_fixture() as fixture:
            evidence = copy.deepcopy(fixture['evidence'])
            earlier_grant_expiry = utc_after(timedelta(hours=12))
            authorization_path = Path(evidence['authorization']['file'])
            authorization_document = json.loads(authorization_path.read_text(encoding='utf-8'))
            authorization_document['expiresAt'] = earlier_grant_expiry
            evidence['authorization']['sha256'] = write_json(authorization_path, authorization_document)
            evidence['authorization']['expiresAt'] = earlier_grant_expiry
            sign_manifest(evidence, fixture['private_key'], Path(evidence['reviewSignature']))
            snapshot = builder.build_snapshot(
                fixture['units'], fixture['questions'], evidence, REPOSITORY,
                fixture['media_root'], fixture['public_key'], fixture['trusted_key_sha256'])
            self.assertEqual(snapshot['expiresAt'], earlier_grant_expiry)
            self.assertLess(snapshot['expiresAt'], evidence['expiresAt'])

    def test_duplicate_displayed_number_is_rejected(self):
        with synthetic_fixture() as fixture:
            units = copy.deepcopy(fixture['units'])
            questions = copy.deepcopy(fixture['questions'])
            first_unit = units[0]['id']
            unit_questions = [question for question in questions if question['unit_id'] == first_unit]
            unit_questions[1]['question_number'] = unit_questions[0]['question_number']
            with self.assertRaisesRegex(builder.SnapshotError, 'duplicate displayed question number'):
                builder.build_snapshot(
                    units, questions, fixture['evidence'], REPOSITORY, fixture['media_root'],
                    fixture['public_key'], fixture['trusted_key_sha256'])

    def test_unsafe_javascript_integer_is_rejected(self):
        with synthetic_fixture() as fixture:
            units = copy.deepcopy(fixture['units'])
            units[0]['metadata']['wordRange'] = builder.MAX_SAFE_INTEGER + 1
            with self.assertRaisesRegex(builder.SnapshotError, 'JavaScript safe range'):
                builder.build_snapshot(
                    units, fixture['questions'], fixture['evidence'], REPOSITORY, fixture['media_root'],
                    fixture['public_key'], fixture['trusted_key_sha256'])

    def test_tampered_audio_digest_is_rejected(self):
        with synthetic_fixture() as fixture:
            media_entry = next(iter(fixture['evidence']['media'].values()))
            audio_path = Path(media_entry['path'])
            audio_path.write_bytes(b'X' + audio_path.read_bytes()[1:])
            with self.assertRaisesRegex(builder.SnapshotError, 'Audio digest mismatch'):
                builder.build_snapshot(
                    fixture['units'], fixture['questions'], fixture['evidence'], REPOSITORY,
                    fixture['media_root'], fixture['public_key'], fixture['trusted_key_sha256'])

    def test_unauthorized_audio_digest_is_rejected(self):
        with synthetic_fixture() as fixture:
            evidence = copy.deepcopy(fixture['evidence'])
            unit_id = next(iter(evidence['media']))
            evidence['media'][unit_id]['sha256'] = '0' * 64
            evidence['sourceReview']['sha256'] = write_json(Path(evidence['sourceReview']['file']), {
                'schemaVersion': 1,
                'sets': list(builder.SETS),
                'reviewedUnits': evidence['reviewedUnits'],
                'reviewedQuestions': evidence['reviewedQuestions'],
                'references': evidence['references'],
                'media': evidence['media'],
            })
            sign_manifest(evidence, fixture['private_key'], Path(evidence['reviewSignature']))
            with self.assertRaisesRegex(builder.SnapshotError, 'not covered by the authorization'):
                builder.build_snapshot(
                    fixture['units'], fixture['questions'], evidence, REPOSITORY,
                    fixture['media_root'], fixture['public_key'], fixture['trusted_key_sha256'])

    def test_missing_media_answer_reference_and_extra_set_are_rejected(self):
        with synthetic_fixture() as fixture:
            cases = [
                ('media', lambda evidence: evidence['media'].pop(next(iter(evidence['media']))),
                 'source review'),
                ('answer', lambda evidence: evidence['answers'].pop(next(iter(evidence['answers']))),
                 'formal answer document'),
                ('reference', lambda evidence: evidence['references'].pop(next(iter(evidence['references']))),
                 'source review'),
            ]
            for label, mutate, expected in cases:
                with self.subTest(label=label):
                    evidence = copy.deepcopy(fixture['evidence'])
                    mutate(evidence)
                    sign_manifest(evidence, fixture['private_key'], Path(evidence['reviewSignature']))
                    with self.assertRaisesRegex(builder.SnapshotError, expected):
                        builder.build_snapshot(
                            fixture['units'], fixture['questions'], evidence, REPOSITORY,
                            fixture['media_root'], fixture['public_key'], fixture['trusted_key_sha256'])

            units = copy.deepcopy(fixture['units'])
            units[0]['metadata']['sourcePaper'] = 'cet4-2025-06'
            with self.assertRaisesRegex(builder.SnapshotError, 'Unexpected CET set'):
                builder.build_snapshot(
                    units, fixture['questions'], fixture['evidence'], REPOSITORY, fixture['media_root'],
                    fixture['public_key'], fixture['trusted_key_sha256'])

    def test_missing_answers_and_media_never_build(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            with self.assertRaisesRegex(builder.SnapshotError, 'Four-set baseline'):
                builder.build_snapshot([], [], {'schemaVersion': 1}, REPOSITORY, root, root / 'key', '0' * 64)
            unit = {'id': 'synthetic', 'metadata': {'cetTask': 'listening_choice', 'sourcePaper': 'cet4-2024-06', 'setNumber': 1}}
            with self.assertRaisesRegex(builder.SnapshotError, 'Missing audio mapping'):
                builder.check_audio(unit, [], {}, root, REPOSITORY)
            with self.assertRaisesRegex(builder.SnapshotError, 'Missing official answer'):
                builder.check_question({'id': 'q', 'unit_id': 'u', 'external_key': 'synthetic', 'question_number': 1, 'question_type': 'multiple_choice', 'metadata': {'originalQuestionNumber': 1}, 'question_text': 'A question?', 'options': ['A', 'B']}, 'reading_choice', {'reviewedQuestions': {'synthetic': {'status': 'human-verified', 'sourceSha256': 'x', 'originalQuestionNumber': 1, 'questionSha256': builder.text_hash('A question?'), 'optionsSha256': builder.options_hash(['A', 'B'])}}})


if __name__ == '__main__':
    unittest.main()
