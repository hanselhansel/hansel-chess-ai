"""Test-only pid_path case companion for process-macos.test.py.

`make_pid_path_cases(N, fake_be)` returns the PidPathTests
unittest class built against the ALREADY loaded native module `N` and
the main suite's fake backend constructor `fake_be` — the
frozen-sibling loader binds it back into the -I -B suite's globals for
discovery. Stdlib only; no production import, CDLL, os.kill or import
side effect.
"""
import ctypes
import errno
import unittest


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
