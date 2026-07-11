/**
 * Gestionnaire de chargement progressif des sprites CSS
 * Permet de charger les feuilles CSS des sprites et de tracker leur état
 */

class SpriteLoader {
	constructor() {
		this.sprites = [];
		// on a maintenant une grille couvrant
		// les batches de 0 à 2400 avec un pas de 100, chargée de 2400 vers 0.
		// Exemple de génération : challenges_2400_2500.css, ..., challenges_0_100.css
		for (let start = 2400; start >= 0; start -= 100) {
			const end = start + 100;
			this.sprites.push({
				name: `challenges_${start}_${end}`,
				url: `css/challenges_${start}_${end}.css`,
				range: [start, end],
				loaded: false
			});
		}
	}

	/**
	 * Lance le chargement progressif de tous les sprites
	 * Charge les sprites de manière séquentielle pour optimiser les performances
	 */
	loadSpritesProgressively() {
		// Charger les sprites dans l'ordre pour les afficher progressivement
		this.sprites.forEach((sprite, index) => {
			// Ajouter un délai progressif pour éviter de surcharger le réseau
			setTimeout(() => {
				this.loadSprite(sprite);
			}, index * 300);
		});
	}

	/**
	 * Charge un sprite CSS spécifique
	 * @param {object} sprite - L'objet sprite à charger
	 */
	loadSprite(sprite) {
		// Vérifier si le sprite n'est pas déjà chargé
		if (sprite.loaded) return;

		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = sprite.url;

		link.onload = () => {
			sprite.loaded = true;
			console.log(`✓ Sprite chargé: ${sprite.name}`);
			
			// Retirer la classe display-none de tous les éléments concernés
			const elements = document.querySelectorAll(`.sprite-${sprite.name}`);
			elements.forEach(el => {
				el.classList.remove('sprite-hidden');
			});
		};

		link.onerror = () => {
			console.error(`✗ Erreur lors du chargement du sprite: ${sprite.name}`);
		};

		document.head.appendChild(link);
	}
}

// Exporter le singleton
window.spriteLoader = new SpriteLoader();
