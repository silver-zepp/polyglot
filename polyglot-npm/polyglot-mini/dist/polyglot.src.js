/** @about Polyglot 1.0.2 @min_zeppos 2.0 @author: Silver, Zepp Health. @license: MIT */
import { getPackageInfo } from "@zos/app";
import { getLanguage } from "@zos/settings";
import { replace } from "@zos/router";
// poly switcher
import { getDeviceInfo, SCREEN_SHAPE_SQUARE } from "@zos/device";
import hmUI, { createWidget, widget, prop } from "@zos/ui";
import { px } from "@zos/utils";
import { getImageInfo } from "@zos/ui";
// swipe action support for language picker
import { onGesture, offGesture, GESTURE_RIGHT } from "@zos/interaction";
// internal deps
import { Storage } from "./libs/easy-storage-core";
import { debugLog, setupLogger } from "./libs/silver-log";
import { createPicker } from "./libs/silver-widgets";

const POLY_VERSION = "1.0.0";

setupLogger({
	prefix: "poly v" + POLY_VERSION,
	level: 1 // 1 = least noise, 3 = most noise
});

const app = getPackageInfo(); // app.version; // 1.0.0
const sys_lang_code = getLanguage(); // 0 = "zh-CN", 2 = "en-US", ...
const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT, screenShape: SCREEN_SHAPE } = getDeviceInfo();

// https://docs.zepp.com/docs/reference/related-resources/language-list/
const language_db = {
	0: { code: "zh-CN", name: "Chinese" },
	1: { code: "zh-TW", name: "Taiwanese" },
	2: { code: "en-US", name: "English" },
	3: { code: "es-ES", name: "Spanish" },
	4: { code: "ru-RU", name: "Russian" },
	5: { code: "ko-KR", name: "Korean" },
	6: { code: "fr-FR", name: "French" },
	7: { code: "de-DE", name: "German" },
	8: { code: "id-ID", name: "Indonesian" },
	9: { code: "pl-PL", name: "Polish" },
	10: { code: "it-IT", name: "Italian" },
	11: { code: "ja-JP", name: "Japanese" },
	12: { code: "th-TH", name: "Thai" },
	13: { code: "ar-EG", name: "Arabic" },
	14: { code: "vi-VN", name: "Vietnamese" },
	15: { code: "pt-PT", name: "Portuguese" },
	16: { code: "nl-NL", name: "Dutch" },
	17: { code: "tr-TR", name: "Turkish" },
	18: { code: "uk-UA", name: "Ukrainian" },
	19: { code: "iw-IL", name: "Hebrew" },
	20: { code: "pt-BR", name: "Portuguese" },
	21: { code: "ro-RO", name: "Romanian" },
	22: { code: "cs-CZ", name: "Czech" },
	23: { code: "el-GR", name: "Greek" },
	24: { code: "sr-RS", name: "Serbian" },
	25: { code: "ca-ES", name: "Catalan" },
	26: { code: "fi-FI", name: "Finnish" },
	27: { code: "nb-NO", name: "Norwegian" },
	28: { code: "da-DK", name: "Danish" },
	29: { code: "sv-SE", name: "Swedish" },
	30: { code: "hu-HU", name: "Hungarian" },
	31: { code: "ms-MY", name: "Malay" },
	32: { code: "sk-SK", name: "Slovak" },
	33: { code: "hi-IN", name: "Hindi" },
};

const lang_relatability = {
	0: 1,  // "zh-CN" -> "zh-TW"
	1: 0,  // "zh-TW" -> "zh-CN"
	15: 20, // "pt-PT" -> "pt-BR"
	20: 15, // "pt-BR" -> "pt-PT"
	18: 4,  // "uk-UA" -> "ru-RU"
};

/**
 * Polyglot is managing language settings and translations of the mini app.
 * It supports language switching, dynamic loading of translation files, and provides
 * UI elements for language selection.
 */
