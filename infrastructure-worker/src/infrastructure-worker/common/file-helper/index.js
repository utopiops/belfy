const fs = require('fs-extra');


exports.createFolderIfNotExists = async (path) => {
    if (this.folderExists(path)) {
        return false
    }
    await fs.ensureDir(path);
    return true;
}

exports.createFolder = async (path) => {
    return fs.ensureDir(path);
}

exports.folderExists = (path) => {
    return fs.existsSync(path);
}

exports.deleteFolder = async (path) => {
    if (fs.existsSync(path)) {
        await fs.emptyDir(path);
        return fs.rmdir(path);
    }
}

exports.copyFolder = async (src, dest) => {
    return fs.copy(src, dest);
}

exports.copyFile = async (src, dest) => {
    return fs.copy(src, dest);
}

exports.createFile = async (fileName, path) => {
    return fs.ensureFile(`${path}/${fileName}`);
}

exports.writeToFile = async (fileName, data, options = null) => {
    if (options && options.withMapping) {
        lines = '';
        data.forEach(line => {
            lines += `${line.key}=${line.value}\n`
        });
        return fs.writeFile(fileName, lines);
    } else {
        return fs.writeFile(fileName, data);
    }
}

exports.appendToFile = async (fileName, data) => {
    return fs.appendFile(fileName, '\n' + data + '\n');
}

exports.readFile = async (fileName) => {
    return fs.readFile(fileName, "utf8");
}