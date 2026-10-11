"""Unit tests — batch 2."""
import os


def test_batch_2_placeholder():
    assert True


def test_batch_2_repo_root():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assert os.path.isdir(root)
