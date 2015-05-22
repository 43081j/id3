var gulp = require('gulp'),
	jshint = require('gulp-jshint'),
	uglify = require('gulp-uglify'),
	browserify = require('browserify'),
	source = require('vinyl-source-stream'),
	buffer = require('vinyl-buffer');

gulp.task('lint', function() {
	gulp.src('lib/**/*.js')
		.pipe(jshint())
		.pipe(jshint.reporter('default'))
		.pipe(jshint.reporter('fail'));
});

gulp.task('build', function() {
	var browser = browserify({
		entries: 'lib/main.js'
	});

	return browser.bundle()
		.pipe(source('id3.min.js'))
		.pipe(buffer())
		.pipe(uglify())
		.pipe(gulp.dest('dist/'));
});

gulp.task('default', ['lint', 'build'], function() {
});
