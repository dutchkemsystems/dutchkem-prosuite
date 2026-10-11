"""Unit tests — batch 8."""
import os


def test_batch_8_placeholder():
    assert True


def test_batch_8_repo_root():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assert os.path.isdir(root)
