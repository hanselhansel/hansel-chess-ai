"""TEST-only path and PID-discovery case companion.

make_pid_path_cases(N, fake_be) and
make_discover_stability_cases(N, fake_be, bsd_struct) return unittest
classes against the ALREADY loaded native module and synthetic backend.
The frozen-sibling loader binds each class into process-macos.test.py
for the same -I -B discovery. Stdlib declarations only, with no real
libproc/CDLL/kill, production import or import-side test execution.
"""
import ctypes
import errno
import os
import unittest
from unittest import mock


def make_pid_path_cases(N, fake_be):
    """Build the PidPathTests class for the injected native module."""
    class PidPathTests(unittest.TestCase):
        def _pidpath(self, payload, nul_at_end=True, rc=None):
            def fn(pid, bufp, size):
                if rc is not None:
                    ctypes.set_errno(rc)
                    return -1
                data = payload + (b"\x00" if nul_at_end else b"")
                ctypes.memmove(bufp, data, len(data))
                ctypes.set_errno(0)
                return len(payload)

            return fn

        def test_gone_is_none(self):
            be = fake_be(pidpath=self._pidpath(b"", rc=errno.ESRCH))
            self.assertIsNone(N.pid_path(be, 4242))

        def test_full_count_rejected(self):
            def fn(pid, bufp, size):
                ctypes.set_errno(0)
                return size  # count reaches capacity -> short-read

            be = fake_be(pidpath=fn)
            with self.assertRaises(N.BackendError) as ctx:
                N.pid_path(be, 4242)
            self.assertEqual(ctx.exception.reason, "short-read")

        def test_nul_inside_payload_rejected(self):
            be = fake_be(pidpath=self._pidpath(b"/bin/\x00sh"))
            with self.assertRaises(N.BackendError) as ctx:
                N.pid_path(be, 4242)
            self.assertEqual(ctx.exception.reason,
                             "unclassifiable-process")

        def test_missing_terminator_rejected(self):
            def fn(pid, bufp, size):
                data = b"/bin/sh"
                ctypes.memmove(bufp, data + b"X", len(data) + 1)
                ctypes.set_errno(0)
                return len(data)

            be = fake_be(pidpath=fn)
            with self.assertRaises(N.BackendError):
                N.pid_path(be, 4242)

        def test_relative_path_rejected(self):
            be = fake_be(pidpath=self._pidpath(b"bin/sh"))
            with self.assertRaises(N.BackendError):
                N.pid_path(be, 4242)

        def test_absolute_path_accepted(self):
            be = fake_be(pidpath=self._pidpath(b"/bin/sh"))
            self.assertEqual(N.pid_path(be, 4242), "/bin/sh")

        def test_malformed_utf8_rejected(self):
            # A valid-length terminated path whose bytes are not UTF-8
            # must fail closed — surrogateescape must not smuggle it
            # into the evidence tuple.
            be = fake_be(pidpath=self._pidpath(b"/bin/\xffsh"))
            with self.assertRaises(N.BackendError) as ctx:
                N.pid_path(be, 4242)
            self.assertEqual(ctx.exception.reason,
                             "unclassifiable-process")

        def test_denied_path_is_permission(self):
            for rc in (errno.EPERM, errno.EACCES):
                be = fake_be(pidpath=self._pidpath(b"", rc=rc))
                with self.assertRaises(N.BackendError) as ctx:
                    N.pid_path(be, 4242)
                self.assertEqual(ctx.exception.reason, "permission")

        def test_utf8_multibyte_path_accepted(self):
            text = "/tmp/échec"
            be = fake_be(
                pidpath=self._pidpath(text.encode("utf-8")))
            self.assertEqual(N.pid_path(be, 4242), text)

    return PidPathTests


