const shell = require('shelljs');
const { execFileSync } = require('child_process'); // We use this as shelljs doesn't support interactive programs

function setupAntDesign(pm, extras = {}) {

  // Only for Angular
  if (extras.framework === 'Angular') {
    execFileSync('ng', ['add', 'ng-zorro-antd'], { stdio: 'inherit' }); 
    return;
  }

  // Everything else
  if (pm === 'Yarn') {
    shell.exec('yarn add antd');
    shell.exec('yarn add @ant-design/icons');
  } else {
    shell.exec('npm install --save antd');
    shell.exec('npm install --save @ant-design/icons');
  }
}

function setupBootstrap(pm, extras = {}) {
  // Only for Angular
  if (extras.framework === 'Angular') {
    execFileSync('ng', ['add', '@ng-bootstrap/ng-bootstrap'], { stdio: 'inherit' });
    return;
  }

  // Everything else
  if (pm === 'Yarn') {
    shell.exec('yarn add react-bootstrap bootstrap');
  } else {
    shell.exec('npm install --save react-bootstrap bootstrap');
  }
}

function setupTailwind(pm) {
  if (pm === 'Yarn') {
    shell.exec('yarn add -D tailwindcss postcss autoprefixer');
    shell.exec('yarn tailwindcss init -p');
  } else {
    shell.exec('npm install -D tailwindcss postcss autoprefixer');
    shell.exec('npx tailwindcss init -p');
  }
  var fs = require('fs')
  const someFile = `./tailwind.config.js`
  fs.readFile(someFile, 'utf8', function (err, data) {
    if (err) {
      return console.log(err);
    }
    var result = data.replace(/content: \[\]/g, "content: ['./src/**/*.{js,jsx,ts,tsx}']");
    fs.writeFile(someFile, result, 'utf8', function (err) {
      if (err) return console.log(err);
    });
  });
}

// export
module.exports = {
  setupAntDesign,
  setupBootstrap,
  setupTailwind,
};