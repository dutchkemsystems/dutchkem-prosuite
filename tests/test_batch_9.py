"""Unit tests — batch 9."""
import os


def test_batch_9_placeholder():
    assert True


def test_batch_9_repo_root():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assert os.path.isdir(root)
