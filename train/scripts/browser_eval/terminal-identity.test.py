"""PURE genuine Collector/Native regressions. No CDLL/libproc/signal/model IO."""
import ctypes
import errno
import importlib.util
import io
import json
from pathlib import Path
import unittest
from unittest import mock

D = Path(__file__).resolve().parent

def load(name, file):
    spec = importlib.util.spec_from_file_location(name, D / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

N = load('terminal_native', 'process-macos-native.py')
M = load('terminal_entry', 'process-macos.py')
S = load('terminal_support', 'process_macos_test_support.py')
OLD = {'pid': 101, 'startSec': '1', 'startUsec': 0}
NEW = {'pid': 101, 'startSec': '2', 'startUsec': 0}

class TerminalWireTests(unittest.TestCase):
    def setUp(self):
        self.stack = []
        for target, name, effect in [(N.os, 'getuid', lambda: 501),
                                     (ctypes, 'CDLL', self.forbidden)]:
            patch = mock.patch.object(target, name, side_effect=effect)
            patch.start()
            self.addCleanup(patch.stop)

    def forbidden(self, *args, **kwargs):
        self.fail('actual Native/signal call forbidden')

    def backend(self, member_in_census=False, denied_census=False,
                second_birth=False, inspect_denial=False):
        calls = []
        phase = {'value': 0}
        def lp(flavor, uid, arr, capacity):
            self.assertEqual((flavor, uid), (N.PROC_UID_ONLY, 501))
            vector = [100, 101] if member_in_census else [100]
            calls.append(('list', list(vector)))
            for at, pid in enumerate(vector):
                arr[at] = pid
            return len(vector) * 4
        counts = {}
        def info(pid, flavor, arg, pointer, size):
            calls.append(('bsd' if flavor == 3 else 'task', pid))
            if denied_census and phase['value'] == 1 and pid == 100:
                ctypes.set_errno(errno.EPERM)
                return 0
            if inspect_denial and pid == 555:
                ctypes.set_errno(errno.EPERM)
                return 0
            key = (phase['value'], pid)
            at = counts.get(key, 0)
            counts[key] = at + 1
            census = pid == 100 or (member_in_census and at == 0)
            if pid == 101 and not census and not (phase['value'] == 1 and second_birth):
                ctypes.set_errno(errno.ESRCH if phase['value'] == 0 else errno.EPERM)
                return 0
            if flavor == N.PROC_PIDTASKINFO:
                value = S.task_struct(N, rss=512)
            else:
                sec = 2 if phase['value'] == 1 and second_birth and pid == 101 else 1
                value = S.bsd_struct(N, pid=pid, ppid=1, pgid=1, uid=501, sec=sec, usec=0)
            ctypes.memmove(pointer, ctypes.byref(value), size)
            ctypes.set_errno(0)
            return size
        return N.Backend(lp, info, self.forbidden), calls, phase

    def collector(self, backend, output=None):
        return M.Collector(N, backend, 'terminal-wire', False,
                           io.BytesIO(), output if output is not None else io.BytesIO())

    def message(self, seq, owned, inspect=None):
        return {'ipcVersion': 1, 'runId': 'terminal-wire', 'seq': seq,
                'type': 'sample', 'requestId': f'request-{seq}',
                'owned': owned, 'inspectPids': inspect or [], 'probes': []}

    def test_no_producer_terminal_cache_and_denied_unproven_read_fatal(self):
        backend, calls, phase = self.backend()
        collector = self.collector(backend)
        collector.handle(self.message(0, [OLD]))
        first = json.loads(collector.outstream.getvalue())
        self.assertEqual(first['gone'], [OLD])
        self.assertEqual([c for c in calls if c == ('bsd', 101)], [('bsd', 101)] * 2)
        phase['value'] = 1
        with self.assertRaises(N.BackendError) as caught:
            collector.handle(self.message(1, [OLD]))
        self.assertEqual(caught.exception.detail, 'pidinfo-bsd 101 errno 1')
        self.assertFalse(hasattr(collector, 'terminal'))

    def test_omitted_terminal_member_remains_projectable_for_Node_contradiction(self):
        backend, calls, phase = self.backend(member_in_census=True)
        collector = self.collector(backend)
        collector.handle(self.message(0, [OLD]))
        first = json.loads(collector.outstream.getvalue().splitlines()[0])
        self.assertEqual(first['gone'], [OLD])
        phase['value'] = 1
        collector.handle(self.message(1, []))
        second = json.loads(collector.outstream.getvalue().splitlines()[1])
        self.assertIn(OLD, [r['identity'] for r in second['discovered']])
        self.assertEqual(second['samples'], [])
        self.assertEqual(second['gone'], [])
        self.assertEqual(len(collector.discovery_seeds), 1)
        self.assertEqual(calls.count(('bsd', 101)), 4) # census+2gone, later census only
        self.assertEqual(self.collector(backend).discovery_seeds, {})

    def test_new_birth_is_freshly_sampled_not_given_old_absence(self):
        backend, calls, phase = self.backend(second_birth=True)
        collector = self.collector(backend)
        collector.handle(self.message(0, [OLD]))
        phase['value'] = 1
        collector.handle(self.message(1, [NEW]))
        second = json.loads(collector.outstream.getvalue().splitlines()[1])
        self.assertEqual(second['samples'][0]['identity'], NEW)
        self.assertEqual(second['samples'][0]['residentBytes'], 512)
        self.assertEqual(second['gone'], [])
        self.assertEqual(len(collector.discovery_seeds), 2)
        self.assertIn(('task', 101), calls)

    def test_full_census_stays_mandatory_with_empty_owned_partition(self):
        backend, calls, phase = self.backend(denied_census=True)
        collector = self.collector(backend)
        collector.handle(self.message(0, [OLD]))
        phase['value'] = 1
        with self.assertRaises(N.BackendError) as caught:
            collector.handle(self.message(1, []))
        self.assertEqual(caught.exception.reason, 'permission')
        self.assertIn('revalidation permission', caught.exception.detail)
        self.assertEqual(sum(c[0] == 'list' for c in calls), 3) # first+two failed vectors

    def test_later_inspect_failure_emits_no_partial_gone_frame(self):
        for stage in ['inspect', 'probe']:
            backend, _, _ = self.backend(inspect_denial=True)
            collector = self.collector(backend)
            msg = self.message(0, [OLD], [555] if stage == 'inspect' else [])
            if stage == 'probe':
                msg['probes'] = [{'pid': 555, 'startSec': '1', 'startUsec': 0}]
            with self.assertRaises(N.BackendError):
                collector.handle(msg)
            self.assertEqual(collector.outstream.getvalue(), b'')

    def test_write_and_withheld_flush_failure_supply_no_admitted_reply(self):
        class FailedOutput:
            def __init__(self, stage):
                self.stage, self.pending, self.visible = stage, b'', b''
            def write(self, frame):
                if self.stage == 'write':
                    raise OSError('write failure')
                self.pending += frame
            def flush(self):
                raise OSError('withheld flush failure')
        for stage in ['write', 'flush']:
            backend, _, _ = self.backend()
            output = FailedOutput(stage)
            collector = self.collector(backend, output)
            with self.assertRaises(OSError):
                collector.handle(self.message(0, [OLD]))
            self.assertEqual(output.visible, b'')
            self.assertFalse(hasattr(collector, 'terminal'))

    def test_never_proven_permission_is_not_terminal(self):
        backend, _, phase = self.backend()
        phase['value'] = 1
        collector = self.collector(backend)
        with self.assertRaises(N.BackendError) as caught:
            collector.handle(self.message(0, [OLD]))
        self.assertEqual(caught.exception.reason, 'permission')
        self.assertEqual(collector.outstream.getvalue(), b'')

    def test_actual_signal_primitive_keeps_fresh_tuple_check_before_kill(self):
        order = []
        def info(pid, flavor, arg, pointer, size):
            order.append('bsd')
            row = S.bsd_struct(N, pid=101, sec=2, usec=0)
            ctypes.memmove(pointer, ctypes.byref(row), size)
            return size
        backend = N.Backend(self.forbidden, info, self.forbidden)
        with mock.patch.object(N.os, 'kill', side_effect=lambda *a: order.append('kill')):
            self.assertEqual(N.signal_identity(backend, NEW, 'TERM'), 'sent')
            self.assertEqual(order, ['bsd', 'kill'])
            order.clear()
            self.assertEqual(N.signal_identity(backend, OLD, 'TERM'), 'identity-changed')
            self.assertEqual(order, ['bsd'])

if __name__ == '__main__':
    unittest.main()
