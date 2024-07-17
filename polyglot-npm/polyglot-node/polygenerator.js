/** @about Polygen 1.0.0 @min_zeppos 2.0 @author: Silver, Zepp Health. @license: MIT */
// npm install exceljs @google-cloud/translate node-fetch
const { Translate } = require('@google-cloud/translate').v2;
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const exceljs = require('exceljs');
const project_dir_path = process.cwd();
const trans_fpath_user = path.join(project_dir_path, "polyglot", "translations.xlsx");

const SHEET_SETTINGS = "settings";
const SHEET_KEYS = "keys";
const CELL_AUTOTRANSLATE = "B2";
const CELL_MAINLANG = "B3";
const CELL_GENERATEICON = "B4";
const CELL_ICONRES = "B5";
const CELL_CHARLIMIT = "B6";
const CELL_TRAILINGCHAR = "B7";
const CELL_APIKEY = "B8";

let is_icon_generated = false;

function backupTranslationsFile() {
    const backup_dirpath = path.join(project_dir_path, "polyglot", "backups");
    const timestamp = new Date().toISOString().replace(/[:.]/g, '_').slice(0, -8); // remove seconds
    const backup_fname = `translations_backup_${timestamp}.xlsx`;
    const backup_fpath = path.join(backup_dirpath, backup_fname);

    fs.mkdirSync(backup_dirpath, { recursive: true });
    fs.copyFileSync(path.join(project_dir_path, "polyglot", "translations.xlsx"), backup_fpath);
    console.log(`Created a translations.xlsx backup in ${backup_fpath}.`);
}

async function translateText(text, source, target, api_key) {
	console.log(`Translating ${text} from ${source} to ${target}`);
	try {
		let translations;
		if (api_key) {
			const gtranslate = new Translate({ key: api_key });
			[translations] = await gtranslate.translate(text, target);
		} else translations = [await gSingleTranslate(text, source, target)];

		return Array.isArray(translations) ? translations : [translations];
	} catch (error) {
		console.error('Error translating text:', error);
		return [];
	}
}

async function autoTranslate() {
	try {
		// backup
		backupTranslationsFile();

		const workbook = new exceljs.Workbook();
		await workbook.xlsx.readFile(trans_fpath_user);

		const settings_sheet = workbook.getWorksheet(SHEET_SETTINGS);
		if (!settings_sheet) {
			throw new Error('Settings sheet does not exist in the workbook.');
		}

		const autotranslate = settings_sheet.getCell(CELL_AUTOTRANSLATE).value;
		const mainlang = settings_sheet.getCell(CELL_MAINLANG).value.toString().trim();
		const apikey = settings_sheet.getCell(CELL_APIKEY).value;

		// skip if auto-translate is off
		if (autotranslate !== true && autotranslate !== 'TRUE') {
			console.log('Auto-translation is disabled');
			return;
		}

		const mainlang_sheet = workbook.getWorksheet(mainlang);
		if (!mainlang_sheet) {
			throw new Error(`The sheet for the main language (${mainlang}) does not exist. Create in in the translations.xlsx file.`);
		}

		const trans_promises_arr = [];
		workbook.eachSheet((sheet) => {
			if (!sheet.name.includes('-') || sheet.name === mainlang) {
				return;
			}

			sheet.eachRow((row, row_num) => {
				if (row_num === 1) return;

				const target_cell = row.getCell(2);

				// avoid overwriting cells with translations
				if (target_cell.value) {
					return;
				}

				const source_cell = mainlang_sheet.getRow(row_num).getCell(2);
				const source_text = source_cell.value;

				if (source_text) {
					const target_lang = sheet.name.replace('-', '_'); // prep gtrans
					trans_promises_arr.push(
						translateText(source_text, mainlang, target_lang, apikey)
							.then((translated_text) => {
								if (Array.isArray(translated_text) && translated_text.length > 0) {
									target_cell.value = translated_text[0];
								}
							})
							.catch((error) => {
								console.error(`Error translating row ${row_num} to ${target_lang}:`, error);
							})
					);
				}
			});
		});

		await Promise.all(trans_promises_arr);

		await workbook.xlsx.writeFile(trans_fpath_user);

		console.log('Auto-translation process complete.');
	} catch (error) {
		if (error.code === 'EBUSY') {
			throw new Error('The file "translations.xlsx" is currently open or locked. Please close the Excel file and try running the script again.');
		} else {
			console.error(error);
		}
	}
}

function ensureTranslationsDirectory(is_generateicon, icon_res) {
    const polyglot_dir = path.join(project_dir_path, 'assets', 'raw', 'polyglot');

    if (!fs.existsSync(polyglot_dir)) {
        fs.mkdirSync(polyglot_dir, { recursive: true });
    }

    if (!is_icon_generated && is_generateicon === "TRUE") {
        generateIcon(is_generateicon, icon_res, polyglot_dir);
        is_icon_generated = true;
    }

    const translations_dir = path.join(polyglot_dir, 'translations');
    if (!fs.existsSync(translations_dir)) {
        fs.mkdirSync(translations_dir, { recursive: true });
    }

    return translations_dir;
}

