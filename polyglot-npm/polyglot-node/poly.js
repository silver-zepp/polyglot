#!/usr/bin/env node

const { program } = require('commander');
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const semver = require('semver');
const https = require('https');
const ExcelJS = require('exceljs');

const npmroot = "@silver-zepp";
const trans_fpath_global = path.join(__dirname, "translations.xlsx");
const project_dir_path = process.cwd();
const polygen_path = path.join(__dirname, 'polygenerator.js');
const global_poly_path = path.join(__dirname, '..'); 
const local_poly_path = path.join(project_dir_path, 'node_modules', npmroot, 'polyglot');

// scripts
function runInit() { // initialize project
    const poly_folder = path.join(project_dir_path, 'polyglot');
    if (!fs.existsSync(poly_folder)) {
        fs.mkdirSync(poly_folder);
    }

    // 1. COPY GLOBAL TRANSLATIONS
    // copy global translations.xlsx
    const translations_path = path.join(poly_folder, 'translations.xlsx');
    if (!fs.existsSync(translations_path)) {
        fs.copyFileSync(trans_fpath_global, translations_path);
    } else {
        console.log('Skipping copying the translations.xlsx. File already exists.');
    }

    // 2 & 3 UPDATE DEPENDENCIES & INSTALL POLY
    installLocalPoly();
}

function installLocalPoly(is_update = false){
    // 2. UPDATE DEPENDENCIES
    // read the global polyglot package.json to get the version number
    const global_package_json_path = path.join(global_poly_path, 'package.json');
    const global_package_json = fs.readJsonSync(global_package_json_path);
    const polyglot_version = `^${global_package_json.version}`;

    const project_package_json_path = path.join(project_dir_path, 'package.json');

    if (!fs.existsSync(project_package_json_path)) {
        createRootJSON(project_package_json_path, polyglot_version);
        // console.error('package.json not found in the project directory.');
        // process.exit(1);
    }

    const project_package_json = fs.readJsonSync(project_package_json_path);
    // inject devDependencies into project package.json
    // otherwise no autocompletion for "import { Polyglot } ..."
    project_package_json.dependencies = project_package_json.dependencies || {};
    project_package_json.dependencies[npmroot + "/polyglot"] = polyglot_version;

    fs.writeJsonSync(project_package_json_path, project_package_json, { spaces: 2 });

    // 3. INSTALL THE MINI APP MODULE
    // make sure local node_modules/.../polyglot exists
    if (!fs.existsSync(local_poly_path)) {
        fs.mkdirSync(local_poly_path, { recursive: true });
    }

    try {
        // copying mini app plugin
        const mini_app_source = path.join(global_poly_path, 'polyglot-mini');
        const mini_app_dest = path.join(local_poly_path);
        fs.cpSync(path.join(mini_app_source, 'dist'), path.join(mini_app_dest, 'dist'), { recursive: true });
        fs.cpSync(path.join(mini_app_source, 'ts'), path.join(mini_app_dest, 'ts'), { recursive: true });
        
        // sync version in mini app's package.json with system version
        const mini_package_json_path = path.join(mini_app_source, 'package.json');
        const mini_package_json = fs.readJsonSync(mini_package_json_path);
        mini_package_json.version = global_package_json.version; 
        fs.writeJsonSync(path.join(mini_app_dest, 'package.json'), mini_package_json, { spaces: 2 });        

        if (!is_update){
            console.log(`
                Successfully installed Polyglot into your project.
                
                Now you can:
                -------------------------------------------------------
                1) run \x1b[32mpoly trans\x1b[0m to setup your translations
                2) run \x1b[32mpoly gen\x1b[0m to generate translations
                3) import library into your project and start using it: 
                -------------------------------------------------------
                \x1b[32mimport { Polyglot } from "${npmroot}/polyglot";\x1b[0m
                \x1b[32mconst poly = new Polyglot();\x1b[0m
                \x1b[32mconsole.log(poly.getText("example"));\x1b[0m
                -------------------------------------------------------`
            );
        } else {
            console.log(`Successfully updated Polyglot to version \x1b[32m${global_package_json.version}\x1b[0m.`);
        }
    } catch (error) {
        console.error(`Failed to copy Polyglot to the project: ${error}`);
    }
}

