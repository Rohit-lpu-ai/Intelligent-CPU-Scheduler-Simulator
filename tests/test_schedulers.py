import pytest
import sys
sys.path.insert(0, '/app')

from app import fcfs, sjf, srtf, rr, priority_np, pp, mlfq, calc_metrics

class TestFCFS:
    def test_fcfs_basic(self):
        """Test FCFS with simple process set"""
        procs = [
            {'id': 1, 'at': 0, 'bt': 5, 'pr': 1},
            {'id': 2, 'at': 1, 'bt': 3, 'pr': 1}
        ]
        log, res = fcfs(procs)
        assert res[1]['ct'] == 5
        assert res[2]['ct'] == 8
        assert res[1]['wt'] == 0
        assert res[2]['wt'] == 4
        assert res[1]['tat'] == 5
        assert res[2]['tat'] == 7

    def test_fcfs_empty(self):
        """Test FCFS with empty process list"""
        log, res = fcfs([])
        assert log == []
        assert res == {}

    def test_fcfs_single(self):
        """Test FCFS with single process"""
        procs = [{'id': 1, 'at': 0, 'bt': 5, 'pr': 1}]
        log, res = fcfs(procs)
        assert res[1]['ct'] == 5
        assert res[1]['wt'] == 0

class TestSJF:
    def test_sjf_basic(self):
        """Test SJF with simple process set"""
        procs = [
            {'id': 1, 'at': 0, 'bt': 5, 'pr': 1},
            {'id': 2, 'at': 0, 'bt': 3, 'pr': 1}
        ]
        log, res = sjf(procs)
        assert res[2]['ct'] == 3
        assert res[1]['ct'] == 8
        assert res[1]['wt'] == 3
        assert res[2]['wt'] == 0

    def test_sjf_empty(self):
        """Test SJF with empty process list"""
        log, res = sjf([])
        assert log == []
        assert res == {}

class TestSRTF:
    def test_srtf_preemption(self):
        """Test SRTF with preemption scenario"""
        procs = [
            {'id': 1, 'at': 0, 'bt': 5, 'pr': 1},
            {'id': 2, 'at': 1, 'bt': 2, 'pr': 1}
        ]
        log, res = srtf(procs)
        assert res[2]['ct'] == 3
        assert res[1]['ct'] == 7

    def test_srtf_empty(self):
        """Test SRTF with empty process list"""
        log, res = srtf([])
        assert log == []
        assert res == {}

class TestRoundRobin:
    def test_rr_quantum4(self):
        """Test Round Robin with quantum 4"""
        procs = [{'id': 1, 'at': 0, 'bt': 4, 'pr': 1}]
        log, res = rr(procs, 4)
        assert res[1]['ct'] == 4

    def test_rr_multiple_contexts(self):
        """Test Round Robin with context switching"""
        procs = [
            {'id': 1, 'at': 0, 'bt': 8, 'pr': 1},
            {'id': 2, 'at': 0, 'bt': 8, 'pr': 1}
        ]
        log, res = rr(procs, 4)
        assert res[1]['ct'] > 0
        assert res[2]['ct'] > 0

    def test_rr_empty(self):
        """Test Round Robin with empty process list"""
        log, res = rr([], 4)
        assert log == []
        assert res == {}

    def test_rr_zero_quantum(self):
        """Test Round Robin with zero quantum"""
        procs = [{'id': 1, 'at': 0, 'bt': 4, 'pr': 1}]
        log, res = rr(procs, 0)
        assert log == []
        assert res == {}

class TestPriority:
    def test_priority_basic(self):
        """Test non-preemptive priority scheduling"""
        procs = [
            {'id': 1, 'at': 0, 'bt': 3, 'pr': 2},
            {'id': 2, 'at': 0, 'bt': 3, 'pr': 1}
        ]
        log, res = priority_np(procs)
        assert res[2]['ct'] == 3
        assert res[1]['ct'] == 6

    def test_priority_empty(self):
        """Test priority scheduling with empty process list"""
        log, res = priority_np([])
        assert log == []
        assert res == {}

class TestPreemptivePriority:
    def test_pp_basic(self):
        """Test preemptive priority scheduling"""
        procs = [
            {'id': 1, 'at': 0, 'bt': 3, 'pr': 1},
            {'id': 2, 'at': 1, 'bt': 2, 'pr': 2}
        ]
        log, res = pp(procs)
        assert res[1]['ct'] > 0
        assert res[2]['ct'] > 0

    def test_pp_empty(self):
        """Test preemptive priority with empty process list"""
        log, res = pp([])
        assert log == []
        assert res == {}

class TestMLFQ:
    def test_mlfq_basic(self):
        """Test MLFQ with simple process set"""
        procs = [{'id': 1, 'at': 0, 'bt': 5, 'pr': 1}]
        log, res = mlfq(procs)
        assert res[1]['ct'] == 5

    def test_mlfq_multiple(self):
        """Test MLFQ with multiple processes"""
        procs = [
            {'id': 1, 'at': 0, 'bt': 3, 'pr': 1},
            {'id': 2, 'at': 1, 'bt': 2, 'pr': 1}
        ]
        log, res = mlfq(procs)
        assert res[1]['ct'] > 0
        assert res[2]['ct'] > 0

    def test_mlfq_empty(self):
        """Test MLFQ with empty process list"""
        log, res = mlfq([])
        assert log == []
        assert res == {}

class TestMetrics:
    def test_metrics_calculation(self):
        """Test metrics calculation"""
        procs = [
            {'id': 1, 'at': 0, 'bt': 5},
            {'id': 2, 'at': 0, 'bt': 3}
        ]
        res = {
            1: {'wt': 0, 'tat': 5, 'ct': 5},
            2: {'wt': 5, 'tat': 8, 'ct': 8}
        }
        metrics = calc_metrics(res, procs)
        assert metrics['avg_tat'] == 6.5
        assert metrics['avg_wt'] == 2.5
        assert metrics['cpu'] > 0
        assert metrics['tp'] > 0

    def test_metrics_empty(self):
        """Test metrics calculation with empty lists"""
        metrics = calc_metrics({}, [])
        assert metrics['avg_wt'] == 0
        assert metrics['avg_tat'] == 0
        assert metrics['cpu'] == 0
        assert metrics['tp'] == 0

    def test_metrics_single(self):
        """Test metrics calculation with single process"""
        procs = [{'id': 1, 'at': 0, 'bt': 5}]
        res = {1: {'wt': 0, 'tat': 5, 'ct': 5}}
        metrics = calc_metrics(res, procs)
        assert metrics['avg_tat'] == 5.0
        assert metrics['avg_wt'] == 0.0

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
