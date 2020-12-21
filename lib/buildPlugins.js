#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');
const os = require('os');

const Git = require("nodegit");

const recipeDir = path.join(__dirname, '..', "recipes");
const pluginDir = path.join(__dirname, '..', "plugins", "pub");
const tiddlerDir = path.join(__dirname, '..', "tiddlers", "plugins");

const isJSONFile = dirent => {
	return dirent.isFile() && path.extname(dirent.name).toLowerCase() === ".json";
};

/**
 * Return all plugins to be built from the recipes/ directory.
 */
const recipes = () => {
	let entries = fs.readdirSync(recipeDir, {withFileTypes: true});
	return entries
		.filter(isJSONFile)
		.map(dirent => path.join(recipeDir, dirent.name))
		.map(p => fs.readFileSync(p))
		.map(JSON.parse);
};

const checkRecipe = (recipe) => {
	if (!recipe.repository) {
		throw new Error("Missing recipe repository");
	}

	if (!recipe.name) {
		throw new Error("Missing recipe name");
	}

	if (!recipe.pluginPath) {
		throw new Error("Missing recipe pluginPath");
	}
};

/**
 * Clone & build `recipe`, then install it in the `pluginDir` folder.
 */
const buildRecipe = (recipe, callback) => {
	try {
		console.log("\x1b[36m%s\x1b[0m", `Building recipe ${recipe.repository}...`);
		checkRecipe(recipe);

		clonePlugin(recipe.repository, recipe.name, (dir) => {
			installPlugin(dir, recipe.name, recipe.pluginPath);
			buildPluginTiddler(dir, recipe.name);
			cleanup(dir);
			console.log("  => Done!\n");
			callback();
		});
	} catch(e) {
		console.error(`Recipe ${recipe.repository} failed!`);
		console.error(e);
	}
};

/**
 * Build all recipes sequentially.
 */
const buildRecipes = (recipes) => {
	if (recipes.length) {
		buildRecipe(
			recipes[0],
			() => buildRecipes(recipes.slice(1))
		);
	}
};

/**
 * Clone a git the repository of a plugin and checkout its latest tag.
 */
const clonePlugin = (repository, name, callback) => {
	let tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `npl-${name}-`));
	Git.Clone(repository, tmpDir).then(repo => {
		getLatestTag(repo, (tag) => {
			Git.Checkout.head(repo, tag).then(() => {
				console.log(`  => Checked out tag ${tag} in ${tmpDir}`);
				callback(tmpDir);
			});
		});
	});
};

const getLatestTag = (repo, callback) => {
	Git.Tag.list(repo).then((array) => {
		if (!array.length) {
			throw new Error("No tag found in repository");
		}
		let tag = array[array.length - 1];
		console.log(`  => Latest tag in repository: ${tag}`);
		callback(tag);
	});
};

const installPlugin = (dir, name, pluginPath) => {
	let src = path.join(dir, pluginPath);
	let dest = path.join(pluginDir, name);
	fs.copySync(src, dest);
	console.log(`  => Installed plugin in ${dest}`);
};

const buildPluginTiddler = (dir, name) => {
	console.log("  => Building plugin tiddler from README");
	let readme = findReadme(dir);

	if(!readme) {
		console.warn("  x No README file found in the repository!");
		return;
	}

	let contents = fs.readFileSync(path.join(dir, readme.name));

	fs.writeFileSync(
		path.join(tiddlerDir, `${name}.tid`),
		buildTiddlerReadme(name, contents)
	);
};

const buildTiddlerReadme = (name, contents) => {
	return `title: ${name} plugin
tags: npl-plugin
type: text/x-markdown

${contents}
`;
};

const findReadme = (dir) => {
	let filenames = ["readme.md", "readme.txt", "readme"];
	let entries = fs.readdirSync(dir, {withFileTypes: true});
	return entries.find(entry => filenames.includes(entry.name.toLowerCase()));
};

/**
 * Recursive delete of `dir`.
 */
const cleanup = (dir) => {
	try {
		fs.rmdirSync(dir, { recursive: true });
		console.log("  => Removed temporary clone directory");
	} catch (e) {
		console.error(`Error while deleting ${dir}.`);
	}
};

/**
 * Preliminary setup before installing plugins.
 */
const setup = () => {
	let plugins = fs.readdirSync(pluginDir, {withFileTypes: true});
	plugins.forEach(dirent => {
		if(dirent.isDirectory()) {
			fs.rmdirSync(
				path.join(pluginDir, dirent.name),
				{ recursive: true }
			);
		}
	});

	fs.rmdirSync(tiddlerDir, { recursive: true });
	fs.mkdirSync(tiddlerDir);
};

const build = () => {
	setup();
	buildRecipes(recipes());
};

build();
