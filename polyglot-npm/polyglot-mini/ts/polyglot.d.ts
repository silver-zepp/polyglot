/**
 * Polyglot is managing language settings and translations of the mini app.
 * It supports language switching, dynamic loading of translation files, and provides
 * UI elements for language selection.
 */
export class Polyglot {
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
    setLanguage(language: string, restart_app?: boolean): void;
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
    setIconPath(paths: {
        normal: string;
        pressed: string;
    }): void;
    /**
     * Retrieves the current language code.
     *
     * @returns {string} The current language code.
     * @example
     * // example: get the current language
     * const cur_lang = poly.getLanguage();
     * console.log(cur_lang); // "en-US"
     */
    getLanguage(): string;
    /**
    * Displays a language switcher button on the UI that allows the user to open the language picker.
    *
    * @param {Object} [options={}] - Optional settings to customize the language switcher appearance and behavior.
    * @param {string} [options.location="top-left"] - The location for the switcher icon on the screen. Ignored if `x` and `y` are specified.
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
    showPolyBubble(options?: {
        location?: string;
        padding_mult?: number;
        icon_size?: number;
        padding?: number;
        x?: number | null;
        y?: number | null;
        offset_x?: number;
        offset_y?: number;
        restart_app?: boolean;
    }): void;
    /**
     * Hides and removes the language switcher button from the UI.
     * @example
     * // example: hide the language switcher
     * poly.hidePolyBubble();
     */
    hidePolyBubble(): void;
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
    showLangPicker(options?: {
        restart_app?: boolean;
    }): void;
    /**
     * Retrieves the current resolution of the language switcher icon.
     *
     * @returns {number} The current icon resolution.
     * @example
     * // example: get the current icon resolution
     * const icon_res = poly.getIconResolution();
     * console.log(icon_res); // 64
     */
    getIconResolution(): number;
    /**
     * Gets the display name of the current language based on its code.
     *
     * @returns {string|undefined} The display name of the language, or undefined if not found.
     * @example
     * // example: get the display name of the current language
     * const lang_name = poly.getLangDisplayName();
     * console.log(lang_name); // "English"
     */
    getLangDisplayName(): string | undefined;
    /**
     * Retrieves the system language name based on the system language code.
     *
     * @returns {string|undefined} The name of the system language, or undefined if not found.
     * @example
     * // example: get the system language name
     * const sys_lang_name = poly.getSysLangName();
     * console.log(sys_lang_name); // "English"
     */
    getSysLangName(): string | undefined;
    /**
     * Retrieves the system language code.
     *
     * @returns {string|undefined} The system language code, or undefined if not found.
     * @example
     * // example: get the system language code
     * const sys_lang_code = poly.getSysLangCode();
     * console.log(sys_lang_code); // "en-US"
     */
    getSysLangCode(): string | undefined;
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
    getRelatedLangCode(language: string): string;
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
    getText(key: string): string;
    /**
     * Retrieves all translation texts for the current language.
     *
     * @returns {Object} An object containing all translation texts with their corresponding keys.
     * @example
     * // example: get all texts for the current language
     * const all_texts = poly.getAllTexts();
     * console.log(all_texts); // { greeting: "Hello there!", goodbye: "Goodbye!", ... }
     */
    getAllTexts(): any;
    /**
     * Gets a list of supported language codes based on the available translations.
     *
     * @returns {string[]} An array of supported language codes.
     * @example
     * // example: get all supported languages
     * const supported_languages = poly.getSupportedLanguages();
     * console.log(supported_languages); // ["en-US", "fr-FR", "ja-JP", ...]
     */
    getSupportedLanguages(): string[];
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
    getAvailableTranslationsForKey(key: string): any[];
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
    onLanguageChange(subscriber: (arg0: string, arg1: any) => any): void;
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
    isLanguageSupported(language_code: string): boolean;
    #private;
}
