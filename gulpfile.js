var gulp = require('gulp');
var util = require('gulp-util');
var ts = require('gulp-typescript');
var watch = require('gulp-watch');
//var browserify = require('browserify');
//var source = require('vinyl-source-stream');
var less = require('gulp-less');
var tsProject = ts.createProject('./src/tsconfig.json');
var connect = require('gulp-connect');
//var uglify = require('gulp-uglify');
var uglifyes = require('uglify-es');
var composer = require('gulp-uglify/composer');
var uglify = composer(uglifyes, console);

var sourcemaps = require('gulp-sourcemaps');
var buffer = require('vinyl-buffer');
var uglifycss = require('gulp-uglifycss');
var clean = require('gulp-clean');

var config = {
	production: util.env.production,
};

/*
compile typescript
use ES5 and commonJS module
*/
gulp.task('typescript', function () {

	return tsProject.src()
		.pipe(sourcemaps.init())
		.pipe(tsProject()).js
		.pipe(gulp.dest("dist/js"))
		.pipe(buffer())
		.pipe(config.production ? uglify() : util.noop())
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest("dist"));;

});

gulp.task('javascript', function () {

	gulp.src('src/**/*.js')
		//.pipe(uglify())
	    //.on('error', function (err) { console.log(err.toString()); })
		.pipe(gulp.dest('dist'));

});
/*
Web server to test app
*/
gulp.task('webserver', function () {
	connect.server({
		livereload: true,
		root: ['.', 'dist']
	});
});
/*
Automatic Live Reload
*/
gulp.task('livereload', function () {
	gulp.src(['dist/styles/*.css', 'dist/js/*.js'])
		.pipe(watch(['dist/styles/*.css', 'dist/js/*.js']))
		.pipe(connect.reload());
});
/*
copy all html files and assets
*/
gulp.task('copy', function () {
	gulp.src('src/**/*.html')
		.pipe(gulp.dest('dist'));
	gulp.src('assets/**/*.*')
		.pipe(gulp.dest('dist/assets'));
});
/*
compile less files
*/
gulp.task('less', function () {
	gulp.src('src/styles/style.less')
		.pipe(less())
		.pipe(sourcemaps.init())
		.pipe(config.production ? uglifycss({
			"maxLineLen": 80,
			"uglyComments": true
		}) : util.noop())
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('dist/styles'));
});
/*
browserify
now is only for Javascript files
*/
gulp.task('browserify', function () {
	browserify('./dist/js/index.js')
		.bundle()
		.pipe(source('index.js'))
		.pipe(gulp.dest('dist'));
});

/*
Watch typescript and less
*/
gulp.task('watch', function () {
	gulp.watch('src/styles/*.less', ['less']);
	gulp.watch('src/**/*.ts', ['typescript'/*, 'browserify'*/]);
	gulp.watch('src/**/*.html', ['copy']);
});

gulp.task('clean', () =>
	gulp.src('./dist', { read: false })
		.pipe(clean())
);

/*
default task
*/

gulp.task('build',
	['less', 'typescript', 'javascript', 'copy']);

gulp.task('default',
	['build', 'webserver', 'livereload', 'watch']);