export class Polyglot {
	#texts = {};
	#language = "en-US";
	#poly_config = "poly_config.json";
	#polyroot_path = "assets://raw/polyglot";
	#translations_path = this.#polyroot_path + "/translations";
	#icon_normal_path = this.#polyroot_path + "/poly-selector.png";
	#icon_pressed_path = this.#polyroot_path + "/poly-selector-press.png";
	#icon_resolution = 64; // 32, 64, 128
	#btn_icon = null;
	#subscribers_arr = [];
	#languages_arr = [];
	#default_lang = app.defaultLanguage;
	// bugs bunny... workaround for assets:// bug on 2.1
	#is_using_fallback = false;

	/**
	 * Polyglot is managing language settings and translations of the mini app.
	 * It supports language switching, dynamic loading of translation files, and provides
	 * UI elements for language selection.
	 * 
	 * - Scans the specified translations path for available languages.
	 * - Loads saved language configuration if present, or sets the language based on system settings.
	 * - Loads the translations for the current language and sets up the icon based on the device image.
	 */
	constructor() {
		let should_recache = false;
		let files = [];

		const saved_poly_config = Storage.ReadJson(this.#poly_config) || {};

		if (!saved_poly_config.poly_version || saved_poly_config.poly_version !== POLY_VERSION || saved_poly_config.app_version !== app.version) {
			should_recache = true;
			saved_poly_config.poly_version = POLY_VERSION;
			saved_poly_config.app_version = app.version;
			debugLog(3, "Version mismatch detected or no saved config. Triggering recache.");
		}

		if (should_recache || !saved_poly_config.files) {
			files = Storage.ListDirectory(this.#translations_path) || [];
			if (!Array.isArray(files) || files.length === 0) {
				debugLog(3, "No files found or not an array. Using fallback.");
				this.#is_using_fallback = true;

				files = Object.values(language_db).map(lang => `${lang.code}.json`).filter(filename => {
					const fpath = `raw/polyglot/translations/${filename}`;
					return Storage.AssetExists(fpath);
				});
				debugLog(3, `Fallback files found: ${files.join(', ')}`);
			} else {
				this.#is_using_fallback = false;
				debugLog(3, `Files found in translations path: ${files.join(', ')}`);
			}
			saved_poly_config.files = files.map(file => file.replace('.json', ''));
			saved_poly_config.is_using_fallback = this.#is_using_fallback;
			Storage.WriteJson(this.#poly_config, saved_poly_config);
		} else {
			files = saved_poly_config.files.map(file => `${file}.json`);
			this.#is_using_fallback = saved_poly_config.is_using_fallback;
		}

		this.#languages_arr = saved_poly_config.files || [];
		debugLog(3, `Languages available: ${this.#languages_arr.join(', ')}`);

		const cur_sys_lang_code = this.getSysLangCode();
		debugLog(3, `System language code: ${cur_sys_lang_code}`);

		debugLog(3, `Checking if system language (${cur_sys_lang_code}) is in available languages: ${this.#languages_arr.includes(cur_sys_lang_code)}`);
		if (saved_poly_config.sys_lang_code && cur_sys_lang_code !== saved_poly_config.sys_lang_code) {
			if (this.#languages_arr.includes(cur_sys_lang_code)) {
				debugLog(3, `System language (${cur_sys_lang_code}) is directly supported. Setting it.`);
				this.setLanguage(cur_sys_lang_code);
			} else {
				debugLog(3, `System language (${cur_sys_lang_code}) not directly supported. Checking for related language.`);
				const related_lang_code = this.getRelatedLangCode(cur_sys_lang_code);
				debugLog(3, `Related language code determined as: ${related_lang_code}`);
				this.setLanguage(related_lang_code);
			}
		} else if (saved_poly_config.language && this.#languages_arr.includes(saved_poly_config.language)) {
			debugLog(3, `Using saved language: ${saved_poly_config.language}`);
			this.#language = saved_poly_config.language;
		} else {
			debugLog(3, `No saved language or system language not available. Checking for related or default language.`);
			const related_lang_code = this.getRelatedLangCode(cur_sys_lang_code);
			debugLog(3, `Related or default language determined as: ${related_lang_code}`);
			this.#language = related_lang_code;
		}

		try {
			this.#texts = this.#readJsonWithFallback(`${this.#translations_path}/${this.#language}.json`);
			debugLog(3, `Loaded texts for language: ${this.#language}`);
		} catch (err) {
			debugLog(3, `Error loading translations for language ${this.#language}:`, err);
			this.#language = this.#default_lang;
			this.#texts = {};
		}

		saved_poly_config.sys_lang_code = cur_sys_lang_code;
		saved_poly_config.language = this.#language;
		Storage.WriteJson(this.#poly_config, saved_poly_config);
		debugLog(3, `Updated saved config with current system language and language: ${JSON.stringify(saved_poly_config)}`);

		// set icon resolution from image
		const icon_path = this.#is_using_fallback ? `raw/polyglot/poly-selector.png` : this.#icon_normal_path;
		this.#setIconResolutionFromImage(icon_path);
	}

	/**
	 * Sets the current language for the application and loads the corresponding translation file.
	 * Optionally restarts the application if your app is short on memory.
	 *
	 * @param {string} language - The language code to switch to.
	 * @param {boolean} [restart_app=false] - Determines whether the application should restart after changing the language.
	 * @example
	 * // example: change the language to French
	 * poly.setLanguage("fr-FR");
	 *
	 * // advanced example: change the language to Japanese and restart the app
	 * poly.setLanguage("ja-JP", true);
	 */
	setLanguage(language, restart_app = false) {
		if (language !== this.#language) {
			const lang_entry = Object.values(language_db).find(lang => lang.code === language);

			if (lang_entry) {
				this.#language = lang_entry.code;
			} else {
				const related_lang_code = this.getRelatedLangCode(language);
				this.#language = related_lang_code || this.#default_lang;
			}

			try {
				this.#texts = this.#readJsonWithFallback(`${this.#translations_path}/${this.#language}.json`);

				Storage.WriteJson(this.#poly_config, { language: this.#language, sys_lang_code: this.getSysLangCode() });

				if (!restart_app) {
					this.#notifySubs();
				}
			} catch (err) {
				debugLog(1, "Error setting language or loading translations:", err);
			}

			if (restart_app) {
				this.#restartApp();
			}
		}
	}

	/**
	 * Sets the paths to the poly bubble icon for its normal and pressed states.
	 *
	 * @param {Object} paths - The paths to the icon image files.
	 * @param {string} paths.normal - The path to the normal icon image file.
	 * @param {string} paths.pressed - The path to the pressed icon image file.
	 * @example
	 * // example: set custom icons for poly bubble
	 * poly.setIconPath({
	 *   normal: "custom-lang-icon.png",
	 *   pressed: "custom-lang-icon-pressed.png"
	 * });
	 */
	setIconPath(paths) {
		this.#icon_normal_path = paths.normal;
		this.#icon_pressed_path = paths.pressed;
	}

	/**
	 * Retrieves the current language code.
	 *
	 * @returns {string} The current language code.
	 * @example
	 * // example: get the current language
	 * const cur_lang = poly.getLanguage();
	 * console.log(cur_lang); // "en-US"
	 */
	getLanguage() {
		return this.#language;
	}

	/**
	* Displays a language switcher button on the UI that allows the user to open the language picker.
	*
	* @param {Object} [options={}] - Optional settings to customize the language switcher appearance and behavior.
	* @param {string} [options.location="top-left"] - The location for the switcher icon on the screen. Supported values are "top-left", "top-right", "bot-left", and "bot-right". Ignored if `x` and `y` are specified.
	* @param {number} [options.padding_mult=2] - The multiplier for padding.
	* @param {number} [options.icon_size=64] - The size of the icon.
	* @param {number} [options.padding] - The padding around the icon. Defaults to 5% of the smallest screen dimension.
	* @param {number|null} [options.x=null] - The manual x-coordinate for the icon. Overrides `location`.
	* @param {number|null} [options.y=null] - The manual y-coordinate for the icon. Overrides `location`.
	* @param {number} [options.offset_x=0] - The horizontal offset to slightly tweak the icon position.
	* @param {number} [options.offset_y=0] - The vertical offset to slightly tweak the icon position.
	* @param {boolean} [options.restart_app=false] - Determines whether the mini app should restart after changing the language.
	* @example
	* // example: show language switcher at top-left with default options
	* poly.showPolyBubble();
	*
	* // advanced example: language switcher at the bottom-right with custom padding
	* poly.showPolyBubble({ location: "bot-right", padding_mult: 3 });
	*
	* // example with offset: slightly shift the icon position to the left and up
	* poly.showPolyBubble({
	*   offset_x: -20,
	*   offset_y: -20,
	* });
	*/
	showPolyBubble(options = {}) {
		const defaults = {
			location: "top-left", // will be ignored if x and y are specified
			padding_mult: 2,
			icon_size: this.#icon_resolution,
			padding: Math.round(Math.min(DEVICE_WIDTH, DEVICE_HEIGHT) * 0.05), // default padding set to 5%
			x: null,
			y: null,
			offset_x: 0,
			offset_y: 0,
			restart_app: false,
		};

		const { location, padding_mult, icon_size, padding, x, y, offset_x, offset_y, restart_app }
			= { ...defaults, ...options };

		const half_icon = icon_size / 2; // 50% icon size for centering

		let icon_x, icon_y;

		// use custom coords if provided
		if (x !== null && y !== null) {
			icon_x = x;
			icon_y = y;
		} else {
			// calc icon pos based on screen shape and picked location
			switch (location) {
				case "top-left":
					icon_x = SCREEN_SHAPE === SCREEN_SHAPE_SQUARE ? padding * padding_mult : padding * padding_mult + half_icon;
					icon_y = padding * padding_mult;
					break;
				case "top-right":
					icon_x = SCREEN_SHAPE === SCREEN_SHAPE_SQUARE ? DEVICE_WIDTH - icon_size - padding * padding_mult : DEVICE_WIDTH - icon_size - padding * padding_mult - half_icon;
					icon_y = padding * padding_mult;
					break;
				case "bot-left":
					icon_x = SCREEN_SHAPE === SCREEN_SHAPE_SQUARE ? padding * padding_mult : padding * padding_mult + half_icon;
					icon_y = DEVICE_HEIGHT - icon_size - padding * padding_mult;
					break;
				case "bot-right":
					icon_x = SCREEN_SHAPE === SCREEN_SHAPE_SQUARE ? DEVICE_WIDTH - icon_size - padding * padding_mult : DEVICE_WIDTH - icon_size - padding * padding_mult - half_icon;
					icon_y = DEVICE_HEIGHT - icon_size - padding * padding_mult;
					break;
			}
		}

		icon_x += offset_x;
		icon_y += offset_y;

		this.#btn_icon = createWidget(widget.BUTTON, {
			x: px(icon_x),
			y: px(icon_y),
			w: px(icon_size),
			h: px(icon_size),
			normal_src: "raw/polyglot/poly-selector.png",//this.#icon_path,
			press_src: "raw/polyglot/poly-selector-press.png", //this.#icon_pressed_path,
			click_func: () => {
				this.showLangPicker({ restart_app: restart_app });
			}
		});
	}

	/**
	 * Hides and removes the language switcher button from the UI.
	 * @example
	 * // example: hide the language switcher
	 * poly.hidePolyBubble();
	 */
	hidePolyBubble() {
		hmUI.deleteWidget(this.#btn_icon);
	}

	/**
	 * Displays a picker UI for the user to select a language from the available options.
	 * 
	 * @param {Object} [options={}] - Optional settings to customize the language switcher appearance and behavior. 
	 * @param {boolean} [options.restart_app=false] - Determines whether the mini app should restart after changing the language.
	 * @example
	 * // example: show the language picker
	 * poly.showLangPicker();
	 * // advanced example: restart the mini app after new language selection
	 * poly.showLangPicker({ restart_app: true });
	 */
	showLangPicker(options = {}) {
		const inverted_language_db = Object.values(language_db).reduce((acc, { code, name }) => {
			acc[code] = name;
			return acc;
		}, {});

		const sorted_lang_entries = this.#languages_arr
			.map(code => {
				const name = inverted_language_db[code] || code;
				return { code, name };
			})
			.sort((a, b) => a.name.localeCompare(b.name));

		const lang_names = sorted_lang_entries.map(entry => entry.name);
		const lang_codes = sorted_lang_entries.map(entry => entry.code);
		const cur_lang_index = lang_codes.indexOf(this.#language);

		const picker = createPicker({
			data_array: lang_names,
			selected_index: cur_lang_index,
			use_rotation_algo: true,
			onItemPress: (widget_type, index, label) => {
				const selected_language_code = lang_codes[index];
				this.setLanguage(selected_language_code, options.restart_app);
				picker.remove();
				offGesture(); // unreg gesture
			},
			onItemFocusChange: (list, index, focus) => {
				// ...
			}
		});

		const cb_gesture = (event) => {
			if (event === GESTURE_RIGHT) {
				picker.remove();
				offGesture();
				return true; // prevent default gesture behavior
			}
			return false; // otherwise -> allow it
		};

		onGesture({ callback: cb_gesture });
	}

	/**
	 * Retrieves the current resolution of the language switcher icon.
	 *
	 * @returns {number} The current icon resolution.
	 * @example
	 * // example: get the current icon resolution
	 * const icon_res = poly.getIconResolution();
	 * console.log(icon_res); // 64
	 */
	getIconResolution() {
		return this.#icon_resolution;
	}

	/**
	 * Gets the display name of the current language based on its code.
	 *
	 * @returns {string|undefined} The display name of the language, or undefined if not found.
	 * @example
	 * // example: get the display name of the current language
	 * const lang_name = poly.getLangDisplayName();
	 * console.log(lang_name); // "English"
	 */
	getLangDisplayName() {
		const lang_entry = Object.values(language_db).find(lang => lang.code === this.#language);
		return lang_entry ? lang_entry.name : undefined;
	}

	/**
	 * Retrieves the system language name based on the system language code.
	 *
	 * @returns {string|undefined} The name of the system language, or undefined if not found.
	 * @example
	 * // example: get the system language name
	 * const sys_lang_name = poly.getSysLangName();
	 * console.log(sys_lang_name); // "English"
	 */
	getSysLangName() {
		return language_db[sys_lang_code]?.name;
	}

	/**
	 * Retrieves the system language code.
	 *
	 * @returns {string|undefined} The system language code, or undefined if not found.
	 * @example
	 * // example: get the system language code
	 * const sys_lang_code = poly.getSysLangCode();
	 * console.log(sys_lang_code); // "en-US"
	 */
	getSysLangCode() {
		return language_db[sys_lang_code]?.code;
	}

	/**
	 * Gets the related language code based on language relatability mapping.
	 * If no related language is found, the default mini app language is returned.
	 *
	 * @param {string} language - The language code for which to find the related language.
	 * @returns {string} The code of the related language or the default language if no related language is found.
	 * @example
	 * // example: get the related language code for Taiwanese
	 * const rel_lang_code = poly.getRelatedLangCode("zh-TW");
	 * console.log(rel_lang_code); // "zh-CN". Chinese will be returned as a closest match.
	 */
	getRelatedLangCode(language) {
		if (this.#languages_arr.includes(language)) {
			debugLog(3, `Original language (${language}) is supported. No need to find a related language.`);
			return language;
		}

		const lang_code_key = Object.keys(language_db).find(key => language_db[key].code === language);
		const rel_code = lang_relatability[lang_code_key];
		const rel_lang_code = rel_code !== undefined ? language_db[rel_code].code : this.#default_lang;
		debugLog(3, `Calculated related language code for (${language}) as: ${rel_lang_code}`);
		return rel_lang_code;
	}

	/**
	 * Retrieves the translation text for a given key in the current language.
	 *
	 * @param {string} key - The key for the translation entry.
	 * @returns {string} The translation text for the given key.
	 * @example
	 * // example: get translation for the "hello" key
	 * const greeting_text = poly.getText("hello");
	 * console.log(greeting_text); // "Hello there!"
	 */
	getText(key) {
		return this.#texts[key] || `"${key}"\nnot found`;
	}

	/**
	 * Retrieves all translation texts for the current language.
	 *
	 * @returns {Object} An object containing all translation texts with their corresponding keys.
	 * @example
	 * // example: get all texts for the current language
	 * const all_texts = poly.getAllTexts();
	 * console.log(all_texts); // { greeting: "Hello there!", goodbye: "Goodbye!", ... }
	 */
	getAllTexts() {
		return this.#texts;
	}

	/**
	 * Gets a list of supported language codes based on the available translations.
	 *
	 * @returns {string[]} An array of supported language codes.
	 * @example
	 * // example: get all supported languages
	 * const supported_languages = poly.getSupportedLanguages();
	 * console.log(supported_languages); // ["en-US", "fr-FR", "ja-JP", ...]
	 */
	getSupportedLanguages() {
		return this.#languages_arr;
	}

	/**
	 * Retrieves a list of available translations for a specific key across all supported languages.
	 *
	 * @param {string} key - The key for which to find translations.
	 * @returns {Object[]} An array of objects containing the language code and the corresponding translation text for the given key.
	 * @example
	 * // example: get all translations for the "greeting" key
	 * const available_translations = poly.getAvailableTranslationsForKey("greeting");
	 * console.log(available_translations); // [{ lang_code: "en-US", text: "Hello" }, { lang_code: "fr-FR", text: "Bonjour" }, ...]
	 */
	getAvailableTranslationsForKey(key) {
		return this.#languages_arr
			.map(lang_code => {
				const texts = this.#readJsonWithFallback(`${this.#translations_path}/${lang_code}.json`);
				return { lang_code: lang_code, text: texts[key] };
			})
			.filter(item => item.text !== undefined);
	}

	/**
	 * Registers a callback function to be invoked when the language changes.
	 * The callback receives the new language code and the updated texts object.
	 *
	 * @param {function(string, Object)} subscriber - The callback function to call on language changes.
	 * @example
	 * // example: subscribe to language changes
	 * poly.onLanguageChange((language, texts) => {
	 *   console.log(`Language changed to ${language}. Updated texts:`, texts);
	 * });
	 */
	onLanguageChange(subscriber) {
		this.#subscribers_arr.push(subscriber);
	}

	/**
	 * Checks if a given language code is supported by the application.
	 *
	 * @param {string} language_code - The language code to check.
	 * @returns {boolean} true if the language is supported, false otherwise.
	 * @example
	 * // example: check if French is supported
	 * const is_supported = poly.isLanguageSupported("fr-FR");
	 * console.log(is_supported); // true or false
	 */
	isLanguageSupported(language_code) {
		return this.#languages_arr.includes(language_code);
	}

	#notifySubs() {
		this.#subscribers_arr.forEach(sub => sub(this.#language, this.#texts));
	}

	#restartApp() {
		replace({ url: app.pages[0] });
	}

	#setIconResolutionFromImage(img_path) {
		try {
			const img_info = getImageInfo(img_path);
			this.#icon_resolution = img_info.width;
		} catch (err) {
			this.#icon_resolution = 64;
			debugLog(1, `Failed to get icon resolution: ${err}`);
		}
	}

	#readJsonWithFallback(path) {
		if (this.#is_using_fallback) {
			const modified_path = path.replace("assets://", "");
			return Storage.ReadAssetFallback(modified_path, true);
		} else {
			return Storage.ReadJson(path);
		}
	}
}

/**
* 1.0.0
* - initial release
* 1.0.2
* - @add swipe-exit guesture support for showLangPicker()
* - @add library minification
*/