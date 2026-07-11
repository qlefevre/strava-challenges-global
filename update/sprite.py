#!/usr/bin/env python3
# pip install pillow requests
import os
import requests
import json
import argparse
import math
from PIL import Image
from io import BytesIO

# 1. Paramètres de configuration
# Le script récupère le fichier JSON des challenges depuis GitHub,
# télécharge ensuite les images des logos, les redimensionne et les assemble
# dans un sprite CSS pour l’affichage des miniatures.
json_url = "https://raw.githubusercontent.com/qlefevre/strava-challenges-global/main/challenges.json"
output_folder = "images"
thumb_size = (150, 150)

# Clubs à exclure du traitement :
# - 231407 : Filtrage Club Strava
# - 886292 : Filtrage Team Runna
excluded_club_ids = {231407, 886292}

def parse_arguments():
    # Lecture des paramètres en ligne de commande pour permettre un traitement
    # par lots et un décalage éventuel sur les éléments du JSON.
    parser = argparse.ArgumentParser(description='Generate sprites from images.')
    parser.add_argument('--batch_size', type=int, default=400, help='Number of elements per batch (default: 500)')
    parser.add_argument('--offset', type=int, default=0, help='Offset for the batch (default: 0)')
    return parser.parse_args()

def main():
    # Début du traitement principal.
    args = parse_arguments()
    batch_size = args.batch_size
    offset = args.offset
    print(f" Offset {offset}, Batch size {batch_size}")

    # 2. Récupérer le JSON de référence des challenges.
    # On récupère la liste complète pour connaitre les URLs des logos et
    # associer chaque logo à son identifiant de challenge.
    resp = requests.get(json_url)
    resp.raise_for_status()
    challenges = resp.json()

    # Filtrer les challenges issus des clubs exclus.
    # Cela permet d’éliminer les entrées relevant du Club Strava et du Team Runna
    # avant de construire les miniatures du sprite.
    challenges = [
        challenge for challenge in challenges
        if challenge.get("clubId") not in excluded_club_ids
    ]

    print(f" {len(challenges)} challenge(s) restant(s) après filtrage")

    # 3. Extraire les URLs de logo valides depuis le JSON filtré.
    # Les logos sont stockés dans le champ challengeLogoUrl de chaque entrée.
    urls = [
        c["challengeLogoUrl"]
        for c in challenges
        if c.get("challengeLogoUrl")
    ]
    
    urls = urls[offset:(offset+batch_size)]
    print(f" {len(urls)} URL(s) trouvée(s) dans le JSON")
    
    urlsDistincts = list(dict.fromkeys(urls))  # supprime les doublons
    print(f" {len(urlsDistincts)} URL(s) unique(s) trouvée(s) dans le JSON")

    # 4. Créer le dossier de sortie qui recevra les images et les fichiers
    # générés par le script (sprite PNG et feuille CSS associée).
    os.makedirs(output_folder, exist_ok=True)

    # 5. Télécharger, redimensionner puis enregistrer les images locales.
    # Chaque image est adaptée à la taille de miniature définie dans
    # thumb_size afin d’être ensuite utilisée dans le sprite final.
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

    # 6. Construire le sprite pour ce lot de données.
    # On conserve simplement les images déjà téléchargées et on calcule la
    # grille de placement la plus compacte possible dans le sprite final.
    batch_images = local_images

    # Calculer la taille du sprite pour ce batch.
    # On utilise une grille carrée pour avoir une composition régulière.
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

    # 7. Générer le CSS associé à ce sprite.
    # Chaque règle décrit une miniature avec sa position dans le sprite PNG.
    batch_sprite_css_name = f"challenges_{offset}_{offset + batch_size}.css"
    with open(os.path.join(output_folder, batch_sprite_css_name), "w", encoding="utf-8") as f:
        f.write("\n\n".join(css_rules))

    print(f" CSS généré : {batch_sprite_css_name}")

    print(" Tout est prêt dans le dossier ‘images/’ !")

if __name__ == "__main__":
    main()