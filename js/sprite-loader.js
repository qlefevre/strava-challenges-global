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
		this.loadedCallbacks = [];
	}

	/**
	 * Détermine quel sprite est nécessaire pour un challenge ID
	 * @param {number} challengeId - L'ID du challenge
	 * @returns {object|null} - L'objet sprite ou null
	 */
	getSpriteForChallenge(challengeId) {
		return this.sprites.find(sprite => 
			challengeId >= sprite.range[0] && challengeId < sprite.range[1]
		);
	}

	/**
	 * Vérifie si le sprite pour un challenge est chargé
	 * @param {number} challengeId - L'ID du challenge
	 * @returns {boolean} - true si le sprite est chargé
	 */
	isSpriteLodedForChallenge(challengeId) {
		const sprite = this.getSpriteForChallenge(challengeId);
		return sprite ? sprite.loaded : false;
	}

	/**
	 * Enregistre une fonction de rappel quand un sprite est chargé
	 * @param {function} callback - Fonction appelée avec le sprite chargé
	 */
	onSpriteLoaded(callback) {
		this.loadedCallbacks.push(callback);
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
			
			// Appeler tous les callbacks enregistrés
			this.loadedCallbacks.forEach(callback => {
				callback(sprite);
			});
		};

		link.onerror = () => {
			console.error(`✗ Erreur lors du chargement du sprite: ${sprite.name}`);
		};

		document.head.appendChild(link);
	}

	/**
	 * Charge un sprite spécifique (par nom ou par ID de challenge)
	 * @param {string|number} identifier - Le nom du sprite ou l'ID du challenge
	 */
	loadSpriteById(identifier) {
		let sprite;

		// Si c'est un nombre (challengeId)
		if (typeof identifier === 'number') {
			sprite = this.getSpriteForChallenge(identifier);
		} else {
			// Sinon, chercher par nom
			sprite = this.sprites.find(s => s.name === identifier);
		}

		if (sprite) {
			this.loadSprite(sprite);
		}
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
