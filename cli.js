const { readdirSync, statSync, readFileSync } = require('fs')
const { join } = require('path')
const { generate } = require('make-editorconfig')
const program = require('commander')
const match = require('minimatch')
const { writeFileSync } = require('fs')

program
	.version('0.0.1')
	.usage('[options] <directory>')
	.option(
		'-i, --ignore <glob>,[<glob>...]',
		'Ignore glob(s)',
		(val, memo) => (memo.push(...val.split(',')), memo),
		[]
	)
	.option('-o, --output <file>', 'Redirect output')
	.parse(process.argv)

const flatten = arr =>
	arr.reduce(
		(arr, val) => arr.concat(Array.isArray(val) ? flatten(val) : val),
		[]
	)

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
				nodes.push({ path: childPath, content })
			} else if (stats.isDirectory(childPath))
				nodes.push({ path: childPath, content: null }, ...walk(childPath))
			else throw new Error('no idea how to handle file' + childPath)
		})
		return nodes
	}
	return generate(
		flatten([paths.map(walk), paths.map(path => ({ path, content: null }))]),
		ignore
	)
}

const config = constructTreeFromDirectory(program.args, program.ignore)

if (program.output) {
	writeFileSync(program.output, config)
} else {
	console.log(config)
}
