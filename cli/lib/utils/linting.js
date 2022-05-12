const shell = require('shelljs');
const { execFileSync } = require('child_process'); // We use this as shelljs doesn't support interactive programs
const { updateProperty } = require('./package_json_manipulation');
const fs = require('fs');

function setupESLint(pm, extras = {}) {
  // Only for Angular
  if (extras.framework === 'Angular') {
    execFileSync('ng', ['add', '@angular-eslint/schematics'], { stdio: 'inherit' });
    return;
  }

  // Everything else
  if (pm === 'Yarn') {
    shell.exec('yarn add --dev eslint');
    execFileSync('yarn', ['run', 'eslint', '--init'], { stdio: 'inherit' });
  } else {
    shell.exec('npm install --save-dev eslint');
    execFileSync('npx', ['eslint', '--init'], { stdio: 'inherit' });
  }

  if (extras.framework === 'React') {
    const eslintConfig = fs.existsSync('.eslintrc.js') ? '.eslintrc.js' : fs.existsSync('.eslintrc.yaml') ? '.eslintrc.yaml' : fs.existsSync('.eslintrc.yml') ? '.eslintrc.yml' : fs.existsSync('.eslintrc.json') ? '.eslintrc.json' : null;

    updateProperty(eslintConfig, 'rules',
      `"react/jsx-filename-extension": [2, { "extensions": [".js", ".jsx", ".ts", ".tsx"] }]`
    );
  }
}

function setupPrettier(pm) {
  if (pm === 'Yarn') {
    shell.exec('yarn add --dev prettier');
    updateProperty('scripts.format', 'prettier --write "./**/*.{js,jsx,ts,tsx}"');
    updateProperty('scripts.lint', 'prettier --check "./**/*.{js,jsx,ts,tsx}"');
  } else {
    shell.exec('npm install --save-dev prettier');
    updateProperty('scripts.format', 'prettier --write "./**/*.{js,jsx,ts,tsx}"');
    updateProperty('scripts.lint', 'prettier --check "./**/*.{js,jsx,ts,tsx}"');
  }

  const fs = require('fs')

  const prc = '{}';
  const prtIgnore =
    `# Ignore all node_modules
node_modules/**

# Ignore artifacts:
build
coverage

# Ignore all HTML files:
*.html
  `

  fs.writeFileSync('.prettierrc.json', prc);
  fs.writeFileSync('.prettierignore', prtIgnore);

}


module.exports = {
  setupESLint,
  setupPrettier,
};