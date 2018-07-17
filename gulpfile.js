const gulp = require('gulp');
const noop = require('gulp-noop');
const ts = require('gulp-typescript');
const watch = require('gulp-watch');
const less = require('gulp-less');
const uglifyes = require('uglify-es');
const composer = require('gulp-uglify/composer');
const uglify = composer(uglifyes, console);

const sourcemaps = require('gulp-sourcemaps');
//const buffer = require('vinyl-buffer');
const uglifycss = require('gulp-uglifycss');
const clean = require('gulp-clean');
const browserSync = require('browser-sync');
const minimist = require('minimist');

const config = minimist(process.argv.slice(2), {
	boolean: [ 'production' ],
	default: {
		production: process.env.production
	}
});

const tsProject = ts.createProject(
	'./src/tsconfig.json', {
		removeComments: config.production,
		//experimentalAsyncFunctions: !config.production,
		target: config.production ? "es2015" : "es2017"
	}
);

/*
compile typescript
use ES5 and commonJS module
*/
gulp.task('typescript', () =>
	tsProject.src()
		.pipe(sourcemaps.init())
		.pipe(tsProject()).js
		//.pipe(gulp.dest("dist/js"))
		//.pipe(buffer())
		.pipe(config.production ? uglify() : noop())
		//.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest("dist"))
		.pipe(browserSync.reload({ stream: true, once: true }))
);

gulp.task('javascript', () =>

	gulp.src('src/**/*.js')
		.pipe(sourcemaps.init())
		.pipe(config.production ? uglify() : noop())
		//.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('dist'))
		.pipe(browserSync.reload({ stream: true, once: true }))
);

gulp.task('node_modules', () => {

	//gulp.src('node_modules/monaco-editor/min/vs/**/*').pipe(gulp.dest('dist/vs'));
	gulp.src('node_modules/monaco-editor/dev/vs/**/*').pipe(gulp.dest('dist/vs'));
	gulp.src('node_modules/document-ready-promise/**/*.js').pipe(gulp.dest('dist/document-ready-promise'));

});

/*
copy all html files and assets
*/
gulp.task('html', () =>
	gulp.src('src/**/*.html')
		.pipe(gulp.dest('dist'))
		.pipe(browserSync.reload({ stream: true, once: true }))
);

gulp.task('assets', () =>
	gulp.src('assets/**/*.*')
		.pipe(gulp.dest('dist/assets'))
		.pipe(browserSync.reload({ stream: true, once: true }))
);
/*
compile less files
*/
gulp.task('less', () =>
	gulp.src('src/styles/style.less')
		.pipe(less())
		.pipe(sourcemaps.init())
		.pipe(config.production ? uglifycss({
			"maxLineLen": 80,
			"uglyComments": true
		}) : noop())
		//.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('dist/styles'))
		.pipe(browserSync.reload({ stream: true, once: true }))
);

/*
Watch typescript and less
*/
gulp.task('watch', ['browser-sync'], function () {
	gulp.watch('src/styles/*.less', ['less']);
	gulp.watch(['src/**/*.ts', 'src/**/*.tsx'], ['typescript']);
	gulp.watch('src/**/*.js', ['javascript']);
	gulp.watch('src/**/*.html', ['html']);
	gulp.watch('assets/**/*.*', ['assets']);
});

gulp.task('clean', () =>
	gulp.src('./dist', { read: false })
		.pipe(clean())
);

gulp.on('err', (e) =>
	console.log(e.err.stack)
);


gulp.task('browser-sync', () =>
	browserSync.init(null, {
		server: {
			baseDir: "dist"
		}
	})
);

/*
default task
*/

gulp.task('default', ['less', 'typescript', 'javascript', 'node_modules', 'html', 'assets']);

gulp.task('serve', ['default', 'watch']);
