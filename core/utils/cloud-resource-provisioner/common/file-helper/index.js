const fs = require('fs-extra');

exports.createFolder = async (path) => {
    return fs.ensureDir(path);
}

exports.copyFolder = async (src, dest) => {
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
    return fs.appendFile(fileName, data);
}

exports.readFile = async (fileName) => {
    return fs.readFile(fileName, "utf8");
}