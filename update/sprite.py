#!/usr/bin/env python3
# pip install pillow requests
import os
import requests
import json
import argparse
import math
from PIL import Image
from io import BytesIO

# 1. Paramètres
json_url = "https://raw.githubusercontent.com/qlefevre/strava-challenges-global/main/challenges.json"
output_folder = "images"
thumb_size = (150, 150)

def parse_arguments():
    parser = argparse.ArgumentParser(description='Generate sprites from images.')
    parser.add_argument('--batch_size', type=int, default=400, help='Number of elements per batch (default: 500)')
    parser.add_argument('--offset', type=int, default=0, help='Offset for the batch (default: 0)')
    return parser.parse_args()

def main():
    args = parse_arguments()
    batch_size = args.batch_size
    offset = args.offset
    print(f" Offset {offset}, Batch size {batch_size}")

    # 2. Récupérer le JSON
    resp = requests.get(json_url)
    resp.raise_for_status()
    challenges = resp.json()

    print(f" {len(challenges)} URL(s) trouvée(s) dans le JSON")

    # 3. Extraire les URLs valides
    urls = [
        c["challengeLogoUrl"]
        for c in challenges
        if c.get("challengeLogoUrl")
    ]
    
    urls = urls[offset:(offset+batch_size)]
    print(f" {len(urls)} URL(s) trouvée(s) dans le JSON")
    
    urlsDistincts = list(dict.fromkeys(urls))  # supprime les doublons
    print(f" {len(urlsDistincts)} URL(s) unique(s) trouvée(s) dans le JSON")

    # 4. Créer le dossier de sortie
    os.makedirs(output_folder, exist_ok=True)

    # 5. Télécharger, redimensionner, stocker les fichiers locaux
    local_images = []
    for i, url in enumerate(urls):
        try:
            r = requests.get(url, timeout=10)
            r.raise_for_status()
            img = Image.open(BytesIO(r.content)).convert("RGBA")
            img = img.resize(thumb_size, Image.LANCZOS)
            filename = os.path.join(output_folder, f"img_{i:03d}.png")
            img.save(filename)
            local_images.append(filename)
            if i%50 == 0:print(f" {i} images téléchargées et redimensionnées.")
        except Exception as e:
            print(f" Échec url={url} → {e}")

    print(f" {len(local_images)} images téléchargées et redimensionnées.")

    # 6. Construire le sprite par batches
    batch_images = local_images

    # Calculer la taille du sprite pour ce batch
    batch_size_sqrt = math.isqrt(len(batch_images))
    if batch_size_sqrt * batch_size_sqrt < len(batch_images):
        batch_size_sqrt += 1

    sprite_width = thumb_size[0] * batch_size_sqrt
    sprite_height = thumb_size[1] * batch_size_sqrt
    sprite = Image.new("RGBA", (sprite_width, sprite_height))
    
    batch_sprite_image_name = f"challenges_{offset}_{offset + batch_size}.png"
    
    css_rules = []
    for idx, path in enumerate(batch_images):
        img = Image.open(path)
        x = (idx % int(len(batch_images) ** 0.5)) * thumb_size[0]
        y = (idx // int(len(batch_images) ** 0.5)) * thumb_size[1]
        sprite.paste(img, (x, y))
        rule = (
            f".challenge-idx-{offset + idx}, .challenge-{challenges[offset + idx]["challengeId"]} {{\n"
            f" width: {thumb_size[0]}px;\n"
            f" height: {thumb_size[1]}px;\n"
            f" background: url('../img/{batch_sprite_image_name}') -{x}px -{y}px;\n"
            "}"
        )
        css_rules.append(rule)

    
    sprite.save(os.path.join(output_folder, batch_sprite_image_name))
    print(f" Sprite généré : {batch_sprite_image_name}")

    # 7. Écrire le CSS pour ce batch
    batch_sprite_css_name = f"challenges_{offset}_{offset + batch_size}.css"
    with open(os.path.join(output_folder, batch_sprite_css_name), "w", encoding="utf-8") as f:
        f.write("\n\n".join(css_rules))

    print(f" CSS généré : {batch_sprite_css_name}")

    print(" Tout est prêt dans le dossier ‘images/’ !")

if __name__ == "__main__":
    main()