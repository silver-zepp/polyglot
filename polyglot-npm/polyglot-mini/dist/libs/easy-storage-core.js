/** @about Easy Storage: Core 1.0.0 @min_zeppos 2.0 @author: Silver, Zepp Health. @license: MIT */

import {
	statSync, readSync, readFileSync, writeFileSync, closeSync, openAssetsSync,
	mkdirSync, openSync, writeSync, rmSync, readdirSync, statAssetsSync,
	O_RDONLY, O_CREAT, O_WRONLY, O_RDWR, O_TRUNC,
} from "@zos/fs";

const VERSION = "1.0.0";
const DEBUG_LOG_LEVEL = 1;

/**
 * Storage: A utility library providing static methods for direct file operations,
 * including reading and writing JSON objects, text, and binary data.
 * */
export class Storage {
	/**
	 * Writes a JSON object to a specified file.
	 * @param {string} filename - The name of the file to write the JSON object to.
	 * @param {object} json - The JSON object to be written.
	 * @example
	 * ```js
	 * Storage.WriteJson('config.json', { key: 'value' });
	 * ```
	 */
	static WriteJson(filename, json) {
		saveJson(filename, json);
	}

	/**
	 * Reads a JSON object from a specified file.
	 * @param {string} filename - The name of the file to read the JSON object from.
	 * @return {object} The JSON object read from the file.
	 * @example
	 * ```js
	 * const config = Storage.ReadJson('config.json');
	 * ```
	 */
	static ReadJson(filename) {
		return loadJson(filename);
	}

	static ReadAssetFallback(filename, return_json = false) {
		return readAssetFallback(filename, return_json);
	}

	/**
	 * Writes data to a specified file.
	 * @param {string} filename - The name of the file to write data to.
	 * @param {string|ArrayBuffer} data - The data to be written.
	 * @example
	 * ```js
	 * Storage.WriteFile('example.txt', 'Hello, World!');
	 * ```
	 */
	static WriteFile(filename, data) {
		writeFile(filename, data);
	}

	/**
	 * Reads data from a specified file.
	 * @param {string} filename - The name of the file to read data from.
	 * @return {string} The data read from the file.
	 * @example
	 * ```js
	 * const data = Storage.ReadFile('example.txt');
	 * ```
	 */
	static ReadFile(filename) {
		return readFile(filename);
	}

	/**
	 * Removes a specified file from the filesystem.
	 * @param {string} filename - The name of the file to be removed.
	 * @example
	 * ```js
	 * Storage.RemoveFile('obsolete_data.txt');
	 * ```
	 */
	static RemoveFile(filename) {
		return removeFile(filename);
	}

	/**
	 * Writes data to a specified asset file.
	 * @param {string} filename - The name of the asset file to write data to.
	 * @param {string|ArrayBuffer} data - The data to be written.
	 * @example
	 * ```js
	 * Storage.WriteAsset('image.png', image_data);
	 * ```
	 */
	static WriteAsset(filename, data) {
		writeAsset(filename, data);
	}

	/**
	 * Reads data from a specified asset file.
	 * @param {string} filename - The name of the asset file to read data from.
	 * @return {string} The data read from the asset file.
	 * @example
	 * ```js
	 * const image = Storage.ReadAsset('image.png');
	 * ```
	 */
	static ReadAsset(filename) {
		return readAsset(filename);
	}

	// works as a fallback file/dir checker
	static AssetExists(filename) {
		return assetExists(filename);
	}

	/**
	 * Creates a new directory with the specified name. If the directory already exists, the behavior may depend on the underlying filesystem's implementation (it might throw an error or do nothing).
	 * @param {string} dirname - The name (and path) of the directory to create.
	 * @example
	 * ```js
	 * Storage.MakeDirectory('new_folder');
	 * ```
	 */
	static MakeDirectory(dirname) {
		return makeDirectory(dirname);
	}