def make_discover_stability_cases(N, fake_be, bsd_struct):
    """Build discovery cases against the SAME loaded Native module."""
    class DiscoverStabilityTests(unittest.TestCase):
        def _backend(self, vectors, gone=(), wrong_uid=None):
            lists, rows = [], []

            def lp(flavor, uid, arr, nbytes):
                self.assertEqual((flavor, uid), (N.PROC_UID_ONLY, os.getuid()))
                self.assertLess(len(lists), len(vectors), "no extra PID read")
                vector = vectors[len(lists)]
                self.assertGreater(nbytes, len(vector) * 4)
                lists.append(list(vector))
                for index, pid in enumerate(vector):
                    arr[index] = pid
                return len(vector) * 4

            def info(pid, flavor, arg, bufp, size):
                self.assertEqual((flavor, arg, size), (N.PROC_PIDTBSDINFO, 0, 136))
                rows.append(pid)
                if pid in gone:
                    ctypes.set_errno(errno.ESRCH)
                    return -1
                uid = os.getuid() + 1 if pid == wrong_uid else os.getuid()
                row = bsd_struct(pid=pid, uid=uid)
                ctypes.memmove(bufp, ctypes.byref(row), size)
                ctypes.set_errno(0)
                return size

            return fake_be(pidinfo=info, listpids=lp), lists, rows

        def test_complete_first_vector_ignores_later_membership_changes(self):
            vectors = [[7, 9], [7, 11], [7, 13]]
            be, lists, rows = self._backend(vectors)
            with mock.patch.object(N, "list_process_pids",
                                   wraps=N.list_process_pids) as capture:
                result = N.discover(be)
            capture.assert_called_once_with(be)
            self.assertEqual(lists, vectors[:1])
            self.assertEqual(rows, vectors[0])
            self.assertEqual([r["identity"]["pid"] for r in result], vectors[0])

        def test_complete_first_vector_preserves_unsorted_order(self):
            vectors = [[11, 7, 9], [7, 9, 11]]
            be, lists, rows = self._backend(vectors)
            result = N.discover(be)
            self.assertEqual(lists, vectors[:1])
            self.assertEqual(rows, vectors[0])
            self.assertEqual([r["identity"]["pid"] for r in result], vectors[0])

        def test_duplicate_first_vector_rejects_before_row_reads(self):
            be, lists, rows = self._backend([[9, 9, 7]])
            with self.assertRaises(N.BackendError) as ctx:
                N.discover(be)
            self.assertEqual(ctx.exception.reason, "unstable-list")
            self.assertEqual(ctx.exception.detail, "duplicate pid")
            self.assertEqual(len(lists), 1)
            self.assertEqual(rows, [])

        def test_complete_first_vector_still_rejects_wrong_uid(self):
            be, lists, rows = self._backend([[11, 7]], wrong_uid=11)
            with self.assertRaises(N.BackendError) as ctx:
                N.discover(be)
            self.assertEqual(ctx.exception.reason, "uid-mismatch")
            self.assertEqual(len(lists), 1)
            self.assertEqual(rows, [11])

        def test_complete_first_vector_skips_esrch_in_observed_order(self):
            be, lists, rows = self._backend([[11, 7, 9]], gone=(7,))
            result = N.discover(be)
            self.assertEqual(len(lists), 1)
            self.assertEqual(rows, [11, 7, 9])
            self.assertEqual([r["identity"]["pid"] for r in result], [11, 9])

        def test_later_disjoint_vectors_do_not_invalidate_complete_capture(self):
            vectors = [list(range(i, i + 10)) for i in (1, 11, 21)]
            be, lists, rows = self._backend(vectors)
            result = N.discover(be)
            self.assertEqual(lists, vectors[:1])
            self.assertEqual(rows, vectors[0])
            self.assertEqual([r["identity"]["pid"] for r in result], vectors[0])

        def test_discover_keeps_buffer_retry_inside_one_helper_admission(self):
            be, lists, rows = self._backend([[11, 7]])
            calls = []

            def lp(flavor, uid, arr, nbytes):
                calls.append(nbytes)
                if len(calls) == 1:
                    return nbytes
                return be.listpids(flavor, uid, arr, nbytes)

            with mock.patch.object(N, "list_process_pids",
                                   wraps=N.list_process_pids) as capture:
                result = N.discover(fake_be(pidinfo=be.pidinfo, listpids=lp))
            self.assertEqual(capture.call_count, 1)
            self.assertEqual(len(calls), 2)
            self.assertGreater(calls[1], calls[0])
            self.assertEqual(lists, [[11, 7]])
            self.assertEqual(rows, [11, 7])
            self.assertEqual([r["identity"]["pid"] for r in result], [11, 7])

        def test_unaligned_byte_count_rejected(self):
            be = fake_be(listpids=lambda *a: 6)
            with self.assertRaises(N.BackendError) as ctx:
                N.list_process_pids(be)
            self.assertEqual(ctx.exception.reason, "unstable-list")

        def test_zero_result_with_errno_rejected(self):
            def lp(flavor, uid, arr, nbytes):
                ctypes.set_errno(errno.EIO)
                return 0

            be = fake_be(listpids=lp)
            with self.assertRaises(N.BackendError):
                N.list_process_pids(be)

        def test_duplicate_pids_rejected(self):
            def lp(flavor, uid, arr, nbytes):
                arr[0] = 7
                arr[1] = 7
                return 8

            be = fake_be(listpids=lp)
            with self.assertRaises(N.BackendError):
                N.list_process_pids(be)

    return DiscoverStabilityTests
