"""Unit tests — batch 7."""
import os


def test_batch_7_placeholder():
    assert True


def test_batch_7_repo_root():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assert os.path.isdir(root)