function runGenerate() {
    exec(`node ${polygen_path}`, (error, stdout, stderr) => {
        if (error) {
            console.error(error);
            return;
        }
        if (stderr) {
            console.error(stderr);
            return;
        }
        console.log(stdout);
    });
}

function runTranslate() {
    const fpath = path.join(process.cwd(), 'polyglot', 'translations.xlsx');
    openFile(fpath);
}

function runBackups() {
    const backups_path = path.join(process.cwd(), 'polyglot', 'backups');
    openFile(backups_path);
}

async function runParse() {
    const app_json_path = path.join(project_dir_path, 'app.json');
    if (!fs.existsSync(app_json_path)) {
        console.error('You have to run this script from the root of your ZeppOS Mini App.');
        process.exit(1);
    }

    const app_json = fs.readJsonSync(app_json_path);
    const target = Object.keys(app_json.targets)[0];
    const pages = app_json.targets[target].module.page.pages;
    const page_folder = pages[0].split('/')[0];

    const i18n_dir_path = path.join(project_dir_path, page_folder, 'i18n');
    if (!fs.existsSync(i18n_dir_path)) {
        console.error('i18n folder not found in the specified page directory.');
        process.exit(1);
    }

    const workbook = new ExcelJS.Workbook();
    const po_files = fs.readdirSync(i18n_dir_path).filter(file => file.endsWith('.po'));

    for (const po of po_files) {
        const fpath = path.join(i18n_dir_path, po);
        const worksheet = workbook.addWorksheet(po.replace('.po', ''));
        worksheet.columns = [
            { header: 'KEY', key: 'msgid', width: 30 },
            { header: 'TEXT', key: 'msgstr', width: 30 },
        ];

        const file_content = fs.readFileSync(fpath, 'utf-8');
        const lines = file_content.split('\n');
        let cur_key = null;
        let cur_val = "";
        let is_msgstr = false;

        lines.forEach(line => {
            if (line.startsWith('msgid')) {
                if (cur_key !== null && cur_val !== "") {
                    worksheet.addRow({ msgid: cur_key, msgstr: cur_val });
                }
                cur_key = line.split('"')[1];
                cur_val = "";
                is_msgstr = false;
            } else if (line.startsWith('msgstr')) {
                cur_val = line.split('"')[1];
                is_msgstr = true;
            } else if (is_msgstr && line.startsWith('"')) {
                // handle multi-line msgstr values
                cur_val += line.slice(1, -1);
            }
        });

        if (cur_key !== null && cur_val !== "") {
            worksheet.addRow({ msgid: cur_key, msgstr: cur_val });
        }
    }

    const parsed_i18n_path = path.join(project_dir_path, 'polyglot', 'parsed_i8n.xlsx');
    await workbook.xlsx.writeFile(parsed_i18n_path);
    openFile(parsed_i18n_path);
}

// helpers
function openFile(full_path) {
    let cmd;

    if (process.platform === 'win32') {
        cmd = `start "" "${full_path}"`;
    } else if (process.platform === 'darwin') {
        cmd = `open "${full_path}"`;
    } else {
        cmd = `xdg-open "${full_path}"`;
    }

    exec(cmd, (error) => {
        if (error) {
            console.error(`Failed to open ${full_path}: ${error}`);
        }
    });
}

function isValidZeppOsRootDir() {
	const app_json = path.join(process.cwd(), 'app.json');
	const app_js = path.join(process.cwd(), 'app.js');

	return (fs.existsSync(app_json) && fs.existsSync(app_js));
}