	/**
	 * Lists all files and directories within the specified directory. This method is useful for retrieving the contents of a directory to process or display them, such as generating a list of available files or performing operations on each file.
	 * @param {string} dirname - The name (and path) of the directory whose contents are to be listed.
	 * @return {string[]} An array of names representing the contents of the directory. This may include both files and directories.
	 * @example
	 * ```js
	 * const contents = Storage.ListDirectory('documents');
	 * console.log(contents); // Outputs: ['file1.txt', 'file2.txt', 'subdirectory']
	 * ```
	 */
	static ListDirectory(dirname) {
		return listDirectory(dirname);
	}
}

// ================== UTILITIES ================== //

function openFile(path, flags) {
	try {
		return openSync({
			path,
			flag: flags,
		});
	} catch (error) {
		debugLog(1, `Failed to open file '${path}':`, error);
		return null;
	}
}

function writeFile(filename, data) {
	try {
		writeFileSync({
			path: filename,
			data: data, // directly use the string data; no need to convert to ab
			options: {
				encoding: "utf8", // specify encoding method for string data
			},
		});
		debugLog(3, `writeFileSync success, data written to '${filename}'`);
	} catch (error) {
		debugLog(1, `writeFileSync failed for '${filename}':`, error);
	}
}

function advancedWriteFile(filename, data, options = {}) {
	let fd = null;

	try {
		// determine the flags based on the provided options
		const flags = options.append ? O_RDWR | O_CREAT : O_WRONLY | O_CREAT;
		debugLog(3, `Opening file '${filename}' with flags:`, flags);

		fd = openFile(filename, flags);
		debugLog(3, `File opened with file descriptor: ${fd}`);

		let buffer;
		// convert to ab if needed
		if (typeof data === "string") {
			buffer = str2ab(data);
			debugLog(3, `Data converted to ArrayBuffer`);
		} else {
			buffer = data;
		}

		debugLog(3, `Buffer length: ${buffer.byteLength}`);

		// default options for writeSync
		const defaults = {
			offset: 0, // from the beginning
			length: buffer.byteLength,
			position: options.position !== undefined ? options.position : null, // allows for null (append mode) or specified position
		};

		debugLog(
			3,
			`Writing data with options: offset=${defaults.offset}, length=${defaults.length}, position=${defaults.position}`
		);

		const written = writeSync({
			fd,
			buffer,
			options: defaults,
		});

		debugLog(
			3,
			`Data successfully written to '${filename}', ${written} bytes written.`
		);
	} catch (error) {
		debugLog(1, `Failed to write to file '${filename}':`, error);
	} finally {
		// ensure fd is closed
		if (fd !== null) {
			closeSync(fd);
			debugLog(3, `File descriptor ${fd} closed.`);
		}
	}
}

function readFile(filename) {
	if (!dirOrFileExists(filename)) {
		debugLog(2, `File does not exist: ${filename}`);
		return ""; // null
	}

	const str_content = readFileSync({
		path: filename,
		options: {
			encoding: "utf8", // specify string encoding
		},
	});

	if (str_content === undefined) {
		debugLog(2, `Failed to read the file: ${filename}`);
		return ""; // return null
	} else {
		// successfully read the file as a string
		return str_content;
	}
}

function advancedReadFile(filename) {
	let fd = null;
	let file_content = "";

	try {
		fd = openFile(filename, O_RDONLY);
		debugLog(3, `File opened with file descriptor: ${fd}`);

		// determine the size of the file for buffer allocation
		const file_info = statSync({ path: filename });
		if (!file_info) {
			debugLog(2, `Failed to get file info: ${filename}`);
			return "";
		}
		const buffer_size = file_info.size;
		debugLog(3, `File size: ${buffer_size} bytes`);

		const buffer = new ArrayBuffer(buffer_size);

		// read into buf
		const bytes_read = readSync({
			fd,
			buffer,
			options: {
				length: buffer_size,
				position: null, // ... from the beginning of the file
			},
		});
		debugLog(3, `Bytes read: ${bytes_read}`);

		// ab to UTF8
		file_content = ab2str(buffer);
	} catch (error) {
		debugLog(1, `Failed to read file '${filename}':`, error);
		return "";
	} finally {
		// close
		if (fd !== null) {
			closeSync(fd);
			debugLog(3, `File descriptor ${fd} closed.`);
		}
	}

	return file_content;
}

