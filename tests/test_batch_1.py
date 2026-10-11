"""Unit tests — batch 1."""
import os


def test_batch_1_placeholder():
    assert True


def test_batch_1_repo_root():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assert os.path.isdir(root)