function checkInitializationAndUpdate() {
    if (!isValidZeppOsRootDir()) {
        console.error('You have to run `poly` scripts from the root of your ZeppOS Mini App.');
        process.exit(1);
    }

    if (!fs.existsSync(path.join(project_dir_path, 'polyglot', 'translations.xlsx'))) {
        throw new Error('Polyglot has not been initialized. Please run "poly init" first.');
    }

    installLocalPoly(true);
}

function createRootJSON(project_package_json_path, polyglot_version){
    // create a basic package.json if it doesn't exist
    const basic_package_json = {
        name: 'auto-package',
        version: '1.0.0',
        description: '',
        main: 'app.js',
        author: '',
        license: 'ISC',
        dependencies: {
            [`${npmroot}/polyglot`]: polyglot_version,
        },
    };
    fs.writeJsonSync(project_package_json_path, basic_package_json, { spaces: 2 });
    console.log('Created package.json in the project directory.');
}

// commands
program
    .command('init')
    .description('Initialize Polyglot inside the project directory')
    .action(() => {
        if (!isValidZeppOsRootDir()) {
            console.error('You have to run `poly` scripts from the root of your ZeppOS Mini App.');
            process.exit(1);
        }
        runInit();
    });

program
    .command('gen')
    .description('Generate translation JSON files from the Excel sheet')
    .action(() => {
        checkInitializationAndUpdate();
        runGenerate();
    });

program
    .command('trans')
    .description('Open translations file for modification')
    .action(() => {
        checkInitializationAndUpdate();
        runTranslate();
    });

program
    .command('backups')
    .description('Open the backups directory')
    .action(() => {
        checkInitializationAndUpdate();
        runBackups();
    });

program
    .command('parse')
    .description('Parse .po files from i18n folder and generate an Excel file')
    .action(() => {
        checkInitializationAndUpdate();
        runParse();
    });

    program
    .command('version')
    .description('Display all Polyglot module versions')
    .action(() => {
        const local_package_json_path = path.join(local_poly_path, 'package.json');
        const global_package_json_path = path.join(global_poly_path, 'package.json');

        let system_version = '';
        if (fs.existsSync(global_package_json_path)) {
            const global_package_json = fs.readJsonSync(global_package_json_path);
            system_version = global_package_json.version;
            console.log(`System module version: \x1b[32m${system_version}\x1b[0m`);
        }

        if (fs.existsSync(local_package_json_path)) {
            const local_package_json = fs.readJsonSync(local_package_json_path);
            console.log(`Project module version: \x1b[32m${local_package_json.version}\x1b[0m`);
        }

        const npm_package_name = npmroot + "/polyglot";
        const options = {
            hostname: 'registry.npmjs.org',
            port: 443,
            path: `/${encodeURIComponent(npm_package_name)}`,
            method: 'GET'
        };

        https.request(options, res => {
            let raw_data = '';
            
            res.on('data', chunk => {
                raw_data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed_data = JSON.parse(raw_data);
                    const latest_ver = parsed_data['dist-tags'].latest;
                    console.log(`Online module version (latest): \x1b[32m${latest_ver}\x1b[0m`);

                    if (system_version && semver.lt(system_version, latest_ver)) {
                        console.log(`\n\x1b[33mConsider updating your Polyglot module to (\x1b[32mv${latest_ver}\x1b[33m) by running \x1b[32mnpm i ${npmroot}/polyglot -g\x1b[33m\x1b[0m`);
                    }
                } catch (e) {
                    console.error('Error parsing response from npm registry:', e.message);
                }
            });
        }).on('error', e => {
            console.error('Error fetching latest version from npm registry:', e.message);
        }).end();
    });

// help
program
    .command('help')
    .description('Display help information')
    .action(() => {
        program.help();
    });

program.parse(process.argv);

// show help if no arguments provided
if (!process.argv.slice(2).length) {
    program.help();
}

// @fix 1.0.2; now the auto update should properly work