function removeFile(filename) {
	try {
		rmSync({ path: filename });
		debugLog(3, `File removed successfully: '${filename}'`);
	} catch (error) {
		debugLog(1, `Failed to remove file '${filename}':`, error);
	}
}

function makeDirectory(directory) {
	try {
		mkdirSync({ path: directory });
		return true;
	} catch (error) {
		debugLog(1, `Error creating directory '${directory}':`, error);
		return false;
	}
}

function listDirectory(directory) {
	try {
		const files = readdirSync({ path: directory });
		return files;
	} catch (error) {
		debugLog(1, `Error listing directory contents for '${directory}':`, error);
		return [];
	}
}

function assetExists(path) {
	try {
		const result = statAssetsSync({ path });
		if (result) {
			// if result is not undefined, the file or directory exists.
			// note: for dird, the size is expected to be 0 bytes.
			debugLog(3, `Exists. Size: ${result.size} bytes`);
			return true;
		} else {
			return false;
		}
	} catch (error) {
		return false;
	}
}

// function dirOrFileExists(path) {
// 	try {
// 		statSync({ path: path });
// 		return true;
// 	} catch (error) {
// 		return false;
// 	}
// }
function dirOrFileExists(path) {
	try {
		const stats = statSync({ path: path });
		if (stats === undefined) {
			return false;
		}
		return true;
	} catch (error) {
		return false;
	}
}
// function dirOrFileExists(path) {
// 	try {
// 			const stats = statSync({ path: path });
// 			console.log("File size: " + stats.size);
// 			return stats && stats.size > 0;
// 	} catch (error) {
// 			return false;
// 	}
// }

function removeFileOrDir(path, is_recursive = false) {
	try {
		if (is_recursive) {
			let files = [];
			try {
				files = readdirSync({ path });
			} catch (error) { }

			if (files.length > 0) {
				// if we got here, it's a dir
				files.forEach((file) => {
					const full_path = `${path}/${file}`;
					removeFileOrDir(full_path, true); // continue recursion
				});
			}
			// rem the directory or file
			rmSync({ path });
			debugLog(3, `Removed successfully: '${path}'`);
		} else {
			// non-recursive, just remove
			rmSync({ path });
			debugLog(3, `Removed successfully: '${path}'`);
		}
	} catch (error) {
		debugLog(1, `Failed to remove '${path}':`, error);
	}
}

function makeNestedDirectory(directory_path) {
	const path_segments = directory_path.split("/");
	let cur_path = "";

	for (const segment of path_segments) {
		cur_path += `${segment}/`;
		if (!dirOrFileExists(cur_path)) {
			debugLog(3, `Creating directory: ${cur_path}`);
			mkdirSync({ path: cur_path });
		}
	}
}

function writeAsset(filename, data) {
	const buffer = str2ab(data);
	const file = openAssetsSync({ path: filename, flag: O_WRONLY | O_CREAT });
	const result = writeSync({
		fd: file,
		buffer: buffer,
		// other params: 'offset', 'length', 'position'
	});

	if (result >= 0) {
		debugLog(2, `writeSync success, wrote ${result} bytes`);
	} else {
		debugLog(1, "writeSync failed");
	}

	closeSync(file);
}

function readAsset(filename) {
	// check if the file exists and get its size
	const file_info = statSync({ path: filename });
	if (file_info) {
		// file exists, proceed to open
		const fd = openAssetsSync({ path: filename, flag: O_RDONLY });
		if (fd !== undefined) {
			const file_content_buff = new ArrayBuffer(file_info.size);
			const bytes_read = readSync({
				fd: fd,
				buffer: file_content_buff,
				offset: 0,
				length: file_info.size,
				position: null, // reading from current position
			});

			if (bytes_read > 0) {
				debugLog(2, `readSync success, read ${bytes_read} bytes`);
				// convert ab to str
				return ab2str(file_content_buff);
			} else {
				debugLog(1, "readSync failed or read 0 bytes");
			}

			// always ensure the file is closed
			closeSync(fd);
		} else {
			debugLog(1, "Failed to open file");
		}
	} else {
		debugLog(1, "File does not exist:", filename);
	}
	return null; // null if reading was unsuccessful
}

