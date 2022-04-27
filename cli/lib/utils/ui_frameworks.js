const shell = require('shelljs');

function setupAntDesign(pm) {
  if (pm === 'Yarn') {
    shell.exec('yarn add antd');
    shell.exec('yarn add @ant-design/icons');
  } else {
    shell.exec('npm install --save antd');
    shell.exec('npm install --save @ant-design/icons');
  }
}

function setupBootstrap(pm) {
  if (pm === 'Yarn') {
    shell.exec('yarn add react-bootstrap bootstrap');
  } else {
    shell.exec('npm install --save react-bootstrap bootstrap');
  }
}

// export
module.exports = {
  setupAntDesign,
  setupBootstrap
};