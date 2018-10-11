import gulp from 'gulp';
// import wrap from 'gulp-wrap-umd';
import uglify from 'gulp-uglify';
import rename from 'gulp-rename';
import del from 'del';
import concat from 'gulp-concat';

export const clean = () => del(['dist/*']);

export function umd() {
  return gulp.src([
    'lib/reader.js',
    'lib/dataview-extra.js',
    'lib/genres.js',
    'lib/frame.js',
    'lib/tag.js',
    'lib/id3.js'
  ])
    .pipe(concat('id3.js'))
    .pipe(gulp.dest('dist/'))
		.pipe(uglify())
		.pipe(rename({
			suffix: '.min'
		}))
		.pipe(gulp.dest('dist'));
}

gulp.task('clean', clean);
const build = gulp.series(clean, umd);
gulp.task('build', build);

export default build;