function saveJson(filename, json) {
	writeFile(filename, JSON.stringify(json));
}

function readAssetFallback(path, return_json = false) {
	const fd = openAssetsSync({ path, flag: O_RDONLY });
	if (!fd) {
		debugLog(1, 'Failed to open asset file:', path);
		return null;
	}

	const buf_size = 131072; // 128 KB
	const buffer = new ArrayBuffer(buf_size);
	const bytes_read = readSync({ fd, buffer });

	closeSync(fd);

	if (bytes_read > 0) {
		const view = new Uint8Array(buffer, 0, bytes_read);
		let content = utf8ArrayToStr(view); // decode UTF-8

		if (return_json) {
			try {
				const json = JSON.parse(content);
				return json;
			} catch (parse_err) {
				debugLog(1, 'Failed to parse JSON from asset file:', path, parse_err);
				return content;
			}
		} else {
			return content;
		}
	} else {
		debugLog(3, 'Failed to read from asset file:', path);
		return null;
	}
}

function loadJson(filename) {
	let json;
	try {
		const val = readFile(filename);
		if (val === "") {
			// readFile indicates the file doesn't exist
			return null;
		}
		json = JSON.parse(val);
	} catch {
		// invalid JSON or other errors
		return null;
	}
	return json;
}

// ================== HELPERS ================== //

function ab2str(buffer) {
	debugLog(3, `Converting buffer to str`);
	return String.fromCharCode.apply(null, new Uint8Array(buffer));
}

function str2ab(str) {
	var buf = new ArrayBuffer(str.length); // has to be switched back to 1 byte for each character for utf8 writeSync
	var buf_view = new Uint8Array(buf);
	for (var i = 0, strLen = str.length; i < strLen; i++) {
		buf_view[i] = str.charCodeAt(i);
	}
	return buf;
}

// let hex_string = "Hello World!".toHex();
// console.log(hex_string) // "48656c6c6f20576f726c6421"
String.prototype.toHex = function () {
	let result = "";
	for (let i = 0; i < this.length; i++) {
		result += this.codePointAt(i).toString(16);
	}
	return result;
};

// let hex_string = "48656c6c6f20576f726c6421";
// console.log(hex_string.fromHex()); // "Hello World!"
String.prototype.fromHex = function () {
	let hex_string = this.toString(); // ensure we have a string
	let result = "";
	for (let i = 0; i < hex_string.length; i += 2) {
		result += String.fromCodePoint(
			Number.parseInt(hex_string.substr(i, 2), 16)
		);
	}
	return result;
};

function logObject(obj, indent = "") {
	for (const [key, val] of Object.entries(obj)) {
		if (typeof val === "object" && val !== null) {
			console.log(`${indent}${key}:`);
			logObject(val, indent + "  "); // recursion until resolved
		} else {
			console.log(`${indent}${key}: ${val}`);
		}
	}
}

function utf8ArrayToStr(array) {
	var out, i, len, c;
	var char2, char3;

	out = "";
	len = array.length;
	i = 0;
	while (i < len) {
		c = array[i++];
		switch (c >> 4) {
			case 0x0: case 0x1: case 0x2: case 0x3: case 0x4: case 0x5: case 0x6: case 0x7:
				out += String.fromCharCode(c);
				break;
			case 0xC: case 0xD:
				char2 = array[i++];
				out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
				break;
			case 0xE:
				char2 = array[i++];
				char3 = array[i++];
				out += String.fromCharCode(((c & 0x0F) << 12) | ((char2 & 0x3F) << 6) | (char3 & 0x3F));
				break;
			case 0xF:
				i += 3;
				break;
		}
	}

	return out;
}

// debugLog v2.0
function debugLog(level, ...params) {
	if (level <= DEBUG_LOG_LEVEL) {
		const trunc_params = params.map((param) => {
			const MAX_ITEMS = 2;
			if (Array.isArray(param) && param.length > MAX_ITEMS) {
				return [...param.slice(0, MAX_ITEMS), " ...more"];
			} else {
				return param;
			}
		});
		console.log(`[storage v${VERSION}]`, ...trunc_params);
	}
}