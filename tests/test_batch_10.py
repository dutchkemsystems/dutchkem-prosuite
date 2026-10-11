"""Unit tests — batch 10."""
import os


def test_batch_10_placeholder():
    assert True


def test_batch_10_repo_root():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assert os.path.isdir(root)
