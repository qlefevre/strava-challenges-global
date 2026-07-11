#!/bin/bash
for offset in {0..2400..100}; do
    echo "Exécution : python3 sprite.py --offset $offset --batch_size 100"
    python3 sprite.py --offset $offset --batch_size 100
done