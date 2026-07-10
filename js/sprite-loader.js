/**
 * Gestionnaire de chargement progressif des sprites CSS
 * Permet de charger les feuilles CSS des sprites et de tracker leur état
 */

class SpriteLoader {
	constructor() {
		this.sprites = [
			{
				name: 'challenges_0_625',
				url: 'css/challenges_0_625.css',
				range: [0, 625],
				loaded: false
			},
			{
				name: 'challenges_625_1250',
				url: 'css/challenges_625_1250.css',
				range: [625, 1250],
				loaded: false
			},
			{
				name: 'challenges_1250_1779',
				url: 'css/challenges_1250_1779.css',
				range: [1250, 1779],
				loaded: false
			}
		];
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
			}, index * 100);
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

	/**
	 * Retourne l'état de chargement de tous les sprites
	 * @returns {object} - Objet avec les états de chargement
	 */
	getStatus() {
		return this.sprites.map(sprite => ({
			name: sprite.name,
			loaded: sprite.loaded,
			range: sprite.range
		}));
	}

	/**
	 * Retourne true si tous les sprites sont chargés
	 * @returns {boolean}
	 */
	areAllSpritesLoaded() {
		return this.sprites.every(sprite => sprite.loaded);
	}
}

// Exporter le singleton
window.spriteLoader = new SpriteLoader();
