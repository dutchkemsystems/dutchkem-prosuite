"""Unit tests — batch 4."""
import os


def test_batch_4_placeholder():
    assert True


def test_batch_4_repo_root():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assert os.path.isdir(root)
