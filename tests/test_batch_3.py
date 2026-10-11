"""Unit tests — batch 3."""
import os


def test_batch_3_placeholder():
    assert True


def test_batch_3_repo_root():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assert os.path.isdir(root)
