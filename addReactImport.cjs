const fs = require('fs');
const path = require('path');

// Directory to start searching
const srcDir = path.join(__dirname, 'src');

// Function to recursively get all .tsx files in a directory
function getAllTsxFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);

    if (stat && stat.isDirectory()) {
      // Recursively get files from subdirectories
      results = results.concat(getAllTsxFiles(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });

  return results;
}

// Function to add import line if it doesn't exist
function addReactImport(file) {
  const content = fs.readFileSync(file, 'utf8');

  if (!content.includes("import React from 'react';")) {
    const newContent = `import React from 'react';\n${content}`;
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated: ${file}`);
  }
}

// Get all .tsx files in the src directory
const tsxFiles = getAllTsxFiles(srcDir);

// Add the import line to each file
tsxFiles.forEach(addReactImport);

console.log('Completed updating .tsx files.');
