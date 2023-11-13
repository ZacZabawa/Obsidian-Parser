const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const matter = require('gray-matter');

const notesDirectory = 'C:/Users/zzaba/Obsidian/test/zabauhaus'; // Update this path
const flatOutputFile = 'C:/Users/zzaba/collusion/notes_flat.json';
const hierarchicalOutputFile = 'C:/Users/zzaba/collusion/notes_hierarchical.json';

function extractFrontMatterFromDirectory(directory) {
  const notes = [];

  fs.readdirSync(directory).forEach((file) => {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      notes.push(...extractFrontMatterFromDirectory(fullPath)); // Recursively process subdirectories
    } else if (path.extname(file) === '.md') {
      const rawContent = fs.readFileSync(fullPath, 'utf-8');
      const parsedContent = matter(rawContent);
      notes.push(parsedContent.data);
    }
  });

  return notes;
}

function createHierarchicalStructure(notes) {
    const hierarchy = [];
  
    // Find the organizations
    const organizations = notes.filter(note => note.type === 'organization');
    organizations.forEach(organization => {
      organization.functions = notes.filter(note => note.type === 'function' && note.graph === organization.graph);
      organization.functions.forEach(func => {
        func.projects = notes.filter(note => note.type === 'project' && note.function === func.title);
      });
  
      // Find projects that don't have a matching function and add them to the organization
      const functionTitles = organization.functions.map(func => func.title);
      const unmatchedProjects = notes.filter(note => note.type === 'project' && !functionTitles.includes(note.function));
      unmatchedProjects.forEach(project => {
        // Add a new function for the unmatched project
        organization.functions.push({
          type: 'function',
          title: project.function,
          projects: [project]
        });
      });
  
      hierarchy.push(organization);
    });
  
    return hierarchy;
  }

function extractFrontMatter() {
  const notes = extractFrontMatterFromDirectory(notesDirectory);
  fs.writeFileSync(flatOutputFile, JSON.stringify(notes, null, 2));
  console.log(`Updated ${flatOutputFile} at ${new Date().toISOString()}`);

  const hierarchicalNotes = createHierarchicalStructure(notes);
  fs.writeFileSync(hierarchicalOutputFile, JSON.stringify(hierarchicalNotes, null, 2));
  console.log(`Updated ${hierarchicalOutputFile} at ${new Date().toISOString()}`);
}

// Initial extraction
extractFrontMatter();

// Watch for changes
const watcher = chokidar.watch(notesDirectory, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  depth: 99, // This will ensure it checks subdirectories up to 99 levels deep. Adjust if needed.
});

watcher
  .on('add', extractFrontMatter)
  .on('change', extractFrontMatter)
  .on('unlink', extractFrontMatter);

console.log(`Watching for changes in ${notesDirectory}...`);