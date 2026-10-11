"""Unit tests — batch 6."""
import os


def test_batch_6_placeholder():
    assert True


def test_batch_6_repo_root():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assert os.path.isdir(root)
