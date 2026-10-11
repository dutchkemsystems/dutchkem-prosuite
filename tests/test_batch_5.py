"""Unit tests — batch 5."""
import os


def test_batch_5_placeholder():
    assert True


def test_batch_5_repo_root():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assert os.path.isdir(root)