function generateIcon(is_generateicon, icon_res, polyglot_dir) {
	if (is_generateicon === "TRUE") {
		// state: normal
		const icon_fname = `poly-selector-${icon_res}px.png`;
		const icon_source_path = path.join(__dirname, 'icons', icon_fname);
		const icon_target_path = path.join(polyglot_dir, 'poly-selector.png');

		// state: pressed
		const icon_press_fname = `poly-selector-press-${icon_res}px.png`;
		const icon_press_source_path = path.join(__dirname, 'icons', icon_press_fname);
		const icon_press_target_path = path.join(polyglot_dir, 'poly-selector-press.png');

		if (fs.existsSync(icon_source_path)) {
			fs.copyFileSync(icon_source_path, icon_target_path);
			fs.copyFileSync(icon_press_source_path, icon_press_target_path);
			console.log(`Generated ${icon_res}px icons.`);
		} else {
			throw new Error(`Icon file with resolution ${icon_res}px not found.`);
		}
	}
}

async function gSingleTranslate(text, sourcelang, targetlang) {
	const base_url = 'https://translate.googleapis.com/translate_a/single?client=gtx';
	const url = `${base_url}&sl=${sourcelang}&tl=${targetlang}&dt=t&q=${encodeURI(text)}`;

	const parse = resp_text => JSON.parse(resp_text.split(',').map(item => item || 'null').join(','));
	const glue = parsed_resp => parsed_resp[0].map(item => item[0]).join('');

	try {
		const response = await fetch(url);
		const resp_text = await response.text();
		return glue(parse(resp_text));
	} catch (error) {
		console.error('GSingle Err: ', error);
	}
}

async function generateJsonFiles() {
	const app_json_path = path.join(project_dir_path, 'app.json');
	const app_json = JSON.parse(fs.readFileSync(app_json_path, 'utf8'));
	const targets = app_json.targets || {};

	const workbook = new exceljs.Workbook();
	await workbook.xlsx.readFile(trans_fpath_user);

	const settings_sheet = workbook.getWorksheet(SHEET_SETTINGS);
	const charlimit_cell = settings_sheet.getCell(CELL_CHARLIMIT);

	const char_limit = (charlimit_cell && charlimit_cell.value && charlimit_cell.value.toString().toUpperCase() !== 'FALSE')
		? parseInt(charlimit_cell.value, 10)
		: null;
	const trailingchar_cell = settings_sheet.getCell(CELL_TRAILINGCHAR);
	const LIMIT_CHAR = (trailingchar_cell && trailingchar_cell.value && trailingchar_cell.value !== 'FALSE') ? trailingchar_cell.value.toString() : "";

	const generateicon_cell = settings_sheet.getCell(CELL_GENERATEICON);
	const is_generateicon = (generateicon_cell && generateicon_cell.value) ? generateicon_cell.value.toString().toUpperCase() : 'FALSE';
	const iconres_cell = settings_sheet.getCell(CELL_ICONRES);
	const iconres = (iconres_cell && iconres_cell.value) ? iconres_cell.value : 64;

	const keys_sheet = workbook.getWorksheet(SHEET_KEYS);
	if (!keys_sheet) {
		throw new Error('Keys sheet does not exist in the workbook.');
	}

	const translations_dir = ensureTranslationsDirectory(is_generateicon, iconres);

	// rem all existing .json files in the translations_dir
	// making sure if the user removed some lang, the file will also be gone
	const files = fs.readdirSync(translations_dir);
	for (const file of files) {
		if (path.extname(file) === '.json') {
			fs.unlinkSync(path.join(translations_dir, file));
		}
	}

	workbook.eachSheet((sheet) => {
		if (!sheet.name.includes('-')) {
			return;
		}

		const translations = {};
		sheet.eachRow((row, row_num) => {
			if (row_num === 1) return;

			const key_ref = keys_sheet.getRow(row_num).getCell(1);
			let key = key_ref.value;

			const text_cell = row.getCell(2);
			let text = text_cell.type === exceljs.ValueType.Formula ? text_cell.result : text_cell.text;

			const manual_limit_cell = row.getCell(3);
			let manual_limit;

			if (manual_limit_cell && manual_limit_cell.value && parseInt(manual_limit_cell.value, 10) > 0) {
				manual_limit = parseInt(manual_limit_cell.value, 10);
			} else {
				manual_limit = char_limit;
			}

			if (manual_limit !== null && text.length > manual_limit) {
				text = text.substring(0, manual_limit - (LIMIT_CHAR.length > 0 ? 1 : 0));
				// append LIMIT_CHAR if not already present
				if (!text.endsWith(LIMIT_CHAR)) {
					text += LIMIT_CHAR;
				}
			}

			if (key)
				translations[key] = text;
		});

		const json_fname = `${sheet.name}.json`;
		const json_fpath = path.join(translations_dir, json_fname);
		const filtered_translations = Object.fromEntries(
			Object.entries(translations).filter(([key, _]) => key !== null && key !== '')
		);
		fs.writeFileSync(json_fpath, JSON.stringify(filtered_translations, null, 2), 'utf8');
	});

	console.log('JSON translation files generated.');
}

async function main() {
    try {
        await autoTranslate(project_dir_path);
        await generateJsonFiles(project_dir_path);
    } catch (error) {
        console.error('[polygen-err]:', error);
    }
}

main();

/**
* 1.0.0
* - initial release
*/