#!/usr/bin/env node

const { readdirSync, statSync, readFileSync } = require('fs')
const { join } = require('path')
const {
	generateConfig,
	printAttributes,
	constructTree,
} = require('make-editorconfig')
const program = require('commander')
const match = require('minimatch')
const { writeFileSync } = require('fs')

const VERSION = '0.0.1'

program
	.version(VERSION)
	.usage('[options] <directory>')
	.option(
		'-i, --ignore <glob>,[<glob>...]',
		'ignore glob(s)',
		(val, memo) => (memo.push(...val.split(',')), memo),
		[]
	)
	.option('-d, --debug', 'print debug output')
	.option('-o, --output <file>', 'redirect output')
	.option('-e, --extension', 'merge by file extension')
	.parse(process.argv)

const flatten = arr =>
	arr.reduce(
		(arr, val) => arr.concat(Array.isArray(val) ? flatten(val) : val),
		[]
	)

const isBinary = content =>
	content && content.indexOf && content.indexOf('\0') > -1

const constructTreeFromDirectory = (paths, ignore = []) => {
	const walk = path => {
		const nodes = []
		const files = readdirSync(path)
		files.forEach(file => {
			if (ignore.some(i => match(file, i))) return
			const childPath = join(path, file)
			const stats = statSync(childPath)
			if (stats.isFile(childPath)) {
				const content = readFileSync(childPath).toString()
				if (isBinary(content)) return
				nodes.push({ path: childPath, content })
			} else if (stats.isDirectory(childPath)) {
				const children = walk(childPath)
				if (children.length > 0)
					nodes.push({ path: childPath, content: null }, ...children)
			} else throw new Error('no idea how to handle file' + childPath)
		})
		return nodes
	}
	return constructTree(flatten(paths.map(walk)), ignore)
}

if (program.args.length === 0) program.help()

if (program.debug) {
	console.log(`ignoring ${program.ignore}`)
	console.log(`output goes to ${program.output ? program.output : '$stdin'}`)
}

const tree = constructTreeFromDirectory(program.args, program.ignore)

if (program.debug) {
	console.log('dirty tree dump:')
	printAttributes(tree, 1)
	console.log('\n')
}

tree.mergeAttributes(true)

if (program.debug) {
	console.log('merged tree dump:')
	printAttributes(tree, 1)
	console.log('\n')
}

tree.clean()

if (program.debug) {
	console.log('clean tree dump:')
	printAttributes(tree, 1)
}

const config =
	`# make-editorconfig-cli v${VERSION}\n# github.com/fvj/make-editorconfig-cli\n\n` +
	generateConfig(tree, program.ignore)

if (program.output) {
	writeFileSync(program.output, config)
} else {
	console.log(config)
}
