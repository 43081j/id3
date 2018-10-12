import gulp from 'gulp';
import uglify from 'gulp-uglify';
import rename from 'gulp-rename';
import del from 'del';
import concat from 'gulp-concat';

export const clean = () => del(['dist/*']);

export function buildFor(type) {
  let readerFilePath = 'lib/reader.js';
  if (type === 'browser') {
    readerFilePath = 'lib/reader.browser.js';
  }
  return gulp.src([
    readerFilePath,
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
const buildForNode = gulp.series(clean, buildFor);
const buildForBrowser = gulp.series(clean, ()=> buildFor('browser'));
gulp.task('build', buildForNode);
gulp.task('build:browser', buildForBrowser);

export default buildForNode;
